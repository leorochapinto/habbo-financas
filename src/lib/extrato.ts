import "server-only";
import { createHash } from "node:crypto";
import { criarLancamento, type Natureza } from "./lancamentos";
import { db } from "./db";
import { paraCentavos } from "./dinheiro";

/*
 * Importação de extrato em CSV (exportado do PicPay, de outro banco ou montado à mão).
 *
 * Funciona em duas etapas: lerCsv() interpreta o arquivo e devolve a prévia, sem
 * gravar nada; gravarLinhas() grava só as linhas que a pessoa confirmou.
 *
 * As colunas são achadas pelo nome no cabeçalho, então layouts diferentes servem:
 *   data:      "data", "data da transação", "date"
 *   descrição: "descrição", "histórico", "lançamento", "detalhes"
 *   valor:     "valor", "valor (r$)", "amount"   (negativo = saída)
 *     ou duas colunas: "entrada"/"crédito" e "saída"/"débito"
 *   sentido:   "tipo", "natureza", "operação"   (opcional; "débito", "enviado",
 *              "pagamento" viram saída mesmo com valor positivo)
 *   jogador:   "jogador", "nick", "pagador", "nome", "de"   (opcional)
 * Reimportar o mesmo extrato não duplica nada (impressão digital por linha).
 */

export interface LinhaExtrato {
  n: number;
  data: string;
  descricao: string;
  jogador: string | null;
  /** positivo = entrada, negativo = saída */
  centavos: number;
  referencia: string;
  jaImportada: boolean;
}

export interface Previa {
  colunas: string[];
  separador: string;
  linhas: LinhaExtrato[];
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

function acharColuna(cabecalho: string[], nomes: string[], ignorar: number[] = []): number {
  return cabecalho.findIndex(
    (c, i) => !ignorar.includes(i) && nomes.some((n) => normalizar(c).startsWith(n)),
  );
}

function paraDataISO(texto: string): string | null {
  const t = texto.trim();
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/);
  if (m) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${ano}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function valor(texto: string | undefined): number | null {
  if (!texto) return null;
  return paraCentavos(texto.replace(/[−–]/g, "-"));
}

const PALAVRAS_SAIDA = ["debito", "saida", "enviado", "enviada", "pagamento", "compra", "transferencia enviada", "pix enviado"];

export function lerCsv(conteudo: string): Previa {
  const linhas = conteudo.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const previa: Previa = { colunas: [], separador: ";", linhas: [], erros: [] };
  if (linhas.length < 2) {
    previa.erros.push("Arquivo vazio ou sem linhas além do cabeçalho.");
    return previa;
  }

  const sep = [";", ",", "\t"].sort((a, b) => linhas[0].split(b).length - linhas[0].split(a).length)[0];
  const cab = separar(linhas[0], sep);
  previa.colunas = cab;
  previa.separador = sep === "\t" ? "tab" : sep;

  const iData = acharColuna(cab, ["data", "date"]);
  const iValor = acharColuna(cab, ["valor", "amount", "quantia"]);
  const iCredito = acharColuna(cab, ["entrada", "credito"]);
  const iDebito = acharColuna(cab, ["saida", "debito"]);
  const iSentido = acharColuna(cab, ["tipo", "natureza", "operacao", "movimentacao"]);
  const iDesc = acharColuna(cab, ["descri", "historico", "lancamento", "detalhe", "titulo"]);
  const iJog = acharColuna(
    cab,
    ["jogador", "nick", "pagador", "remetente", "nome", "de ", "origem"],
    [iData, iValor, iCredito, iDebito, iSentido, iDesc],
  );

  const temValor = iValor >= 0 || (iCredito >= 0 && iDebito >= 0);
  if (iData < 0 || !temValor) {
    previa.erros.push(
      `Não achei as colunas de data e valor. Cabeçalho lido: ${cab.join(" | ")}. ` +
        "Renomeie para Data e Valor (ou Entrada e Saída) e tente de novo.",
    );
    return previa;
  }

  const existe = db().prepare("SELECT 1 FROM lancamentos WHERE referencia_externa = ?");
  // Duas transações idênticas no mesmo dia são legítimas: a ocorrência entra na impressão digital.
  const ocorrencias = new Map<string, number>();

  for (let n = 1; n < linhas.length; n++) {
    const campos = separar(linhas[n], sep);
    const data = paraDataISO(campos[iData] ?? "");

    let centavos: number | null;
    if (iValor >= 0) {
      centavos = valor(campos[iValor]);
    } else {
      const c = valor(campos[iCredito]) ?? 0;
      const d = valor(campos[iDebito]) ?? 0;
      centavos = Math.abs(c) - Math.abs(d);
    }
    if (centavos !== null && centavos > 0 && iSentido >= 0) {
      const sentido = normalizar(campos[iSentido] ?? "");
      if (PALAVRAS_SAIDA.some((p) => sentido.includes(p))) centavos = -centavos;
    }

    if (!data || centavos === null || centavos === 0) {
      previa.erros.push(`Linha ${n + 1}: data ou valor inválido (${linhas[n].slice(0, 80)})`);
      continue;
    }

    const bruta = linhas[n].trim();
    const vez = (ocorrencias.get(bruta) ?? 0) + 1;
    ocorrencias.set(bruta, vez);
    const referencia = `extrato:${createHash("sha256").update(`${bruta}#${vez}`).digest("hex").slice(0, 24)}`;

    previa.linhas.push({
      n: n + 1,
      data,
      descricao: (iDesc >= 0 ? campos[iDesc] : "") || "Extrato",
      jogador: iJog >= 0 ? campos[iJog] || null : null,
      centavos,
      referencia,
      jaImportada: Boolean(existe.get(referencia)),
    });
  }
  return previa;
}

export interface LinhaConfirmada {
  data: string;
  descricao: string;
  jogador: string | null;
  centavos: number;
  referencia: string;
  natureza: Natureza;
  categoria_id: number | null;
}

export function gravarLinhas(linhas: LinhaConfirmada[]): { importadas: number; duplicadas: number } {
  let importadas = 0;
  let duplicadas = 0;
  const conexao = db();
  conexao.exec("BEGIN");
  try {
    for (const l of linhas) {
      const novo = criarLancamento({
        tipo: l.natureza === "receita" ? "entrada" : "saida",
        natureza: l.natureza,
        valor_centavos: Math.abs(l.centavos),
        data: l.data,
        descricao: l.descricao,
        categoria_id: l.categoria_id,
        jogador: l.jogador,
        origem: "picpay_extrato",
        referencia_externa: l.referencia,
      });
      if (novo) importadas++;
      else duplicadas++;
    }
    conexao.exec("COMMIT");
  } catch (e) {
    conexao.exec("ROLLBACK");
    throw e;
  }
  return { importadas, duplicadas };
}
