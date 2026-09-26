import type { NextRequest } from "next/server";
import { listarLancamentos } from "@/lib/lancamentos";
import { periodoDaUrl } from "@/lib/periodo";

const NATUREZA: Record<string, string> = { receita: "Entrada", despesa: "Saída", perda: "Perda" };

function celula(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function GET(request: NextRequest) {
  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const { de, ate } = periodoDaUrl(sp);
  const linhas = listarLancamentos({ de, ate }, 100_000);

  const cab = ["Data", "Tipo", "Categoria", "Raro", "Descrição", "Jogador", "Valor (R$)", "Origem"];
  const corpo = linhas.map((l) =>
    [
      l.data,
      NATUREZA[l.natureza],
      l.categoria_nome,
      l.raro,
      l.descricao,
      l.jogador,
      ((l.natureza === "receita" ? 1 : -1) * l.valor_centavos / 100).toFixed(2).replace(".", ","),
      l.origem,
    ]
      .map(celula)
      .join(";"),
  );
  // BOM + ";" para o Excel em português abrir direto com acentos e colunas certas.
  const csv = "﻿" + [cab.join(";"), ...corpo].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financas-${de}-a-${ate}.csv"`,
    },
  });
}
