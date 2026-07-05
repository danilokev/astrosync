const Constelaciones = require('../models/constelaciones');
const formats_utils = require('../utils/formats_utils');

const SUPPORTED_FORMATS = new Set(['pdf', 'epub', 'html', 'xml']);

// Normaliza una URL a formato absoluto usando el origen de la solicitud si es necesario
function normalizeToAbsoluteUrl(value, origin) {
  if (!value) return '';

  // Ya es URL absoluta (http/https)
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // Si no tenemos origen, devolvemos el valor original
  if (!origin) {
    return value;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;

  try {
    return new URL(normalizedPath, origin).toString();
  } catch {
    return value;
  }
}

function mimeByFormat(format) {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'epub':
      return 'application/epub+zip';
    case 'html':
      return 'text/html; charset=utf-8';
    case 'xml':
      return 'application/xml; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function fileNameByFormat(format, title) {
  return `${title}.${format}`;
}

// Buscar constelación por su código
exports.getConstelacionByCode = async (req, res) => {
  try {
    const code = req.params.code;
    const { format } = req.query;
    const constelacion = await Constelaciones.findOne({
      code: { $regex: `^${code}$`, $options: 'i' }, // ignore case
    }).lean();

    if (!constelacion) {
      return res
        .status(404)
        .json({ message: `Constelación con code '${code}' no encontrada` });
    }

    if (format) {
      if (!SUPPORTED_FORMATS.has(format)) {
        return res.status(400).json({
          error: `Formato no soportado: ${format}. Usa pdf, epub, html o xml.`,
        });
      }

      const json = {
        label: constelacion.label || '',
        wikidataImage: constelacion.wikidataImage || '',
        wikidataImageFileUrl: constelacion.wikidataImageFileUrl || '',
        wikipediaUrl: constelacion.wikipediaUrl || '',
        extract: constelacion.extract || '',
        wikidataLicense: constelacion.wikidataLicense || {},
      };

      // Algunas constelaciones usan rutas relativas (assets/...).
      // El backend necesita URL absoluta para poder descargarlas al generar PDF/ePub.
      const requestOrigin = req.get('origin') || process.env.FRONTEND_URL || '';
      json.wikidataImage = normalizeToAbsoluteUrl(
        json.wikidataImage,
        requestOrigin,
      );
      json.wikidataImageFileUrl = normalizeToAbsoluteUrl(
        json.wikidataImageFileUrl,
        requestOrigin,
      );

      const buffer = await formats_utils.generateAllFormats(json, format);

      res.setHeader('Content-Type', mimeByFormat(format));
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileNameByFormat(format, json.label)}"`,
      );

      return res.send(buffer);
    }

    return res.json(constelacion);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error del servidor' });
  }

};

// GET /constelaciones/search?term=cen
exports.searchConstelaciones = async (req, res) => {
  const { term = '' } = req.query;

  const results = await Constelaciones.find({
    $or: [
      { label: { $regex: term, $options: 'i' } },
      { code: { $regex: term, $options: 'i' } }
    ]
  }).limit(10);

  res.json({
    success: true,
    data: results
  });
};
