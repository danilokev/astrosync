const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Configura el almacenamiento en disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR;

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    try {
      if (!req.uid) {
        return cb(new Error('Usuario no autenticado'));
      }

      // Genera nombre único
      const uniqueSuffix = `${Date.now()}_${req.uid}_${Math.round(
        Math.random() * 1e9
      )}`;
      const ext = path.extname(file.originalname).toLowerCase();
      const basename = path.basename(file.originalname, ext);
      const finalName = `${basename}_${uniqueSuffix}${ext}`;

      cb(null, finalName);
    } catch (error) {
      // console.error('Error en filename callback:', error.message);
      cb(error);
    }
  },
});

// Filtra solo fotos válidas
const fileFilter = (req, file, cb) => {
  const allowedMimes = process.env.ALLOWED_MIME_TYPES.split(',');
  const ext = path.extname(file.originalname).toLocaleLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

  if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
    return cb(new Error('Solo se permiten fotos (JPG, PNG, WebP)'), false);
  }

  cb(null, true);
};

// Límites de seguridad
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE),
    files: 1,
  },
});

// Procesa la foto, genera thumbnail y valida
const processUploadedPhoto = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: 'No se ha subido ningún archivo',
    });
  }

  try {
    const inputPath = req.file.path;
    const uploadDir = path.resolve(process.env.UPLOAD_DIR);

    // Extrae el nombre sin extensión del archivo guardado
    const fileName = path.basename(inputPath);
    const fileNameWithoutExt = path.parse(fileName).name;

    // Verifica que el archivo original existe
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo de entrada no encontrado: ${inputPath}`);
    }

    // Comprime la foto original con sharp
    const outputPathWebp = path.join(uploadDir, `${fileNameWithoutExt}.webp`);
    await sharp(inputPath)
      .resize(1920, 1440, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(outputPathWebp);

    // Genera thumbnail
    const thumbWidth = parseInt(process.env.THUMBNAIL_WIDTH);
    const thumbHeight = parseInt(process.env.THUMBNAIL_HEIGHT);
    const outputPathThumb = path.join(
      uploadDir,
      `${fileNameWithoutExt}_thumb.webp`
    );

    await sharp(inputPath)
      .resize(thumbWidth, thumbHeight, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 70 })
      .toFile(outputPathThumb);

    // Elimina archivo original (tenemos la versión WebP)
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    // Pasa información del archivo al siguiente middleware
    req.processedFile = {
      url: `${fileNameWithoutExt}.webp`,
      thumbnail: `${fileNameWithoutExt}_thumb.webp`,
      mimeType: 'image/webp',
    };

    next();
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      ok: false,
      error: 'Error procesando la imagen',
    });
  }
};

module.exports = {
  upload: upload.single('foto'),
  processUploadedPhoto,
};
