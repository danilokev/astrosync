const express = require('express');
const router = express.Router();
const {
  getUsuarios,
  getUsuarioById,
  deleteUsuario,
  putUsuario
} = require('../controllers/usuariosController');

// Rutas
router.get('/', getUsuarios);
router.get('/:id', getUsuarioById);
router.put('/:id', putUsuario);
router.delete('/:id', deleteUsuario);

module.exports = router;
