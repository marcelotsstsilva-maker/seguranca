// 📁 cron/verificarExtintores.js
require("dotenv").config();
const db = require("../db");
const enviarEmail = require("../utils/mailer");
const cron = require("node-cron");

// --- Função segura para normalizar datas vindas do MySQL ---
function normalizarData(d) {
  if (!d) return null;
  const data = new Date(d);
  if (isNaN(data)) return null;
  return data.toISOString().split("T")[0];
}

// 🔹 Busca extintores com recarga vencida ou próxima do vencimento no mês
async function buscarExtintoresVencidosOuProximos() {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const inicio = primeiroDia.toISOString().split("T")[0];
  const fim = ultimoDia.toISOString().split("T")[0];

  const [rows] = await db.query(
    `
    SELECT localizacao, cilindro, tipo, peso, recarga, prox_recarga
    FROM extintores
    WHERE 
      prox_recarga IS NOT NULL AND (DATE(prox_recarga) < ? OR DATE(prox_recarga) BETWEEN ? AND ?)
    ORDER BY localizacao ASC, cilindro ASC
    `,
    [inicio, inicio, fim]
  );

  return rows;
}

// 🔹 Converte data (YYYY-MM-DD → DD/MM/YYYY)
function formatarDataLocal(dataISO) {
  if (!dataISO) return "-";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

// 🔹 Dispara e-mails
async function dispararEmailsExtintores() {
  try {
    const hoje = new Date();
    const extintores = await buscarExtintoresVencidosOuProximos();

    if (extintores.length === 0) {
      console.log("✅ Nenhum extintor com recarga vencida ou próxima do vencimento neste mês.");
      return;
    }

    const [usuarios] = await db.query(`
      SELECT nome, email 
      FROM usuario 
      WHERE email IS NOT NULL AND email != ''
    `);

    if (!usuarios.length) {
      console.log("⚠️ Nenhum usuário com e-mail cadastrado para notificação.");
      return;
    }

    // Montagem da tabela HTML
    const linhas = extintores
      .map((e) => {
        const recargaISO = normalizarData(e.prox_recarga);
        const recarga = recargaISO ? formatarDataLocal(recargaISO) : "-";

        const hojeLimpo = new Date();
        hojeLimpo.setHours(0, 0, 0, 0);

        let statusRecarga = "✅ VÁLIDO";
        if (e.prox_recarga) {
          const dataRecarga = new Date(e.prox_recarga);
          dataRecarga.setHours(0, 0, 0, 0);

          const diasRecarga =
            Math.floor((dataRecarga - hojeLimpo) / (1000 * 60 * 60 * 24));

          statusRecarga =
            diasRecarga < 0
              ? "🔴 RECARGA VENCIDA"
              : `🟠 Próxima recarga em ${diasRecarga} dia${diasRecarga !== 1 ? "s" : ""}`;
        }

        return `
          <tr>
            <td>${e.localizacao}</td>
            <td>${e.cilindro}</td>
            <td>${e.tipo}</td>
            <td>${e.peso ? e.peso + " kg" : "-"}</td>
            <td>${recarga}</td>
            <td>${statusRecarga}</td>
          </tr>
        `;
      })
      .join("");

    const mesAno = hoje.toLocaleString("pt-BR", {
      month: "long",
      year: "numeric",
    });

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #1565c0; text-align: center;">
          🧯 Relatório Mensal de Extintores com Recarga Vencida ou Próxima (${mesAno})
        </h2>
        <p>Segue a lista dos extintores cuja <b>recarga</b> está <b>vencida</b> ou vencerá durante o mês de <b>${mesAno}</b>:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead style="background-color: #1976d2; color: white;">
            <tr>
              <th style="padding: 8px; border: 1px solid #ccc;">Localização</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Extintor</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Tipo</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Peso</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Próx. Recarga</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Status</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>

        <p style="margin-top:20px;">Favor verificar e providenciar a manutenção quando necessário.</p>
        <p style="color:#555;">Atenciosamente,<br><strong>Equipe de Segurança do Trabalho</strong></p>
      </div>
    `;

    // Envia os e-mails com intervalo de 5 segundos
    for (const [index, u] of usuarios.entries()) {
      if (index > 0) await new Promise((r) => setTimeout(r, 5000));

      try {
        const resposta = await enviarEmail({
          to: u.email,
          subject: `🧯 Relatório Mensal - Extintores com recarga vencida ou próxima (${mesAno})`,
          html,
        });

        console.log(
          `📧 E-mail enviado para: ${u.nome} (${u.email}) →`,
          resposta.Messages?.[0]?.Status || "OK"
        );
      } catch (err) {
        console.error(`❌ Erro ao enviar para ${u.email}:`, err.message);
      }
    }

    console.log("✅ Envio concluído!");
  } catch (err) {
    console.error("❌ Erro ao verificar/disparar e-mails:", err);
  }
}

// 🔹 Agenda mensal
cron.schedule("0 8 1 * *", async () => {
  console.log("⏰ Executando rotina mensal de extintores...");
  await dispararEmailsExtintores();
});

module.exports = { dispararEmailsExtintores };
