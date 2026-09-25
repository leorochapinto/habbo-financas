import { formatarData, formatarReais } from "@/lib/dinheiro";
import type { LinhaPorPeriodo } from "@/lib/lancamentos";

// Barras agrupadas: entrada para cima; saída e perda empilhadas lado a lado.
export function GraficoPeriodo({ linhas }: { linhas: LinhaPorPeriodo[] }) {
  if (!linhas.length) {
    return <p className="text-sm text-suave">Nenhum lançamento no período.</p>;
  }
  const maximo = Math.max(1, ...linhas.flatMap((l) => [l.receitas, l.despesas + l.perdas]));
  const rotulo = (p: string) => (p.length === 7 ? `${p.slice(5)}/${p.slice(0, 4)}` : formatarData(p).slice(0, 5));

  return (
    <div>
      <div className="flex h-48 items-end gap-1 overflow-x-auto pb-1">
        {linhas.map((l) => (
          <div key={l.periodo} className="flex min-w-7 flex-1 flex-col items-center gap-1">
            <div className="flex h-40 w-full items-end justify-center gap-0.5">
              <div
                className="w-1/2 max-w-4 rounded-t bg-receita"
                style={{ height: `${(l.receitas / maximo) * 100}%` }}
                title={`Entradas ${formatarReais(l.receitas)}`}
              />
              <div className="flex h-full w-1/2 max-w-4 flex-col justify-end">
                <div
                  className="rounded-t bg-perda"
                  style={{ height: `${(l.perdas / maximo) * 100}%` }}
                  title={`Perdas ${formatarReais(l.perdas)}`}
                />
                <div
                  className="bg-despesa"
                  style={{ height: `${(l.despesas / maximo) * 100}%` }}
                  title={`Saídas ${formatarReais(l.despesas)}`}
                />
              </div>
            </div>
            <span className="text-[10px] text-suave">{rotulo(l.periodo)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-suave">
        <span><span className="mr-1 inline-block size-2 rounded-sm bg-receita" />Entradas</span>
        <span><span className="mr-1 inline-block size-2 rounded-sm bg-despesa" />Saídas</span>
        <span><span className="mr-1 inline-block size-2 rounded-sm bg-perda" />Perdas</span>
      </div>
    </div>
  );
}
