import "server-only";
import { createHash } from "node:crypto";
import { criarLancamento, idDaCategoria } from "./lancamentos";
import { paraCentavos } from "./dinheiro";

/*
 * Importação de extrato em CSV (exportado do PicPay ou montado à mão).
 *
 * Serve para pegar TODAS as entradas, inclusive Pix e transferências que não
 * passaram por uma cobrança gerada no sistema. O leitor procura as colunas pelo
 * nome no cabeçalho, então aceita layouts diferentes:
 *   data:      "data", "data da transação", "date"
 *   descrição: "descrição", "descricao", "histórico", "lançamento"
 *   valor:     "valor", "valor (r$)", "amount"   (negativo = saída)
 *   jogador:   "jogador", "nick", "pagador", "nome"   (opcional)
 * Reimportar o mesmo extrato não duplica nada (impressão digital por linha).
 */

export interface ResultadoImportacao {
  lidas: number;
  importadas: number;
  duplicadas: number;
  erros: string[];
}

function separar(linha: string, sep: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else aspas = !aspas;
    } else if (ch === sep && !aspas) {
      campos.push(atual.trim());
      atual = "";
    } else atual += ch;
  }
  campos.push(atual.trim());
  return campos;
}

function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function acharColuna(cabecalho: string[], nomes: string[]): number {
  return cabecalho.findIndex((c) => nomes.some((n) => normalizar(c).startsWith(n)));
}

function paraDataISO(texto: string): string | null {
  const t = texto.trim();
  let m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

export function importarCsv(conteudo: string): ResultadoImportacao {
  const linhas = conteudo.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const r: ResultadoImportacao = { lidas: 0, importadas: 0, duplicadas: 0, erros: [] };
  if (linhas.length < 2) {
    r.erros.push("Arquivo vazio ou sem linhas além do cabeçalho.");
    return r;
  }

  const sep = [";", ",", "\t"].sort((a, b) => linhas[0].split(b).length - linhas[0].split(a).length)[0];
  const cab = separar(linhas[0], sep);
  const iData = acharColuna(cab, ["data", "date"]);
  const iDesc = acharColuna(cab, ["descri", "historico", "lancamento", "tipo"]);
  const iValor = acharColuna(cab, ["valor", "amount", "quantia"]);
  const iJog = acharColuna(cab, ["jogador", "nick", "pagador", "nome", "de "]);
  if (iData < 0 || iValor < 0) {
    r.erros.push(`Não achei as colunas de data e valor no cabeçalho: ${cab.join(" | ")}`);
    return r;
  }

  const outrasEntradas = idDaCategoria("Outras entradas", "entrada");
  const outrasSaidas = idDaCategoria("Outras saídas", "saida");

  // Duas transações idênticas no mesmo dia são legítimas: a ocorrência entra na impressão digital.
  const ocorrencias = new Map<string, number>();

  for (let n = 1; n < linhas.length; n++) {
    r.lidas++;
    const campos = separar(linhas[n], sep);
    const data = paraDataISO(campos[iData] ?? "");
    const centavos = paraCentavos(campos[iValor] ?? "");
    if (!data || centavos === null || centavos === 0) {
      r.erros.push(`Linha ${n + 1}: data ou valor inválido (${linhas[n].slice(0, 80)})`);
      continue;
    }
    const entrada = centavos > 0;
    const bruta = linhas[n].trim();
    const vez = (ocorrencias.get(bruta) ?? 0) + 1;
    ocorrencias.set(bruta, vez);
    const digital = createHash("sha256").update(`${bruta}#${vez}`).digest("hex").slice(0, 24);
    const novo = criarLancamento({
      tipo: entrada ? "entrada" : "saida",
      natureza: entrada ? "receita" : "despesa",
      valor_centavos: Math.abs(centavos),
      data,
      descricao: iDesc >= 0 ? campos[iDesc] ?? "" : "Extrato PicPay",
      categoria_id: entrada ? outrasEntradas : outrasSaidas,
      jogador: iJog >= 0 ? campos[iJog] || null : null,
      origem: "picpay_extrato",
      referencia_externa: `extrato:${digital}`,
    });
    if (novo) r.importadas++;
    else r.duplicadas++;
  }
  return r;
}
