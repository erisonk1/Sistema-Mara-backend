import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!,
});

// Wrapper para manter a mesma interface que o sqlite original
export async function initDB() {
  // Criar tabelas se não existirem
  await client.execute(`
    CREATE TABLE IF NOT EXISTS categorias (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL
    )
  `);

  await client.execute(`
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

  await client.execute(`
    CREATE TABLE IF NOT EXISTS clientes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT NOT NULL,
      telefone  TEXT NOT NULL,
      comandas  TEXT NOT NULL DEFAULT '[]'
    )
  `);

  await client.execute(`
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

  // Retorna um objeto com a mesma interface do sqlite original
  return {
    all: async (sql: string, params: any[] = []) => {
      const result = await client.execute({ sql, args: params });
      return result.rows as any[];
    },
    get: async (sql: string, params: any[] = []) => {
      const result = await client.execute({ sql, args: params });
      return result.rows[0] as any ?? undefined;
    },
    run: async (sql: string, params: any[] = []) => {
      const result = await client.execute({ sql, args: params });
      return { lastID: Number(result.lastInsertRowid) };
    },
    exec: async (sql: string) => {
      await client.execute(sql);
    },
  };
}