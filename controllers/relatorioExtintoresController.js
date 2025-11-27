const db = require("../db");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

// helper – formata "YYYY-MM-DD" → "DD/MM/YYYY"
function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

// ===================== RELATÓRIO PDF EXTINTORES =====================
exports.gerarRelatorioExtintores = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT idextintor, localizacao, cilindro, tipo, peso, recarga, prox_recarga, teste, prox_teste
      FROM extintores
      ORDER BY localizacao ASC, cilindro ASC
    `);

    if (!rows || rows.length === 0) {
      return res.status(200).send("Nenhum extintor cadastrado.");
    }

    // MARGEM DIREITA DE ~3 cm (85 px)
    const doc = new PDFDocument({
      size: "A4",
      margin: { top: 40, left: 40, bottom: 40, right: 85 }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=relatorio_extintores.pdf");

    doc.pipe(res);

    // ================= CABEÇALHO COM LOGO =================
    function gerarCabecalho() {
      const logoPath = path.join(__dirname, "../frontend/Logo.jpg");

      let logoHeight = 40; // 🔥 reduzido para não ocupar espaço demais

      try {
        if (fs.existsSync(logoPath)) {
          const img = doc.openImage(logoPath);

          // Desenha a logo menor
          doc.image(img, 40, 40, { height: logoHeight });
        }
      } catch (e) {
        console.error("Erro ao carregar logo:", e);
      }

      // Move o cursor exatamente abaixo da logo
      doc.y = 40 + logoHeight + 15;

      // Título
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Relatório de Extintores", { align: "center" });

      doc.moveDown(0.5);

      // Linha separadora respeitando margem direita
      doc
        .moveTo(40, doc.y)
        .lineTo(doc.page.width - 85, doc.y)
        .strokeColor("#666")
        .lineWidth(1)
        .stroke();

      doc.moveDown(1);
    }

    gerarCabecalho();

    // Agrupamento por local
    const locais = {};
    rows.forEach((r) => {
      const key = r.localizacao || "SEM LOCALIZAÇÃO";
      if (!locais[key]) locais[key] = [];
      locais[key].push(r);
    });

    // ================= LISTAGEM =================
    for (const local of Object.keys(locais)) {
      if (doc.y > doc.page.height - 140) {
        doc.addPage();
        gerarCabecalho();
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#000")
        .text(`Localização: ${local}`);
      doc.moveDown(0.5);

      const lista = locais[local];
      for (let i = 0; i < lista.length; i++) {
        const r = lista[i];

        // Quebra de página
        if (doc.y > doc.page.height - 120) {
          doc.addPage();
          gerarCabecalho();
          doc
            .font("Helvetica-Bold")
            .fontSize(12)
            .text(`Localização: ${local}`);
          doc.moveDown(0.5);
        }

        // Situação
        let situacao = "SEM DATA";
        let cor = "#555555";
        const hoje = new Date();
        const prox = r.prox_recarga ? new Date(r.prox_recarga) : null;

        if (prox) {
          if (prox < hoje) {
            situacao = "VENCIDO";
            cor = "#C62828";
          } else {
            situacao = "VÁLIDO";
            cor = "#2E7D32";
          }
        }

        // ======================================================
        // 🔥 BLOCO DE CAMPOS COM ESPAÇAMENTO MAIOR
        // ======================================================

        doc.font("Helvetica-Bold").fontSize(10).text(`${i + 1}. Extintor: `, { continued: true });
        doc.font("Helvetica").fontSize(10).text(r.cilindro || "Não informado");
        doc.moveDown(0.4);

        doc.font("Helvetica-Bold").text("Tipo: ", { continued: true });
        doc.font("Helvetica").text(r.tipo || "-");
        doc.moveDown(0.4);

        doc.font("Helvetica-Bold").text("Peso: ", { continued: true });
        doc.font("Helvetica").text(r.peso ? `${r.peso} kg` : "-");
        doc.moveDown(0.4);

        const rec = formatDate(r.recarga);
        const pr = formatDate(r.prox_recarga);
        const tst = formatDate(r.teste);

        doc.font("Helvetica-Bold").text("Recarga: ", { continued: true });
        doc.font("Helvetica").text(rec || "-", { continued: true });

        doc.font("Helvetica-Bold").text("   Próx. Recarga: ", { continued: true });
        doc.font("Helvetica").text(pr || "-", { continued: true });

        doc.font("Helvetica-Bold").text("   Teste Hidrostático: ", { continued: true });
        doc.font("Helvetica").text(tst || "-");

        doc.moveDown(0.4);

        doc.font("Helvetica-Bold").text("Situação: ", { continued: true });
        doc.fillColor(cor).font("Helvetica-Bold").text(situacao);
        doc.fillColor("#000");

        // Linha separadora — respeitando margem de 3 cm
        doc.moveDown(0.8);
        const y = doc.y;
        doc
          .moveTo(40, y)
          .lineTo(doc.page.width - 85, y)
          .strokeColor("#e0e0e0")
          .lineWidth(1)
          .stroke();
        doc.moveDown(1);
      }

      doc.moveDown(1);
    }

    doc.end();
  } catch (err) {
    console.error("❌ Erro ao gerar relatório de extintores:", err);
    if (!res.headersSent) {
      res.status(500).json({ erro: "Erro no servidor", detalhes: err.message });
    }
  }
};
