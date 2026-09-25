import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { GraficoPeriodo } from "@/components/GraficoPeriodo";
import { Resumo } from "@/components/Resumo";
import { formatarReais } from "@/lib/dinheiro";
import { porCategoria, porPeriodo, topJogadores, totais, type LinhaPorCategoria } from "@/lib/lancamentos";
import { periodoDaUrl } from "@/lib/periodo";

function Bloco({ titulo, linhas, total, cor }: { titulo: string; linhas: LinhaPorCategoria[]; total: number; cor: string }) {
  return (
    <section className="cartao">
      <h2 className="mb-3 font-medium">{titulo}</h2>
      {linhas.length ? (
        <ul className="space-y-3 text-sm">
          {linhas.map((l) => (
            <li key={l.categoria}>
              <div className="flex justify-between gap-2">
                <span>
                  {l.categoria} <span className="text-xs text-suave">({l.quantidade})</span>
                </span>
                <span className="valor">{formatarReais(l.total)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded bg-fundo">
                <div className={`h-full rounded ${cor}`} style={{ width: `${(l.total / (total || 1)) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-suave">Nada no período.</p>
      )}
    </section>
  );
}

export default async function Relatorios({ searchParams }: PageProps<"/relatorios">) {
  const { de, ate } = periodoDaUrl(await searchParams);
  const filtro = { de, ate };
  const t = totais(filtro);
  const categorias = porCategoria(filtro);
  const meses = porPeriodo(filtro, "mes");
  const jogadores = topJogadores(filtro, 20);
  const margem = t.receitas ? Math.round((t.saldo / t.receitas) * 1000) / 10 : 0;
  const taxaPerda = t.receitas ? Math.round((t.perdas / t.receitas) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <div className="flex flex-wrap items-end gap-3">
          <FiltroPeriodo de={de} ate={ate} />
          <a href={`/api/relatorio?de=${de}&ate=${ate}`} className="botao-secundario">
            Baixar planilha (CSV)
          </a>
        </div>
      </div>

      <Resumo t={t} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="cartao">
          <div className="text-sm text-suave">Margem (saldo ÷ entradas)</div>
          <div className="valor mt-1 text-xl font-semibold">{margem.toLocaleString("pt-BR")}%</div>
        </div>
        <div className="cartao">
          <div className="text-sm text-suave">Perdas sobre entradas</div>
          <div className="valor mt-1 text-xl font-semibold text-perda">{taxaPerda.toLocaleString("pt-BR")}%</div>
        </div>
      </div>

      <section className="cartao">
        <h2 className="mb-4 font-medium">Mês a mês</h2>
        <GraficoPeriodo linhas={meses} />
        {meses.length > 0 && (
          <table className="tabela mt-6">
            <thead>
              <tr>
                <th>Mês</th>
                <th className="text-right">Entradas</th>
                <th className="text-right">Saídas</th>
                <th className="text-right">Perdas</th>
                <th className="text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m) => {
                const saldo = m.receitas - m.despesas - m.perdas;
                return (
                  <tr key={m.periodo}>
                    <td>{`${m.periodo.slice(5)}/${m.periodo.slice(0, 4)}`}</td>
                    <td className="valor text-right text-receita">{formatarReais(m.receitas)}</td>
                    <td className="valor text-right text-despesa">{formatarReais(m.despesas)}</td>
                    <td className="valor text-right text-perda">{formatarReais(m.perdas)}</td>
                    <td className={`valor text-right font-medium ${saldo < 0 ? "text-perda" : ""}`}>
                      {formatarReais(saldo)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Bloco titulo="Entradas por categoria" linhas={categorias.filter((c) => c.natureza === "receita")} total={t.receitas} cor="bg-receita" />
        <Bloco titulo="Saídas por categoria" linhas={categorias.filter((c) => c.natureza === "despesa")} total={t.despesas} cor="bg-despesa" />
        <Bloco titulo="Perdas por categoria" linhas={categorias.filter((c) => c.natureza === "perda")} total={t.perdas} cor="bg-perda" />
      </div>

      <section className="cartao">
        <h2 className="mb-3 font-medium">Entradas por jogador</h2>
        {jogadores.length ? (
          <table className="tabela">
            <thead>
              <tr>
                <th>Jogador</th>
                <th className="text-right">Compras</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {jogadores.map((j) => (
                <tr key={j.jogador}>
                  <td>{j.jogador}</td>
                  <td className="valor text-right">{j.quantidade}</td>
                  <td className="valor text-right text-receita">{formatarReais(j.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-suave">Nenhuma entrada com jogador informado.</p>
        )}
      </section>
    </div>
  );
}
