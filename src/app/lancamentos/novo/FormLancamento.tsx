"use client";

import { useActionState, useState } from "react";
import { salvarLancamento } from "@/app/actions";
import type { Categoria, Natureza } from "@/lib/lancamentos";

const OPCOES: Array<{ valor: Natureza; texto: string; ajuda: string; cor: string }> = [
  { valor: "receita", texto: "Entrada", ajuda: "Dinheiro que entrou (venda, doação).", cor: "peer-checked:border-receita peer-checked:text-receita" },
  { valor: "despesa", texto: "Saída", ajuda: "Gasto planejado (servidor, staff, anúncio).", cor: "peer-checked:border-despesa peer-checked:text-despesa" },
  { valor: "perda", texto: "Perda", ajuda: "Dinheiro perdido (golpe, estorno, calote).", cor: "peer-checked:border-perda peer-checked:text-perda" },
];

const RARO: Record<Natureza, { raro: string; valor: string; categoria: string }> = {
  receita: { raro: "Raro que ganhei", valor: "Valor ganho (R$)", categoria: "Raros e mobis" },
  despesa: { raro: "Raro que comprei", valor: "Valor pago (R$)", categoria: "Compra de raros" },
  perda: { raro: "Raro que perdi", valor: "Valor perdido (R$)", categoria: "Golpe" },
};

export function FormLancamento({
  naturezaInicial,
  travada,
  hoje,
  categorias,
}: {
  naturezaInicial: Natureza;
  /** true: o tipo veio do botão clicado e não aparece para escolha */
  travada: boolean;
  hoje: string;
  categorias: { entrada: Categoria[]; saida: Categoria[] };
}) {
  const [estado, enviar, enviando] = useActionState(salvarLancamento, null);
  const [natureza, setNatureza] = useState<Natureza>(naturezaInicial);
  const lista = natureza === "receita" ? categorias.entrada : categorias.saida;
  const textos = RARO[natureza];
  const sugerida = lista.find((c) => c.nome.startsWith(textos.categoria))?.id;

  return (
    <form action={enviar} className="cartao space-y-4">
      {travada ? (
        <input type="hidden" name="natureza" value={natureza} />
      ) : (
        <fieldset className="grid grid-cols-3 gap-2">
          {OPCOES.map((o) => (
            <label key={o.valor} className="cursor-pointer">
              <input
                type="radio"
                name="natureza"
                value={o.valor}
                checked={natureza === o.valor}
                onChange={() => setNatureza(o.valor)}
                className="peer sr-only"
              />
              <div className={`rounded-lg border-2 border-borda p-3 text-center ${o.cor}`}>
                <div className="font-medium">{o.texto}</div>
                <div className="mt-1 text-xs text-suave">{o.ajuda}</div>
              </div>
            </label>
          ))}
        </fieldset>
      )}

      <label className="block">
        <span className="rotulo">{textos.raro}</span>
        <input name="raro" placeholder="Ex.: Trono de Dragão" className="campo" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="rotulo">{textos.valor}</span>
          <input name="valor" inputMode="decimal" placeholder="0,00" required className="campo" />
        </label>
        <label>
          <span className="rotulo">Data</span>
          <input type="date" name="data" defaultValue={hoje} required className="campo" />
        </label>
      </div>

      <label className="block">
        <span className="rotulo">Categoria</span>
        <select key={natureza} name="categoria_id" defaultValue={sugerida ?? ""} className="campo">
          <option value="">Sem categoria</option>
          {lista.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="rotulo">Descrição (opcional se o raro estiver preenchido)</span>
        <textarea
          name="descricao"
          rows={3}
          className="campo"
          placeholder={
            natureza === "perda"
              ? "O que aconteceu? Ex.: jogador pagou com comprovante falso, VIP já tinha sido entregue."
              : "Ex.: VIP 30 dias"
          }
        />
      </label>

      <label className="block">
        <span className="rotulo">Jogador (nick no hotel, opcional)</span>
        <input name="jogador" className="campo" />
      </label>

      {estado?.erro && <p className="text-sm text-perda">{estado.erro}</p>}

      <button className="botao w-full" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
