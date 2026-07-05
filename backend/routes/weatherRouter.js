const express = require('express');
const {
        getWeatherData,
        getWeatherHour,
        getWeatherEvaluation
    } = require('../controllers/weatherController');
const router = express.Router();

router.route('/').get(getWeatherData);
router.route('/hour').get(getWeatherHour);
router.get('/evaluate', getWeatherEvaluation); // ✅ CORRECTO

module.exports = router;