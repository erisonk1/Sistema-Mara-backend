import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

// Em produção (Railway), o volume é montado em /data
// Em dev local, usa a pasta do projeto
const DB_PATH = process.env.NODE_ENV === "production"
  ? "/data/comandas.db"
  : path.resolve(__dirname, "../comandas.db");

export async function initDB() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA journal_mode=WAL;");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS itens (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id   INTEGER NOT NULL,
      categoria_nome TEXT    NOT NULL,
      nome           TEXT    NOT NULL,
      preco          REAL    NOT NULL,
      available      INTEGER DEFAULT 1,
      porPeso        INTEGER DEFAULT 0,
      FOREIGN KEY(categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT NOT NULL,
      telefone  TEXT NOT NULL,
      comandas  TEXT NOT NULL DEFAULT '[]'
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS comandas (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      id_cliente     INTEGER,
      nome           TEXT    NOT NULL,
      descricao      TEXT,
      formaPagamento TEXT,
      status         TEXT    NOT NULL,
      itens          TEXT    NOT NULL,
      criado_em      TEXT    NOT NULL,
      FOREIGN KEY(id_cliente) REFERENCES clientes(id) ON DELETE SET NULL
    )
  `);

  return db;
}
