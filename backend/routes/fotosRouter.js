const express = require('express');
const ctrl = require('../controllers/fotosController');
const { validateJWT } = require('../middleware/validar-jwt');
const { upload, processUploadedPhoto } = require('../middleware/upload-photos');

const router = express.Router();

router.get('/', validateJWT, ctrl.getFotos);
router.get('/:id', validateJWT, ctrl.getFoto);
router.post('/', validateJWT, upload, processUploadedPhoto, ctrl.createFoto);
router.put('/:id', validateJWT, ctrl.updateFoto);
router.delete('/:id', validateJWT, ctrl.deleteFoto);

module.exports = router;
