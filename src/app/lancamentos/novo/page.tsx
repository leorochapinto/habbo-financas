import { hojeISO } from "@/lib/dinheiro";
import { listarCategorias, type Natureza } from "@/lib/lancamentos";
import { texto } from "@/lib/periodo";
import { FormLancamento } from "./FormLancamento";

export default async function NovoLancamento({ searchParams }: PageProps<"/lancamentos/novo">) {
  const n = texto(await searchParams, "natureza");
  const natureza: Natureza = n === "receita" || n === "despesa" ? n : "perda";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Novo lançamento</h1>
      <FormLancamento
        naturezaInicial={natureza}
        hoje={hojeISO()}
        categorias={{ entrada: listarCategorias("entrada"), saida: listarCategorias("saida") }}
      />
    </div>
  );
}
