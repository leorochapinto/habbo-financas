import Link from "next/link";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { GraficoPeriodo } from "@/components/GraficoPeriodo";
import { Resumo } from "@/components/Resumo";
import { TabelaLancamentos } from "@/components/TabelaLancamentos";
import { formatarReais } from "@/lib/dinheiro";
import { listarLancamentos, porPeriodo, topJogadores, totais } from "@/lib/lancamentos";
import { periodoDaUrl } from "@/lib/periodo";

export default async function Painel({ searchParams }: PageProps<"/">) {
  const { de, ate } = periodoDaUrl(await searchParams);
  const filtro = { de, ate };
  const t = totais(filtro);
  const dias = porPeriodo(filtro, "dia");
  const jogadores = topJogadores(filtro, 5);
  const ultimos = listarLancamentos(filtro, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Painel</h1>
        <FiltroPeriodo de={de} ate={ate} />
      </div>

      <Resumo t={t} />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="cartao lg:col-span-2">
          <h2 className="mb-4 font-medium">Movimento por dia</h2>
          <GraficoPeriodo linhas={dias} />
        </section>
        <section className="cartao">
          <h2 className="mb-4 font-medium">Quem mais comprou</h2>
          {jogadores.length ? (
            <ol className="space-y-2 text-sm">
              {jogadores.map((j, i) => (
                <li key={j.jogador} className="flex justify-between gap-2">
                  <span>
                    <span className="mr-2 text-suave">{i + 1}.</span>
                    {j.jogador}
                    <span className="ml-1 text-xs text-suave">({j.quantidade})</span>
                  </span>
                  <span className="valor text-receita">{formatarReais(j.total)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-suave">Nenhuma entrada com jogador informado.</p>
          )}
        </section>
      </div>

      <section className="cartao">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Últimos lançamentos</h2>
          <Link href={`/lancamentos?de=${de}&ate=${ate}`} className="text-sm text-destaque">
            ver todos
          </Link>
        </div>
        <TabelaLancamentos linhas={ultimos} />
      </section>
    </div>
  );
}
