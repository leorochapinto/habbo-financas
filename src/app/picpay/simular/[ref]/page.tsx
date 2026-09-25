import { notFound } from "next/navigation";
import { simularStatus } from "@/app/actions";
import { formatarReais } from "@/lib/dinheiro";
import { buscarCobranca, modoSimulado } from "@/lib/picpay";

// Página que faz o papel do checkout do PicPay enquanto não há credenciais.
export default async function Simular({ params }: PageProps<"/picpay/simular/[ref]">) {
  const { ref } = await params;
  const c = buscarCobranca(ref);
  if (!c || !modoSimulado()) notFound();

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Checkout simulado</h1>
      <div className="cartao space-y-1">
        <div className="text-sm text-suave">{c.produto}</div>
        <div className="valor text-3xl font-semibold">{formatarReais(c.valor_centavos)}</div>
        {c.jogador && <div className="text-sm">Jogador: {c.jogador}</div>}
      </div>
      <p className="text-sm text-suave">Escolha o que o PicPay responderia:</p>
      <form action={simularStatus} className="grid gap-2">
        <input type="hidden" name="reference_id" value={c.reference_id} />
        <button name="status" value="paid" className="botao">Pagamento aprovado</button>
        <button name="status" value="expired" className="botao-secundario">Deixar expirar</button>
      </form>
    </div>
  );
}
