import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { criarLancamento, idDaCategoria } from "./lancamentos";
import { hojeISO } from "./dinheiro";

/*
 * Integração com a API de E-commerce do PicPay (conta PicPay Empresas / lojista).
 *
 * Fluxo:
 *   1. criarCobranca() -> POST /payments, recebe um link de pagamento e QR code.
 *   2. O jogador paga. O PicPay chama nosso callbackUrl (POST /api/picpay/callback)
 *      com { referenceId, authorizationId } e o header x-seller-token.
 *   3. Não confiamos no corpo do callback: consultamos GET /payments/{ref}/status
 *      e só lançamos a entrada se o status vier "paid" ou "completed".
 *
 * Sem PICPAY_TOKEN configurado o módulo roda em modo SIMULADO: gera cobranças
 * falsas e permite marcar como paga pela interface, para testar o sistema todo.
 */

const BASE = process.env.PICPAY_API_URL ?? "https://appws.picpay.com/ecommerce/public";

export type StatusPicPay =
  | "created"
  | "expired"
  | "analysis"
  | "paid"
  | "completed"
  | "refunded"
  | "chargeback";

export const ROTULO_STATUS: Record<string, string> = {
  created: "Aguardando pagamento",
  expired: "Expirada",
  analysis: "Em análise",
  paid: "Paga",
  completed: "Paga (liberada)",
  refunded: "Estornada",
  chargeback: "Chargeback",
};

export interface Cobranca {
  reference_id: string;
  valor_centavos: number;
  jogador: string | null;
  produto: string;
  categoria_id: number | null;
  status: StatusPicPay;
  payment_url: string | null;
  authorization_id: string | null;
  criado_em: string;
  atualizado_em: string;
}

export function modoSimulado(): boolean {
  return !process.env.PICPAY_TOKEN || process.env.PICPAY_MODO === "simulado";
}

async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-picpay-token": process.env.PICPAY_TOKEN ?? "",
      ...init.headers,
    },
    cache: "no-store",
  });
  const corpo = await resposta.text();
  if (!resposta.ok) {
    throw new Error(`PicPay respondeu ${resposta.status}: ${corpo.slice(0, 300)}`);
  }
  return JSON.parse(corpo) as T;
}

export interface DadosCobranca {
  valor_centavos: number;
  produto: string;
  jogador: string | null;
  categoria_id: number | null;
  comprador?: {
    firstName: string;
    lastName: string;
    document: string;
    email: string;
    phone: string;
  };
}

export async function criarCobranca(d: DadosCobranca): Promise<Cobranca> {
  const referenceId = `habbo-${Date.now()}-${randomUUID().slice(0, 8)}`;
  let paymentUrl: string;

  if (modoSimulado()) {
    paymentUrl = `/picpay/simular/${referenceId}`;
  } else {
    const appUrl = process.env.APP_URL;
    if (!appUrl) throw new Error("Configure APP_URL (endereço público do sistema) para o PicPay chamar o retorno.");
    const expiraEm = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const r = await chamar<{ paymentUrl: string }>("/payments", {
      method: "POST",
      body: JSON.stringify({
        referenceId,
        callbackUrl: `${appUrl}/api/picpay/callback`,
        returnUrl: process.env.PICPAY_RETURN_URL ?? appUrl,
        value: d.valor_centavos / 100,
        expiresAt: expiraEm,
        buyer: d.comprador,
      }),
    });
    paymentUrl = r.paymentUrl;
  }

  db()
    .prepare(
      `INSERT INTO cobrancas_picpay (reference_id, valor_centavos, jogador, produto, categoria_id, payment_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(referenceId, d.valor_centavos, d.jogador, d.produto, d.categoria_id, paymentUrl);

  return buscarCobranca(referenceId)!;
}

export function buscarCobranca(referenceId: string): Cobranca | null {
  return (
    (db().prepare("SELECT * FROM cobrancas_picpay WHERE reference_id = ?").get(referenceId) as
      | Cobranca
      | undefined) ?? null
  );
}

export function listarCobrancas(limite = 100): Cobranca[] {
  return db()
    .prepare(`SELECT * FROM cobrancas_picpay ORDER BY criado_em DESC LIMIT ${Number(limite)}`)
    .all() as unknown as Cobranca[];
}

/** Consulta o status no PicPay (ou usa o informado, no modo simulado) e aplica no sistema. */
export async function sincronizarStatus(referenceId: string, statusSimulado?: StatusPicPay): Promise<Cobranca> {
  const cobranca = buscarCobranca(referenceId);
  if (!cobranca) throw new Error(`Cobrança ${referenceId} não encontrada`);

  let status: StatusPicPay;
  let authorizationId: string | null = cobranca.authorization_id;
  if (modoSimulado()) {
    status = statusSimulado ?? cobranca.status;
    authorizationId ??= status === "paid" ? `sim-${randomUUID().slice(0, 8)}` : null;
  } else {
    const r = await chamar<{ status: StatusPicPay; authorizationId?: string }>(
      `/payments/${encodeURIComponent(referenceId)}/status`,
    );
    status = r.status;
    authorizationId = r.authorizationId ?? authorizationId;
  }

  db()
    .prepare(
      `UPDATE cobrancas_picpay SET status = ?, authorization_id = ?, atualizado_em = datetime('now')
        WHERE reference_id = ?`,
    )
    .run(status, authorizationId, referenceId);

  aplicarStatus({ ...cobranca, status, authorization_id: authorizationId });
  return buscarCobranca(referenceId)!;
}

/**
 * Transforma o status em lançamento. Idempotente: a referência externa única
 * impede que o mesmo pagamento (ou estorno) entre duas vezes.
 */
function aplicarStatus(c: Cobranca): void {
  const descricao = c.produto || "Cobrança PicPay";
  if (c.status === "paid" || c.status === "completed") {
    criarLancamento({
      tipo: "entrada",
      natureza: "receita",
      valor_centavos: c.valor_centavos,
      data: hojeISO(),
      descricao,
      categoria_id: c.categoria_id,
      jogador: c.jogador,
      origem: "picpay_cobranca",
      referencia_externa: `picpay:${c.reference_id}`,
    });
  }
  if (c.status === "refunded" || c.status === "chargeback") {
    criarLancamento({
      tipo: "saida",
      natureza: "perda",
      valor_centavos: c.valor_centavos,
      data: hojeISO(),
      descricao: `${c.status === "chargeback" ? "Chargeback" : "Estorno"}: ${descricao}`,
      categoria_id: idDaCategoria("Estorno PicPay", "saida"),
      jogador: c.jogador,
      origem: "picpay_cobranca",
      referencia_externa: `picpay-estorno:${c.reference_id}`,
    });
  }
}

export async function cancelarCobranca(referenceId: string): Promise<void> {
  const c = buscarCobranca(referenceId);
  if (!c) return;
  if (!modoSimulado()) {
    await chamar(`/payments/${encodeURIComponent(referenceId)}/cancellations`, {
      method: "POST",
      body: JSON.stringify(c.authorization_id ? { authorizationId: c.authorization_id } : {}),
    });
  }
  // O PicPay trata cancelamento de cobrança já paga como estorno.
  await sincronizarStatus(referenceId, c.authorization_id ? "refunded" : "expired");
}

export function sellerTokenValido(recebido: string | null): boolean {
  const esperado = process.env.PICPAY_SELLER_TOKEN;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(esperado);
  const b = Buffer.from(recebido);
  return a.length === b.length && timingSafeEqual(a, b);
}
