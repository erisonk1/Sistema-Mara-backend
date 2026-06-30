import { Router } from "express";
import { initDB } from "./db";
import { Comanda } from "./models";

const router = Router();

function mapComanda(c: any) {
  return {
    ...c,
    itens: typeof c.itens === "string" ? JSON.parse(c.itens) : c.itens,
    criadoEm: c.criado_em,
  };
}

// ══════════════════════════════════════════════════════
// ATENÇÃO: rotas estáticas SEMPRE antes de /:id
// ══════════════════════════════════════════════════════

// ---------------- COMANDAS ----------------

router.get("/comandas", async (_req, res) => {
  const db = await initDB();
  const rows = await db.all("SELECT * FROM comandas ORDER BY id DESC");
  res.json(rows.map(mapComanda));
});

router.get("/comandas/hoje", async (_req, res) => {
  const db = await initDB();

  const tz = "America/Sao_Paulo";
  const agora = new Date().toLocaleString("pt-BR", { timeZone: tz });
  const [dia, mes, anoHora] = agora.split("/");
  const ano = anoHora.split(",")[0].trim();

  const hoje = `${ano}-${mes}-${dia}`;

  const ontemDate = new Date();
  ontemDate.setDate(ontemDate.getDate() - 1);
  const ontemStr = ontemDate.toLocaleString("pt-BR", { timeZone: tz });
  const [diaO, mesO, anoHoraO] = ontemStr.split("/");
  const anoO = anoHoraO.split(",")[0].trim();
  const ontem = `${anoO}-${mesO}-${diaO}`;

  const rows = await db.all(
    `SELECT * FROM comandas
     WHERE date(
       substr(criado_em, 7, 4) || '-' ||
       substr(criado_em, 4, 2) || '-' ||
       substr(criado_em, 1, 2)
     ) BETWEEN ? AND ?
     ORDER BY id DESC`,
    [ontem, hoje]
  );

  res.json(rows.map(mapComanda));
});
// /comandas/periodo/yyyy-MM-dd/yyyy-MM-dd
router.get("/comandas/periodo/:inicio/:fim", async (req, res) => {
  const db = await initDB();
  const { inicio, fim } = req.params;

  // criado_em está salvo como "dd/MM/yyyy, HH:mm:ss"
  // substr extrai: dia=1..2, mês=4..2, ano=7..4 → remonta para yyyy-MM-dd
  const rows = await db.all(
    `SELECT * FROM comandas
     WHERE date(
       substr(criado_em, 7, 4) || '-' ||
       substr(criado_em, 4, 2) || '-' ||
       substr(criado_em, 1, 2)
     ) BETWEEN ? AND ?
     ORDER BY id DESC`,
    [inicio, fim]
  );
  res.json(rows.map(mapComanda));
});

router.get("/comandas/:id", async (req, res) => {
  const db = await initDB();
  const row = await db.get("SELECT * FROM comandas WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Comanda não encontrada" });
  res.json(mapComanda(row));
});

router.post("/comandas", async (req, res) => {
  const db = await initDB();
  const { id_cliente, nome, descricao, status, formaPagamento, itens }: Comanda = req.body;

  if (!nome || !status)
    return res.status(400).json({ error: "Nome e status são obrigatórios" });

  const itensComCategoria = itens.map((i) => ({
    nome: i.nome,
    quantidade: i.quantidade,
    preco: i.preco,
    categoria_nome: i.categoria_nome?.trim() || "Sem categoria",
    porPeso: i.porPeso ?? false,
    peso: i.porPeso ? (i.peso ?? 0) : undefined,
  }));

  const criadoEm = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  await db.run(
    `INSERT INTO comandas (id_cliente, nome, descricao, formaPagamento, status, itens, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id_cliente ?? null, nome, descricao, formaPagamento, status, JSON.stringify(itensComCategoria), criadoEm]
  );

  res.json({ message: "Comanda criada com sucesso", criadoEm });
});

router.put("/comandas/:id", async (req, res) => {
  const db = await initDB();
  const { nome, descricao, formaPagamento, status, itens }: Comanda = req.body;

  const itensComCategoria = itens.map((i) => ({
    nome: i.nome,
    quantidade: i.porPeso ? 1 : i.quantidade,
    preco: i.preco,
    categoria_nome: i.categoria_nome?.trim() || "Sem categoria",
    porPeso: i.porPeso ?? false,
    peso: i.porPeso ? (i.peso ?? 0) : undefined,
  }));

  await db.run(
    `UPDATE comandas
     SET nome=?, descricao=?, formaPagamento=?, status=?, itens=?
     WHERE id=?`,
    [nome, descricao, formaPagamento, status, JSON.stringify(itensComCategoria), req.params.id]
  );
  res.json({ message: "Comanda atualizada com sucesso" });
});

router.delete("/comandas/:id", async (req, res) => {
  const db = await initDB();
  await db.run("DELETE FROM comandas WHERE id = ?", [req.params.id]);
  res.json({ message: "Comanda excluída com sucesso" });
});

// ---------------- ITENS ----------------

router.get("/itens", async (_req, res) => {
  const db = await initDB();
  const rows = await db.all("SELECT * FROM itens");
  res.json(rows.map((i) => ({
    ...i,
    available: i.available === 1,
    porPeso: i.porPeso === 1,
  })));
});

router.post("/itens", async (req, res) => {
  const db = await initDB();
  const { categoria_id, nome, preco, available, porPeso } = req.body;

  if (!categoria_id || !nome || preco === undefined)
    return res.status(400).json({ error: "Categoria, nome e preço são obrigatórios" });

  const categoria = await db.get(
    "SELECT nome FROM categorias WHERE id = ?", [categoria_id]
  );
  if (!categoria) return res.status(400).json({ error: "Categoria não encontrada" });

  await db.run(
    `INSERT INTO itens (categoria_id, categoria_nome, nome, preco, available, porPeso)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [categoria_id, categoria.nome, nome.trim(), preco, available ? 1 : 0, porPeso ? 1 : 0]
  );
  res.json({ message: "Item criado com sucesso" });
});

