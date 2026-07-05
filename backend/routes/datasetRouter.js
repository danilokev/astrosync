const express = require('express');
const {
        generateDatasetCustom,
        generateDatasetPole,
        getConstellationCSV,
        generateConstellationCSV
    } = require('../controllers/datasetController');
const router = express.Router();

router.route('/custom').get(generateDatasetCustom);
router.route('/pole').get(generateDatasetPole);
router.route('/constellations/generate').get(generateConstellationCSV); // cambiar a POST
router.route('/constellations').get(getConstellationCSV);

module.exports = router;