const express = require("express");
const router = express.Router();
const extintorController = require("../controllers/extintoresController");
console.log("🧭 Controller carregado de:", require.resolve("../controllers/extintoresController"));
const protegerRotas = require("../middlewares/authMiddleware");

// 🔹 Rotas de Extintores (todas protegidas)
router.post("/extintor", protegerRotas, extintorController.cadastrarExtintor);
router.get("/extintor", protegerRotas, extintorController.listarExtintores);
router.put("/extintor/:idextintor", protegerRotas, extintorController.editarExtintor);
router.delete("/extintor/:idextintor", protegerRotas, extintorController.excluirExtintor);

module.exports = router;
