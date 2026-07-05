const express = require("express");
const router = express.Router();
const {
  webhook,
} = require('../controllers/dialogflowController');

// Rutas REST
router.post('/webhook', webhook);

module.exports = router;