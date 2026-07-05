const express = require('express');
const {
  getCelestialInfo,
  getCuerpoCelesteInfo,
} = require('../controllers/celestialController');
const router = express.Router();

router.route('/star').get(getCelestialInfo);
router.route('/cuerpo').get(getCuerpoCelesteInfo);

module.exports = router;
