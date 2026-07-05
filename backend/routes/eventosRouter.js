const express = require('express');
const router = express.Router();

const {
  getEventos,
  getEvento,
  getProximosEventos,
} = require('../controllers/eventosController');

router.get('/proximos', getProximosEventos);
router.get('/', getEventos);
router.get('/:id', getEvento);

module.exports = router;
