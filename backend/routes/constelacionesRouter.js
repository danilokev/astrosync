const express = require('express');
const router = express.Router();
const constelacionesController = require('../controllers/constelacionesController');

// Ruta para obtener constelación por code

// ✅ PRIMERO las rutas específicas
router.get('/search', constelacionesController.searchConstelaciones);

// Ejemplo de uso: GET /api/constelaciones/For
router.get('/:code', constelacionesController.getConstelacionByCode);



module.exports = router;