router.put("/itens/:id", async (req, res) => {
  const db = await initDB();
  const { categoria_id, name, price, available, porPeso } = req.body;

  const categoria = await db.get(
    "SELECT nome FROM categorias WHERE id = ?", [categoria_id]
  );
  if (!categoria) return res.status(400).json({ error: "Categoria não encontrada" });

  await db.run(
    `UPDATE itens
     SET categoria_id=?, categoria_nome=?, nome=?, preco=?, available=?, porPeso=?
     WHERE id=?`,
    [categoria_id, categoria.nome, name.trim(), price, available ? 1 : 0, porPeso ? 1 : 0, req.params.id]
  );
  res.json({ message: "Item atualizado com sucesso" });
});

router.delete("/itens/:id", async (req, res) => {
  const db = await initDB();
  await db.run("DELETE FROM itens WHERE id = ?", [req.params.id]);
  res.json({ message: "Item excluído com sucesso" });
});

// ---------------- CATEGORIAS ----------------

router.get("/categorias", async (_req, res) => {
  const db = await initDB();
  const rows = await db.all("SELECT * FROM categorias ORDER BY id");
  res.json(rows);
});

router.post("/categorias", async (req, res) => {
  const db = await initDB();
  const { nome } = req.body;

  if (!nome?.trim())
    return res.status(400).json({ error: "O nome da categoria é obrigatório" });

  const existente = await db.get(
    "SELECT id FROM categorias WHERE nome = ?", [nome.trim()]
  );
  if (existente) return res.status(400).json({ error: "Categoria já existe" });

  await db.run("INSERT INTO categorias (nome) VALUES (?)", [nome.trim()]);
  res.json({ message: "Categoria adicionada com sucesso" });
});

router.put("/categorias/:id", async (req, res) => {
  const db = await initDB();
  const { nome } = req.body;
  await db.run("UPDATE categorias SET nome = ? WHERE id = ?", [nome, req.params.id]);
  res.json({ message: "Categoria atualizada com sucesso" });
});

router.delete("/categorias/:id", async (req, res) => {
  const db = await initDB();
  const cat = await db.get("SELECT id FROM categorias WHERE id = ?", [req.params.id]);
  if (!cat) return res.status(404).json({ error: "Categoria não encontrada" });

  // itens deletados em cascata (ON DELETE CASCADE no db.ts)
  await db.run("DELETE FROM categorias WHERE id = ?", [req.params.id]);
  res.json({ message: "Categoria e seus itens foram excluídos com sucesso" });
});

// ---------------- CARDÁPIO ----------------

router.get("/cardapio", async (_req, res) => {
  const db = await initDB();
  const categorias = await db.all("SELECT * FROM categorias ORDER BY id");
  const itens      = await db.all("SELECT * FROM itens");

  const cardapio = categorias.map((cat) => ({
    id: cat.id,
    category: cat.nome,
    items: itens
      .filter((i) => i.categoria_id === cat.id)
      .map((i) => ({
        id: i.id,
        name: i.nome,
        price: i.preco,
        available: i.available === 1,
        categoria_nome: cat.nome,
        porPeso: i.porPeso === 1,
      })),
  }));

  res.json(cardapio);
});

// ---------------- CLIENTES ----------------

