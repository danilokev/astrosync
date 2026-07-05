const fetch = require('node-fetch');
const Localizacion = require('../models/localizaciones');

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getNombreLugar = async (lat, lon, intento = 1) => {
  const MAX_INTENTOS = 3;
  const DELAY_BASE = 1000; // 1 segundo

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1&namedetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AstroSync/1.0',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        Accept: 'application/json',
        Referer: 'https://www.astrosync.ovh/',
      },
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(
        `Respuesta inválida: Content-Type es ${contentType}, se esperaba JSON`,
      );
    }

    const data = await response.json();

    if (!data || typeof data !== 'object') {
      throw new Error('Respuesta vacía o inválida de Nominatim');
    }

    const nombre =
      data.namedetails?.['name:es'] ||
      data.namedetails?.['official_name:es'] ||
      data.namedetails?.['name:en'] ||
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.county ||
      data.address?.state ||
      data.address?.country;
    if (nombre) {
      const esCirilico = /[\u0400-\u04FF]/.test(nombre);
      if (esCirilico) {
        const { transliterate } = require('transliteration');
        nombre = transliterate(nombre);
      }
    }

    return nombre || `Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}`;
  } catch (err) {
    // console.error(
    //   `[Intento ${intento}/${MAX_INTENTOS}] Error en geocoding inverso:`,
    //   err.message,
    // );

    if (intento < MAX_INTENTOS) {
      const delayMs = DELAY_BASE * Math.pow(2, intento - 1);
      // console.log(`Reintentando en ${delayMs}ms...`);
      await esperar(delayMs);
      return getNombreLugar(lat, lon, intento + 1);
    }

    const fallback = `Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}`;
    // console.warn(`Usando fallback: ${fallback}`);
    return fallback;
  }
};

const getNombreLugarEndpoint = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Latitud y longitud inválidas',
        detalles: 'Se requieren valores numéricos válidos',
      });
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        error: 'Coordenadas fuera de rango',
        detalles: 'Latitud: -90 a 90, Longitud: -180 a 180',
      });
    }

    const nombre = await getNombreLugar(latitude, longitude);
    res.json({ nombre });
  } catch (err) {
    // console.error('Error en endpoint nombre-lugar:', err);
    res.status(500).json({
      error: 'Error al obtener el nombre del lugar',
      detalles: 'Por favor, intenta de nuevo más tarde',
    });
  }
};

const getLocalizaciones = async (req, res) => {
  try {
    const { favoritas } = req.query;

    const filtro = {
      usuario: req.uid,
    };

    if (favoritas === 'true') {
      filtro.favorita = true;
    }

    const localizaciones = await Localizacion.find(filtro).sort({
      createdAt: -1,
    });

    res.json(localizaciones);
  } catch (err) {
    // console.error('Error al obtener localizaciones:', err);
    res.status(500).json({ error: 'Error al obtener las localizaciones' });
  }
};

const createLocalizacion = async (req, res) => {
  try {
    if (!req.uid) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { latitud, longitud } = req.body;
    const lat = Number(latitud);
    const lon = Number(longitud);

    if (isNaN(lat) || isNaN(lon)) {
      return res
        .status(400)
        .json({ error: 'Latitud y longitud deben ser números válidos' });
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res
        .status(400)
        .json({ error: 'Coordenadas fuera de rango válido' });
    }

    const usuarioId = req.uid;
    const nombre = await getNombreLugar(lat, lon);

    const existe = await Localizacion.findOne({
      usuario: usuarioId,
      latitud: lat,
      longitud: lon,
    });

    if (existe) {
      return res
        .status(409)
        .json({ error: 'Esta localización ya está guardada' });
    }

    const nueva = new Localizacion({
      nombre,
      latitud: lat,
      longitud: lon,
      favorita: true,
      usuario: usuarioId,
    });

    await nueva.save();
    res.status(201).json(nueva);
  } catch (err) {
    // console.error('Error al crear localización:', err);
    res.status(500).json({ error: 'Error al crear la localización' });
  }
};

const marcarFavorita = async (req, res) => {
  try {
    const loc = await Localizacion.findOne({
      _id: req.params.id,
      usuario: req.uid,
    });

    if (!loc) {
      return res.status(404).json({ error: 'Localización no encontrada' });
    }

    loc.favorita = !loc.favorita;
    await loc.save();
    res.json(loc);
  } catch (err) {
    // console.error('Error al marcar como favorita:', err);
    res.status(400).json({ error: 'Error al marcar como favorita' });
  }
};

const deleteLocalizacion = async (req, res) => {
  try {
    const loc = await Localizacion.findOneAndDelete({
      _id: req.params.id,
      usuario: req.uid,
    });

    if (!loc) {
      return res.status(404).json({ error: 'Localización no encontrada' });
    }

    res.json({ message: 'Localización eliminada' });
  } catch (err) {
    // console.error('Error al eliminar la localización:', err);
    res.status(400).json({ error: 'Error al eliminar la localización' });
  }
};

module.exports = {
  getLocalizaciones,
  createLocalizacion,
  marcarFavorita,
  deleteLocalizacion,
  getNombreLugarEndpoint,
};
