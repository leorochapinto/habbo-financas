import "server-only";
import { db } from "./db";

export type Tipo = "entrada" | "saida";
export type Natureza = "receita" | "despesa" | "perda";
export type Origem = "manual" | "picpay_cobranca" | "picpay_extrato";

export interface Categoria {
  id: number;
  nome: string;
  tipo: Tipo;
}

export interface Lancamento {
  id: number;
  tipo: Tipo;
  natureza: Natureza;
  valor_centavos: number;
  data: string;
  descricao: string;
  categoria_id: number | null;
  categoria_nome: string | null;
  jogador: string | null;
  raro: string | null;
  origem: Origem;
  referencia_externa: string | null;
  criado_em: string;
}

export interface NovoLancamento {
  tipo: Tipo;
  natureza: Natureza;
  valor_centavos: number;
  data: string;
  descricao: string;
  categoria_id: number | null;
  jogador: string | null;
  raro?: string | null;
  origem?: Origem;
  referencia_externa?: string | null;
}

export interface Filtro {
  de: string;
  ate: string;
  natureza?: Natureza;
  categoria_id?: number;
  busca?: string;
}

export function listarCategorias(tipo?: Tipo): Categoria[] {
  const sql = tipo
    ? "SELECT id, nome, tipo FROM categorias WHERE tipo = ? ORDER BY nome"
    : "SELECT id, nome, tipo FROM categorias ORDER BY tipo, nome";
  const stmt = db().prepare(sql);
  const linhas = (tipo ? stmt.all(tipo) : stmt.all()) as unknown as Categoria[];
  // node:sqlite devolve objetos sem protótipo; componentes de cliente só aceitam objeto comum.
  return linhas.map((c) => ({ ...c }));
}

export function criarCategoria(nome: string, tipo: Tipo): void {
  db().prepare("INSERT OR IGNORE INTO categorias (nome, tipo) VALUES (?, ?)").run(nome, tipo);
}

export function idDaCategoria(nome: string, tipo: Tipo): number | null {
  const linha = db()
    .prepare("SELECT id FROM categorias WHERE nome = ? AND tipo = ?")
    .get(nome, tipo) as { id: number } | undefined;
  return linha?.id ?? null;
}

/** Insere o lançamento. Devolve false se a referência externa já existia (duplicado). */
export function criarLancamento(l: NovoLancamento): boolean {
  const resultado = db()
    .prepare(
      `INSERT OR IGNORE INTO lancamentos
         (tipo, natureza, valor_centavos, data, descricao, categoria_id, jogador, raro, origem, referencia_externa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      l.tipo,
      l.natureza,
      l.valor_centavos,
      l.data,
      l.descricao,
      l.categoria_id,
      l.jogador,
      l.raro ?? null,
      l.origem ?? "manual",
      l.referencia_externa ?? null,
    );
  return Number(resultado.changes) > 0;
}

export function excluirLancamento(id: number): void {
  db().prepare("DELETE FROM lancamentos WHERE id = ?").run(id);
}

function where(f: Filtro): { sql: string; params: Array<string | number> } {
  const partes = ["l.data BETWEEN ? AND ?"];
  const params: Array<string | number> = [f.de, f.ate];
  if (f.natureza) {
    partes.push("l.natureza = ?");
    params.push(f.natureza);
  }
  if (f.categoria_id) {
    partes.push("l.categoria_id = ?");
    params.push(f.categoria_id);
  }
  if (f.busca) {
    partes.push("(l.descricao LIKE ? OR l.jogador LIKE ? OR l.raro LIKE ?)");
    params.push(`%${f.busca}%`, `%${f.busca}%`, `%${f.busca}%`);
  }
  return { sql: partes.join(" AND "), params };
}

export function listarLancamentos(f: Filtro, limite = 500): Lancamento[] {
  const w = where(f);
  return db()
    .prepare(
      `SELECT l.*, c.nome AS categoria_nome
         FROM lancamentos l LEFT JOIN categorias c ON c.id = l.categoria_id
        WHERE ${w.sql}
        ORDER BY l.data DESC, l.id DESC
        LIMIT ${Number(limite)}`,
    )
    .all(...w.params) as unknown as Lancamento[];
}

export interface Totais {
  receitas: number;
  despesas: number;
  perdas: number;
  saldo: number;
  quantidade: number;
}

export function totais(f: Filtro): Totais {
  const w = where(f);
  const linha = db()
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN natureza = 'receita' THEN valor_centavos END), 0) AS receitas,
         COALESCE(SUM(CASE WHEN natureza = 'despesa' THEN valor_centavos END), 0) AS despesas,
         COALESCE(SUM(CASE WHEN natureza = 'perda'   THEN valor_centavos END), 0) AS perdas,
         COUNT(*) AS quantidade
       FROM lancamentos l WHERE ${w.sql}`,
    )
    .get(...w.params) as { receitas: number; despesas: number; perdas: number; quantidade: number };
  return { ...linha, saldo: linha.receitas - linha.despesas - linha.perdas };
}

export interface LinhaPorCategoria {
  categoria: string;
  natureza: Natureza;
  total: number;
  quantidade: number;
}

export function porCategoria(f: Filtro): LinhaPorCategoria[] {
  const w = where(f);
  return db()
    .prepare(
      `SELECT COALESCE(c.nome, 'Sem categoria') AS categoria, l.natureza,
              SUM(l.valor_centavos) AS total, COUNT(*) AS quantidade
         FROM lancamentos l LEFT JOIN categorias c ON c.id = l.categoria_id
        WHERE ${w.sql}
        GROUP BY categoria, l.natureza
        ORDER BY l.natureza, total DESC`,
    )
    .all(...w.params) as unknown as LinhaPorCategoria[];
}

export interface LinhaPorPeriodo {
  periodo: string;
  receitas: number;
  despesas: number;
  perdas: number;
}

/** Agrupa por dia (AAAA-MM-DD) ou por mês (AAAA-MM). */
export function porPeriodo(f: Filtro, agrupamento: "dia" | "mes"): LinhaPorPeriodo[] {
  const w = where(f);
  const chave = agrupamento === "dia" ? "l.data" : "substr(l.data, 1, 7)";
  return db()
    .prepare(
      `SELECT ${chave} AS periodo,
         COALESCE(SUM(CASE WHEN natureza = 'receita' THEN valor_centavos END), 0) AS receitas,
         COALESCE(SUM(CASE WHEN natureza = 'despesa' THEN valor_centavos END), 0) AS despesas,
         COALESCE(SUM(CASE WHEN natureza = 'perda'   THEN valor_centavos END), 0) AS perdas
       FROM lancamentos l WHERE ${w.sql}
       GROUP BY periodo ORDER BY periodo`,
    )
    .all(...w.params) as unknown as LinhaPorPeriodo[];
}

export interface LinhaPorJogador {
  jogador: string;
  total: number;
  quantidade: number;
}

export function topJogadores(f: Filtro, limite = 10): LinhaPorJogador[] {
  const w = where(f);
  return db()
    .prepare(
      `SELECT l.jogador, SUM(l.valor_centavos) AS total, COUNT(*) AS quantidade
         FROM lancamentos l
        WHERE ${w.sql} AND l.natureza = 'receita' AND l.jogador IS NOT NULL AND l.jogador <> ''
        GROUP BY l.jogador ORDER BY total DESC LIMIT ${Number(limite)}`,
    )
    .all(...w.params) as unknown as LinhaPorJogador[];
}
