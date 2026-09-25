import { formatarReais } from "@/lib/dinheiro";
import type { Totais } from "@/lib/lancamentos";

export function Resumo({ t }: { t: Totais }) {
  const itens = [
    { rotulo: "Entradas", valor: t.receitas, cor: "text-receita" },
    { rotulo: "Saídas", valor: t.despesas, cor: "text-despesa" },
    { rotulo: "Perdas", valor: t.perdas, cor: "text-perda" },
    { rotulo: "Saldo", valor: t.saldo, cor: t.saldo < 0 ? "text-perda" : "text-texto" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {itens.map((i) => (
        <div key={i.rotulo} className="cartao">
          <div className="text-sm text-suave">{i.rotulo}</div>
          <div className={`valor mt-1 text-2xl font-semibold ${i.cor}`}>{formatarReais(i.valor)}</div>
        </div>
      ))}
    </div>
  );
}
