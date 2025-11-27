const express = require("express");
const router = express.Router();

const relatorioExtintoresController = require("../controllers/relatorioExtintoresController");
const protegerRotas = require("../middlewares/authMiddleware");

// 🔹 Gerar Relatório PDF de Extintores
router.get(
  "/relatorio/extintores",
  protegerRotas,
  relatorioExtintoresController.gerarRelatorioExtintores
);

module.exports = router;

