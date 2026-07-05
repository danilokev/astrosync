const express = require('express');
const ctrl = require('../controllers/localizacionesController');
const { validateJWT } = require('../middleware/validar-jwt');

const router = express.Router();

router.get('/nombre-lugar', ctrl.getNombreLugarEndpoint);
router.get('/', validateJWT, ctrl.getLocalizaciones);
router.post('/', validateJWT, ctrl.createLocalizacion);
router.post('/:id/favorita', validateJWT, ctrl.marcarFavorita);
router.delete('/:id', validateJWT, ctrl.deleteLocalizacion);

module.exports = router;
