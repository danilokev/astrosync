const express = require('express');
const ctrl = require('../controllers/suscripcionController');

const router = express.Router();

router.post('/', ctrl.createSuscripcion);
router.delete('/:id', ctrl.deleteSuscripcion);

module.exports = router;
