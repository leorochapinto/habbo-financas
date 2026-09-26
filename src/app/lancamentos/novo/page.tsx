import { hojeISO } from "@/lib/dinheiro";
import { listarCategorias, type Natureza } from "@/lib/lancamentos";
import { texto } from "@/lib/periodo";
import { FormLancamento } from "./FormLancamento";

export default async function NovoLancamento({ searchParams }: PageProps<"/lancamentos/novo">) {
  const n = texto(await searchParams, "natureza");
  // Com o tipo no endereço (botões "Registrar entrada/perda"), o formulário fica travado nele.
  const fixa: Natureza | null = n === "receita" || n === "despesa" || n === "perda" ? n : null;
  const titulo = { receita: "Registrar entrada", despesa: "Registrar saída", perda: "Registrar perda" };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">{fixa ? titulo[fixa] : "Novo lançamento"}</h1>
      {/* A key recria o formulário ao trocar de botão; sem ela o estado do tipo anterior sobrevive à navegação. */}
      <FormLancamento
        key={fixa ?? "livre"}
        naturezaInicial={fixa ?? "receita"}
        travada={fixa !== null}
        hoje={hojeISO()}
        categorias={{ entrada: listarCategorias("entrada"), saida: listarCategorias("saida") }}
      />
    </div>
  );
}
