"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { confirmarImportacao, lerExtrato } from "@/app/actions";
import type { Previa } from "@/lib/extrato";
import type { Categoria, Natureza } from "@/lib/lancamentos";

type Categorias = { entrada: Categoria[]; saida: Categoria[] };

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brl = (centavos: number) => reais.format(centavos / 100);
const dataBR = (iso: string) => iso.split("-").reverse().join("/");

export function ImportarCsv({ categorias }: { categorias: Categorias }) {
  const [estado, enviar, lendo] = useActionState(lerExtrato, null);

  return (
    <div className="space-y-6">
      <form action={enviar} className="cartao space-y-4">
        <label className="block">
          <span className="rotulo">Arquivo CSV</span>
          <input type="file" name="arquivo" accept=".csv,text/csv,text/plain" className="campo" />
        </label>
        <details className="text-sm">
          <summary className="cursor-pointer text-suave">Ou cole o conteúdo do CSV</summary>
          <textarea
            name="texto"
            rows={6}
            className="campo mt-2 font-mono text-xs"
            placeholder={"Data;Descrição;Jogador;Valor\n25/09/2026;VIP 30 dias;Nick1;19,90"}
          />
        </details>
        {estado?.erro && <p className="text-sm text-perda">{estado.erro}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button className="botao" disabled={lendo}>
            {lendo ? "Lendo…" : "Ver prévia"}
          </button>
          <a href="/modelo-extrato.csv" download className="text-sm text-destaque underline">
            Baixar planilha modelo
          </a>
        </div>
        <p className="text-xs text-suave">
          Colunas reconhecidas pelo nome: Data e Valor (obrigatórias; ou Entrada e Saída separadas), Descrição e
          Jogador/Nome/Pagador (opcionais). Valor negativo é saída. Separador ; , ou tab.
        </p>
      </form>

      {estado?.previa && (
        <PreviaExtrato key={estado.lidoEm} previa={estado.previa} nome={estado.nomeArquivo ?? ""} categorias={categorias} />
      )}
    </div>
  );
}

interface Escolha {
  incluir: boolean;
  natureza: Natureza;
  categoria_id: number | null;
}

function PreviaExtrato({ previa, nome, categorias }: { previa: Previa; nome: string; categorias: Categorias }) {
  const [resultado, confirmar, gravando] = useActionState(confirmarImportacao, null);
  const idPorNome = (lista: Categoria[], inicio: string) => lista.find((c) => c.nome.startsWith(inicio))?.id ?? null;

  // Entradas já vêm marcadas. Saídas não: numa conta pessoal elas costumam ser gastos que não são do hotel.
  const [escolhas, setEscolhas] = useState<Escolha[]>(() =>
    previa.linhas.map((l) =>
      l.centavos > 0
        ? { incluir: !l.jaImportada, natureza: "receita", categoria_id: idPorNome(categorias.entrada, "Outras entradas") }
        : { incluir: false, natureza: "despesa", categoria_id: idPorNome(categorias.saida, "Outras saídas") },
    ),
  );

  const alterar = (i: number, mudanca: Partial<Escolha>) =>
    setEscolhas((atual) => atual.map((e, j) => (j === i ? { ...e, ...mudanca } : e)));

  const emLote = (entrada: boolean, mudanca: Partial<Escolha>) =>
    setEscolhas((atual) =>
      atual.map((e, j) =>
        previa.linhas[j].jaImportada || previa.linhas[j].centavos > 0 !== entrada ? e : { ...e, ...mudanca },
      ),
    );

  const marcadas = useMemo(
    () =>
      previa.linhas
        .map((l, i) => ({ l, e: escolhas[i] }))
        .filter(({ l, e }) => e.incluir && !l.jaImportada)
        .map(({ l, e }) => ({
          data: l.data,
          descricao: l.descricao,
          jogador: l.jogador,
          centavos: l.centavos,
          referencia: l.referencia,
          natureza: e.natureza,
          categoria_id: e.categoria_id,
        })),
    [previa, escolhas],
  );

  const soma = (n: Natureza) => marcadas.filter((m) => m.natureza === n).reduce((t, m) => t + Math.abs(m.centavos), 0);
  const entradas = previa.linhas.filter((l) => l.centavos > 0).length;
  const saidas = previa.linhas.length - entradas;
  const repetidas = previa.linhas.filter((l) => l.jaImportada).length;

  if (resultado?.ok) {
    return (
      <div className="cartao space-y-2">
        <p className="text-receita">{resultado.ok}</p>
        <Link href="/lancamentos" className="text-sm text-destaque underline">
          Ver lançamentos
        </Link>
      </div>
    );
  }

  return (
    <section className="cartao space-y-4">
      <div>
        <h2 className="font-medium">Prévia: {nome}</h2>
        <p className="mt-1 text-sm text-suave">
          {previa.linhas.length} linhas lidas ({entradas} entradas, {saidas} saídas)
          {repetidas > 0 && `, ${repetidas} já importadas antes`}. Colunas: {previa.colunas.join(" | ")}.
        </p>
        {previa.erros.length > 0 && (
          <details className="mt-2 text-sm text-perda">
            <summary className="cursor-pointer">{previa.erros.length} linhas ignoradas por data ou valor inválido</summary>
            <ul className="mt-1 list-disc pl-5 text-xs">
              {previa.erros.slice(0, 50).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border border-borda p-3 text-sm md:grid-cols-2">
        <div className="space-y-2">
          <div className="font-medium text-receita">Entradas</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="botao-secundario" onClick={() => emLote(true, { incluir: true })}>
              Marcar todas
            </button>
            <button type="button" className="botao-secundario" onClick={() => emLote(true, { incluir: false })}>
              Desmarcar
            </button>
            <select
              className="campo w-auto"
              defaultValue=""
              onChange={(ev) => ev.target.value && emLote(true, { categoria_id: Number(ev.target.value) })}
            >
              <option value="">Categoria para todas…</option>
              {categorias.entrada.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <div className="font-medium text-despesa">Saídas</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="botao-secundario" onClick={() => emLote(false, { incluir: true })}>
              Marcar todas
            </button>
            <button type="button" className="botao-secundario" onClick={() => emLote(false, { incluir: false })}>
              Desmarcar
            </button>
            <select
              className="campo w-auto"
              defaultValue=""
              onChange={(ev) => ev.target.value && emLote(false, { categoria_id: Number(ev.target.value) })}
            >
              <option value="">Categoria para todas…</option>
              {categorias.saida.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-suave">Saídas vêm desmarcadas: marque só as que são gastos ou perdas do hotel.</p>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th />
              <th>Data</th>
              <th>Descrição</th>
              <th>Jogador</th>
              <th className="text-right">Valor</th>
              <th>Tipo</th>
              <th>Categoria</th>
            </tr>
          </thead>
          <tbody>
            {previa.linhas.map((l, i) => {
              const e = escolhas[i];
              const entrada = l.centavos > 0;
              return (
                <tr key={l.referencia} className={l.jaImportada ? "opacity-40" : e.incluir ? "" : "opacity-60"}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Importar linha ${l.n}`}
                      checked={e.incluir && !l.jaImportada}
                      disabled={l.jaImportada}
                      onChange={(ev) => alterar(i, { incluir: ev.target.checked })}
                    />
                  </td>
                  <td className="whitespace-nowrap">{dataBR(l.data)}</td>
                  <td>{l.descricao}</td>
                  <td>{l.jogador}</td>
                  <td className={`valor whitespace-nowrap text-right ${entrada ? "text-receita" : "text-despesa"}`}>
                    {brl(l.centavos)}
                  </td>
                  <td>
                    {l.jaImportada ? (
                      <span className="text-xs text-suave">já importada</span>
                    ) : entrada ? (
                      "Entrada"
                    ) : (
                      <select
                        className="campo w-auto py-1"
                        value={e.natureza}
                        onChange={(ev) => alterar(i, { natureza: ev.target.value as Natureza, incluir: true })}
                      >
                        <option value="despesa">Saída</option>
                        <option value="perda">Perda</option>
                      </select>
                    )}
                  </td>
                  <td>
                    {!l.jaImportada && (
                      <select
                        className="campo w-auto py-1"
                        value={e.categoria_id ?? ""}
                        onChange={(ev) => alterar(i, { categoria_id: Number(ev.target.value) || null })}
                      >
                        <option value="">Sem categoria</option>
                        {(entrada ? categorias.entrada : categorias.saida).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form action={confirmar} className="flex flex-wrap items-center gap-4 border-t border-borda pt-4">
        <input type="hidden" name="linhas" value={JSON.stringify(marcadas)} />
        <button className="botao" disabled={gravando || !marcadas.length}>
          {gravando ? "Importando…" : `Importar ${marcadas.length} lançamentos`}
        </button>
        <span className="text-sm">
          <span className="text-receita">Entradas {brl(soma("receita"))}</span>
          {" · "}
          <span className="text-despesa">Saídas {brl(soma("despesa"))}</span>
          {" · "}
          <span className="text-perda">Perdas {brl(soma("perda"))}</span>
        </span>
        {resultado?.erro && <p className="w-full text-sm text-perda">{resultado.erro}</p>}
      </form>
    </section>
  );
}
