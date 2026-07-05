const { Router } = require('express');
const { validateJWT } = require('../middleware/validar-jwt');
const { getOverview, getRanking } = require('../controllers/metricsController');

const router = Router();

router.get('/overview', validateJWT, getOverview);
router.get('/ranking', validateJWT, getRanking);

module.exports = router;
