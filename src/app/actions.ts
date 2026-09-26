"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { paraCentavos } from "@/lib/dinheiro";
import { criarCategoria, criarLancamento, excluirLancamento, type Natureza, type Tipo } from "@/lib/lancamentos";
import { cancelarCobranca, criarCobranca, modoSimulado, sincronizarStatus, type StatusPicPay } from "@/lib/picpay";
import { gravarLinhas, lerCsv, type LinhaConfirmada, type Previa } from "@/lib/extrato";

// Toda rota (inclusive a chamada destas actions) passa pela senha do proxy.ts.

export type Estado = { erro?: string; ok?: string } | null;

function campo(fd: FormData, nome: string): string {
  return String(fd.get(nome) ?? "").trim();
}

function atualizarTudo() {
  revalidatePath("/", "layout");
}

export async function salvarLancamento(_: Estado, fd: FormData): Promise<Estado> {
  const natureza = campo(fd, "natureza") as Natureza;
  if (!["receita", "despesa", "perda"].includes(natureza)) return { erro: "Escolha o tipo do lançamento." };
  const tipo: Tipo = natureza === "receita" ? "entrada" : "saida";

  const valor = paraCentavos(campo(fd, "valor"));
  if (!valor || valor <= 0) return { erro: "Informe um valor maior que zero." };

  const data = campo(fd, "data");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Data inválida." };

  const raro = campo(fd, "raro") || null;
  const descricao = campo(fd, "descricao");
  if (!descricao && !raro) return { erro: "Informe o raro ou descreva o lançamento." };

  const categoria = Number(campo(fd, "categoria_id")) || null;
  criarLancamento({
    tipo,
    natureza,
    valor_centavos: valor,
    data,
    descricao,
    categoria_id: categoria,
    jogador: campo(fd, "jogador") || null,
    raro,
  });
  atualizarTudo();
  redirect(`/lancamentos?ok=${natureza}`);
}

export async function apagarLancamento(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  if (id) excluirLancamento(id);
  atualizarTudo();
}

export async function novaCategoria(fd: FormData): Promise<void> {
  const nome = campo(fd, "nome");
  const tipo = campo(fd, "tipo") as Tipo;
  if (nome && (tipo === "entrada" || tipo === "saida")) criarCategoria(nome, tipo);
  atualizarTudo();
}

export async function gerarCobranca(_: Estado, fd: FormData): Promise<Estado> {
  const valor = paraCentavos(campo(fd, "valor"));
  if (!valor || valor <= 0) return { erro: "Informe um valor maior que zero." };
  const produto = campo(fd, "produto");
  if (!produto) return { erro: "Diga o que está sendo vendido (ex.: VIP 30 dias)." };

  const nome = campo(fd, "comprador_nome");
  const [firstName, ...resto] = nome.split(/\s+/);
  const comprador =
    nome || campo(fd, "comprador_cpf")
      ? {
          firstName: firstName ?? "",
          lastName: resto.join(" "),
          document: campo(fd, "comprador_cpf"),
          email: campo(fd, "comprador_email"),
          phone: campo(fd, "comprador_telefone"),
        }
      : undefined;

  try {
    const c = await criarCobranca({
      valor_centavos: valor,
      produto,
      jogador: campo(fd, "jogador") || null,
      categoria_id: Number(campo(fd, "categoria_id")) || null,
      comprador,
    });
    atualizarTudo();
    return { ok: c.payment_url ?? c.reference_id };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha ao criar a cobrança." };
  }
}

export async function consultarCobranca(fd: FormData): Promise<void> {
  await sincronizarStatus(String(fd.get("reference_id")));
  atualizarTudo();
}

export async function cancelar(fd: FormData): Promise<void> {
  await cancelarCobranca(String(fd.get("reference_id")));
  atualizarTudo();
}

/** Só no modo simulado: finge o retorno do PicPay com o status escolhido. */
export async function simularStatus(fd: FormData): Promise<void> {
  if (!modoSimulado()) throw new Error("Simulação desligada: há um PICPAY_TOKEN configurado.");
  await sincronizarStatus(String(fd.get("reference_id")), String(fd.get("status")) as StatusPicPay);
  atualizarTudo();
  redirect("/picpay");
}

export type EstadoPrevia = { erro?: string; previa?: Previa; nomeArquivo?: string; lidoEm?: number } | null;

/** Etapa 1: lê o CSV (arquivo ou texto colado) e devolve a prévia. Não grava nada. */
export async function lerExtrato(_: EstadoPrevia, fd: FormData): Promise<EstadoPrevia> {
  const arquivo = fd.get("arquivo");
  let conteudo = campo(fd, "texto");
  let nomeArquivo = "texto colado";
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > 5 * 1024 * 1024) return { erro: "Arquivo maior que 5 MB." };
    conteudo = await arquivo.text();
    nomeArquivo = arquivo.name;
  }
  if (!conteudo) return { erro: "Escolha um arquivo CSV ou cole o conteúdo." };
  const previa = lerCsv(conteudo);
  if (!previa.linhas.length) return { erro: previa.erros.join(" · ") || "Nenhuma linha válida no arquivo." };
  return { previa, nomeArquivo, lidoEm: Date.now() };
}

/** Etapa 2: grava as linhas que a pessoa marcou na prévia. */
export async function confirmarImportacao(_: Estado, fd: FormData): Promise<Estado> {
  let linhas: LinhaConfirmada[];
  try {
    linhas = JSON.parse(campo(fd, "linhas"));
  } catch {
    return { erro: "Não consegui ler as linhas escolhidas. Recarregue a prévia." };
  }
  if (!Array.isArray(linhas) || !linhas.length) return { erro: "Marque ao menos uma linha para importar." };
  const validas = linhas.every(
    (l) =>
      /^\d{4}-\d{2}-\d{2}$/.test(l.data) &&
      Number.isInteger(l.centavos) &&
      l.centavos !== 0 &&
      ["receita", "despesa", "perda"].includes(l.natureza) &&
      (l.natureza === "receita") === l.centavos > 0 &&
      typeof l.referencia === "string" &&
      l.referencia.startsWith("extrato:") &&
      (l.categoria_id === null || Number.isInteger(l.categoria_id)),
  );
  if (!validas) return { erro: "Alguma linha chegou inválida. Recarregue a prévia." };
  const r = gravarLinhas(
    linhas.map((l) => ({ ...l, descricao: String(l.descricao).slice(0, 300), jogador: l.jogador ? String(l.jogador).slice(0, 80) : null })),
  );
  atualizarTudo();
  return { ok: `${r.importadas} lançamentos importados${r.duplicadas ? `, ${r.duplicadas} já existiam` : ""}.` };
}
