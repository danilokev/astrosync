const express = require('express');
const router = express.Router();
const {
  getCuerpos,
  getCuerpoById,
  createCuerpo,
  updateCuerpo,
  updateCuerpoFoto,
  deleteCuerpo,
  searchCuerposCelestes
} = require('../controllers/cuerposCelestesController');

router.get('/search', searchCuerposCelestes);

// Rutas REST
router.get('/', getCuerpos);
router.get('/:id', getCuerpoById);
router.post('/', createCuerpo);
router.put('/:id', updateCuerpo);
router.put('/foto/:id', updateCuerpoFoto);
router.delete('/:id', deleteCuerpo);


module.exports = router;
