const express = require('express');
const router = express.Router();
const importacionController = require('../controllers/importacionController');

// POST /api/importaciones/recepcion - Registrar la llegada del contenedor y conciliar stock
router.post('/recepcion', importacionController.procesarRecepcionImportacion);

module.exports = router;
