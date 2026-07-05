const express = require('express');
const multer = require('multer');
const {
  getStars,
  importStars,
  searchStars,
} = require('../controllers/starController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.route('/').get(getStars);
router.route('/search').get(searchStars);
router.route('/import').post(upload.single('file'), importStars);

module.exports = router;
