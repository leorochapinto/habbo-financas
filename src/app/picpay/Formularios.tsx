"use client";

import { useActionState } from "react";
import { gerarCobranca, importarExtrato } from "@/app/actions";
import type { Categoria } from "@/lib/lancamentos";

export function FormCobranca({ categorias }: { categorias: Categoria[] }) {
  const [estado, enviar, enviando] = useActionState(gerarCobranca, null);
  return (
    <form action={enviar} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="rotulo">Produto</span>
          <input name="produto" required placeholder="VIP 30 dias" className="campo" />
        </label>
        <label>
          <span className="rotulo">Valor (R$)</span>
          <input name="valor" required inputMode="decimal" placeholder="0,00" className="campo" />
        </label>
        <label>
          <span className="rotulo">Jogador (nick)</span>
          <input name="jogador" className="campo" />
        </label>
        <label>
          <span className="rotulo">Categoria</span>
          <select
            name="categoria_id"
            defaultValue={categorias.find((c) => c.nome.startsWith("VIP"))?.id}
            className="campo"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-suave">Dados do comprador (o PicPay pode exigir)</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input name="comprador_nome" placeholder="Nome completo" className="campo" />
          <input name="comprador_cpf" placeholder="CPF" className="campo" />
          <input name="comprador_email" type="email" placeholder="E-mail" className="campo" />
          <input name="comprador_telefone" placeholder="+55 11 99999-9999" className="campo" />
        </div>
      </details>
      {estado?.erro && <p className="text-sm text-perda">{estado.erro}</p>}
      {estado?.ok && (
        <p className="break-all rounded-lg bg-receita/10 px-3 py-2 text-sm">
          Cobrança criada. Link para o jogador:{" "}
          <a href={estado.ok} target="_blank" className="text-destaque underline">
            {estado.ok}
          </a>
        </p>
      )}
      <button className="botao" disabled={enviando}>
        {enviando ? "Gerando…" : "Gerar link de pagamento"}
      </button>
    </form>
  );
}

export function FormExtrato() {
  const [estado, enviar, enviando] = useActionState(importarExtrato, null);
  return (
    <form action={enviar} className="space-y-3">
      <input type="file" name="arquivo" accept=".csv,text/csv" required className="campo" />
      {estado?.erro && <p className="text-sm text-perda">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm text-receita">{estado.ok}</p>}
      <button className="botao" disabled={enviando}>
        {enviando ? "Importando…" : "Importar"}
      </button>
      <p className="text-xs text-suave">
        Colunas reconhecidas pelo nome: Data, Descrição, Valor e, se houver, Jogador/Nome/Pagador. Separador ; ou ,
      </p>
    </form>
  );
}
