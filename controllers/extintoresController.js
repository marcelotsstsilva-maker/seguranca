const db = require("../db");

// 🔹 Cadastrar Extintor
exports.cadastrarExtintor = async (req, res) => {
  try {
    const { localizacao, cilindro, tipo, peso, recarga, prox_recarga, teste, prox_teste } = req.body;

    if (!localizacao || !cilindro || !tipo) {
      return res.status(400).json({ erro: "Campos obrigatórios não preenchidos." });
    }

    const sql = `
      INSERT INTO extintores 
      (localizacao, cilindro, tipo, peso, recarga, prox_recarga, teste, prox_teste)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      localizacao,
      cilindro,
      tipo,
      peso || null,
      recarga || null,
      prox_recarga || null,
      teste || null,
      prox_teste || null,
    ]);

    res.status(201).json({ sucesso: true, id: result.insertId });
  } catch (err) {
    console.error("❌ Erro ao cadastrar extintor:", err);
    res.status(500).json({ erro: "Erro no servidor" });
  }
};

// 🔹 Listar Extintores
exports.listarExtintores = async (req, res) => {
  try {
    const { busca } = req.query;

    let sql = `
      SELECT idextintor, localizacao, cilindro, tipo, peso, recarga, prox_recarga, teste, prox_teste
      FROM extintores
    `;
    const params = [];

    if (busca) {
      sql += ` WHERE localizacao LIKE ? OR cilindro LIKE ? OR tipo LIKE ?`;
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
    }

    sql += " ORDER BY idextintor DESC";

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao listar extintores:", err);
    res.status(500).json({ erro: "Erro no servidor" });
  }
};

// 🔹 Editar Extintor
exports.editarExtintor = async (req, res) => {
  try {
    const { idextintor } = req.params;
    const { localizacao, cilindro, tipo, peso, recarga, prox_recarga, teste, prox_teste } = req.body;

    const sql = `
      UPDATE extintores
      SET localizacao = ?, cilindro = ?, tipo = ?, peso = ?, recarga = ?, prox_recarga = ?, teste = ?, prox_teste = ?
      WHERE idextintor = ?
    `;

    const [result] = await db.query(sql, [
      localizacao,
      cilindro,
      tipo,
      peso || null,
      recarga || null,
      prox_recarga || null,
      teste || null,
      prox_teste || null,
      idextintor,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: "Extintor não encontrado." });
    }

    res.json({ sucesso: true });
  } catch (err) {
    console.error("❌ Erro ao editar extintor:", err);
    res.status(500).json({ erro: "Erro no servidor" });
  }
};

// 🔹 Excluir Extintor
exports.excluirExtintor = async (req, res) => {
  try {
    const { idextintor } = req.params;

    const sql = "DELETE FROM extintores WHERE idextintor = ?";
    const [result] = await db.query(sql, [idextintor]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: "Extintor não encontrado." });
    }

    res.json({ mensagem: "✅ Extintor excluído com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao excluir extintor:", err);
    res.status(500).json({ erro: "Erro no servidor" });
  }
};
