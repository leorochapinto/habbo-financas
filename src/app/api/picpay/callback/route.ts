import { buscarCobranca, sellerTokenValido, sincronizarStatus } from "@/lib/picpay";

// Retorno do PicPay. Fica fora da senha do proxy (o PicPay não tem login);
// quem autentica é o x-seller-token que o PicPay envia em toda notificação.
export async function POST(request: Request) {
  if (!sellerTokenValido(request.headers.get("x-seller-token"))) {
    return Response.json({ erro: "seller token inválido" }, { status: 401 });
  }

  const corpo = (await request.json().catch(() => null)) as { referenceId?: string } | null;
  const referenceId = corpo?.referenceId;
  if (!referenceId || !buscarCobranca(referenceId)) {
    return Response.json({ erro: "referenceId desconhecido" }, { status: 404 });
  }

  // O status oficial vem da consulta à API, não do corpo da notificação.
  const cobranca = await sincronizarStatus(referenceId);
  return Response.json({ ok: true, status: cobranca.status });
}
