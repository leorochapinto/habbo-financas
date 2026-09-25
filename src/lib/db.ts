import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

// Banco SQLite embutido no Node (node:sqlite). Valores monetários sempre em
// centavos (inteiro) para não acumular erro de ponto flutuante.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categorias (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  nome    TEXT NOT NULL,
  tipo    TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  UNIQUE (nome, tipo)
);

CREATE TABLE IF NOT EXISTS lancamentos (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo                TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  natureza            TEXT NOT NULL CHECK (natureza IN ('receita', 'despesa', 'perda')),
  valor_centavos      INTEGER NOT NULL CHECK (valor_centavos > 0),
  data                TEXT NOT NULL,          -- AAAA-MM-DD
  descricao           TEXT NOT NULL DEFAULT '',
  categoria_id        INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  jogador             TEXT,                   -- nick no Habbo, quando houver
  origem              TEXT NOT NULL DEFAULT 'manual'
                      CHECK (origem IN ('manual', 'picpay_cobranca', 'picpay_extrato')),
  referencia_externa  TEXT UNIQUE,            -- evita importar a mesma entrada duas vezes
  criado_em           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos (data);

CREATE TABLE IF NOT EXISTS cobrancas_picpay (
  reference_id      TEXT PRIMARY KEY,
  valor_centavos    INTEGER NOT NULL,
  jogador           TEXT,
  produto           TEXT NOT NULL DEFAULT '',
  categoria_id      INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'created',
  payment_url       TEXT,
  authorization_id  TEXT,
  criado_em         TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const CATEGORIAS_INICIAIS: Array<[string, "entrada" | "saida"]> = [
  ["VIP / assinatura", "entrada"],
  ["Moedas / créditos", "entrada"],
  ["Raros e mobis", "entrada"],
  ["Doação", "entrada"],
  ["Outras entradas", "entrada"],
  ["Servidor / hospedagem", "saida"],
  ["Domínio e serviços", "saida"],
  ["Equipe / staff", "saida"],
  ["Divulgação", "saida"],
  ["Golpe / fraude", "saida"],
  ["Estorno PicPay", "saida"],
  ["Outras saídas", "saida"],
];

function abrir(): DatabaseSync {
  const arquivo = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "financas.db");
  mkdirSync(path.dirname(arquivo), { recursive: true });
  const db = new DatabaseSync(arquivo);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  const inserir = db.prepare("INSERT OR IGNORE INTO categorias (nome, tipo) VALUES (?, ?)");
  for (const [nome, tipo] of CATEGORIAS_INICIAIS) inserir.run(nome, tipo);
  return db;
}

const global = globalThis as unknown as { __financasDb?: DatabaseSync };

export function db(): DatabaseSync {
  global.__financasDb ??= abrir();
  return global.__financasDb;
}
