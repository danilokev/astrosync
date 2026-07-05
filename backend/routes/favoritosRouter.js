const express = require('express');
const ctrl = require('../controllers/favoritosController');
const { validateJWT }  = require('../middleware/validar-jwt'); 

const router = express.Router();

// Ruta para obtener favoritos
router.get('/', validateJWT, ctrl.getFavoritos);

// Ruta para agregar favorito
router.post('/', validateJWT, ctrl.addFavorito);

// Ruta para eliminar favorito
router.delete('/:id', validateJWT, ctrl.deleteFavorito);

module.exports = router;