router.get("/clientes", async (_req, res) => {
  const db = await initDB();
  const rows = await db.all("SELECT * FROM clientes ORDER BY nome");
  res.json(rows);
});

// ATENÇÃO: /clientes/search ANTES de /clientes/:id
router.get("/clientes/search", async (req, res) => {
  try {
    const db = await initDB();
    const q = String(req.query.q || "").trim();

    if (!q || q.length < 2) return res.json([]);

    const rows = await db.all(
      `SELECT id, nome, telefone
       FROM clientes
       WHERE nome LIKE ? OR telefone LIKE ?
       ORDER BY nome ASC
       LIMIT 50`,
      [`%${q}%`, `%${q}%`]
    );
    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar clientes:", err);
    res.status(500).json({ error: "Erro interno ao realizar a busca" });
  }
});

router.get("/clientes/:id", async (req, res) => {
  const db = await initDB();
  const row = await db.get("SELECT * FROM clientes WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Cliente não encontrado" });
  res.json(row);
});

router.post("/clientes", async (req, res) => {
  const db = await initDB();
  const { nome, telefone } = req.body;
  if (!nome || !telefone)
    return res.status(400).json({ error: "Nome e telefone são obrigatórios" });

  await db.run(
    "INSERT INTO clientes (nome, telefone) VALUES (?, ?)",
    [nome.trim(), telefone]
  );
  res.json({ message: "Cliente criado com sucesso" });
});

router.put("/clientes/:id", async (req, res) => {
  const db = await initDB();
  const { nome, telefone } = req.body;
  if (!nome || !telefone)
    return res.status(400).json({ error: "Nome e telefone são obrigatórios" });

  await db.run(
    "UPDATE clientes SET nome=?, telefone=? WHERE id=?",
    [nome.trim(), telefone, req.params.id]
  );
  res.json({ message: "Cliente atualizado com sucesso" });
});

router.delete("/clientes/:id", async (req, res) => {
  const db = await initDB();
  await db.run("DELETE FROM clientes WHERE id = ?", [req.params.id]);
  res.json({ message: "Cliente excluído com sucesso" });
});

// ---------------- FATURAMENTO ----------------

router.get("/faturamento/dias", async (_req, res) => {
  const db = await initDB();
  const rows = await db.all("SELECT criado_em, itens FROM comandas");

  const faturamentoPorDia: Record<string, number> = {};
  rows.forEach((c) => {
    const data = c.criado_em.split(",")[0];
    const itens: any[] = typeof c.itens === "string" ? JSON.parse(c.itens) : c.itens;
    const total = itens.reduce(
      (sum, i) => sum + (i.porPeso ? (i.peso ?? 0) * i.preco : i.quantidade * i.preco),
      0
    );
    faturamentoPorDia[data] = (faturamentoPorDia[data] || 0) + total;
  });

  res.json(faturamentoPorDia);
});

router.get("/faturamento/mais-vendidos", async (_req, res) => {
  const db = await initDB();
  try {
    const rows = await db.all("SELECT itens FROM comandas");
    const itensVendidos: Record<string, { nome: string; categoria: string; quantidade: number; valorTotal: number }> = {};

    rows.forEach((c) => {
      const itens: any[] = typeof c.itens === "string" ? JSON.parse(c.itens) : c.itens;
      itens.forEach((i) => {
        const chave = `${i.nome}-${i.categoria_nome}`;
        if (!itensVendidos[chave]) {
          itensVendidos[chave] = { nome: i.nome, categoria: i.categoria_nome, quantidade: 0, valorTotal: 0 };
        }
        itensVendidos[chave].quantidade += i.porPeso ? 1 : i.quantidade;
        itensVendidos[chave].valorTotal  += i.porPeso ? (i.peso ?? 0) * i.preco : i.quantidade * i.preco;
      });
    });

    const ranking = Object.values(itensVendidos).sort((a, b) => b.quantidade - a.quantidade);
    res.json(ranking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao calcular mais vendidos" });
  }
});

// ---------------- RESET ----------------

router.delete("/reset", async (_req, res) => {
  const db = await initDB();

  await db.exec("DROP TABLE IF EXISTS comandas");
  await db.exec("DROP TABLE IF EXISTS itens");
  await db.exec("DROP TABLE IF EXISTS categorias");
  await db.exec("DROP TABLE IF EXISTS clientes");

  await initDB(); // recria as tabelas

  await db.run("INSERT INTO categorias (nome) VALUES (?)", ["Bebidas"]);
  await db.run("INSERT INTO categorias (nome) VALUES (?)", ["Pizzas"]);
  await db.run("INSERT INTO categorias (nome) VALUES (?)", ["Sobremesas"]);

  res.json({ message: "Banco de dados resetado e recriado com sucesso" });
});

export default router;