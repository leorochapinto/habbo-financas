import Link from "next/link";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { Resumo } from "@/components/Resumo";
import { TabelaLancamentos } from "@/components/TabelaLancamentos";
import { listarCategorias, listarLancamentos, totais, type Natureza } from "@/lib/lancamentos";
import { periodoDaUrl, texto } from "@/lib/periodo";

const AVISO: Record<string, string> = {
  receita: "Entrada registrada.",
  despesa: "Saída registrada.",
  perda: "Perda registrada.",
};

export default async function Lancamentos({ searchParams }: PageProps<"/lancamentos">) {
  const sp = await searchParams;
  const { de, ate } = periodoDaUrl(sp);
  const naturezaTxt = texto(sp, "natureza");
  const natureza = ["receita", "despesa", "perda"].includes(naturezaTxt) ? (naturezaTxt as Natureza) : undefined;
  const categoria_id = Number(texto(sp, "categoria")) || undefined;
  const busca = texto(sp, "busca") || undefined;
  const filtro = { de, ate, natureza, categoria_id, busca };
  const ok = AVISO[texto(sp, "ok")];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Lançamentos</h1>
        <div className="flex gap-2">
          <Link href="/lancamentos/novo?natureza=receita" className="botao-secundario">+ Entrada</Link>
          <Link href="/lancamentos/novo?natureza=despesa" className="botao-secundario">+ Saída</Link>
          <Link href="/lancamentos/novo?natureza=perda" className="botao-secundario text-perda">+ Perda</Link>
        </div>
      </div>

      {ok && <p className="rounded-lg bg-receita/10 px-4 py-2 text-sm text-receita">{ok}</p>}

      <FiltroPeriodo de={de} ate={ate}>
        <label>
          <span className="rotulo">Tipo</span>
          <select name="natureza" defaultValue={natureza ?? ""} className="campo">
            <option value="">Todos</option>
            <option value="receita">Entradas</option>
            <option value="despesa">Saídas</option>
            <option value="perda">Perdas</option>
          </select>
        </label>
        <label>
          <span className="rotulo">Categoria</span>
          <select name="categoria" defaultValue={categoria_id ?? ""} className="campo">
            <option value="">Todas</option>
            {listarCategorias().map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.tipo})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="rotulo">Buscar</span>
          <input name="busca" defaultValue={busca} placeholder="descrição ou jogador" className="campo" />
        </label>
      </FiltroPeriodo>

      <Resumo t={totais(filtro)} />

      <section className="cartao">
        <TabelaLancamentos linhas={listarLancamentos(filtro)} excluir />
      </section>
    </div>
  );
}
