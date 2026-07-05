const Star = require('../models/stars');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
/*import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';*/

// Sin optimización es una MUERTE
/*const getStars = async (req, res) => {
    try {
        const stars = await Star.find({});

        res.status(200).json({
            success: true,
            count: stars.length,
            data: stars
        });
    } 
    catch (error) {
        console.error('Stars API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}*/

/*const getStars = async (req, res) => {
    const { raMin, raMax, decMin, decMax } = req.query;

    const query = {
        ra: { $gte: Number(raMin), $lte: Number(raMax) },
        dec: { $gte: Number(decMin), $lte: Number(decMax) }
    };

    const stars = await Star.find(query).limit(5000);

    res.json({ success: true, count: stars.length, data: stars });
};*/

//GET /api/stars?limit=2000&skip=0
/*const getStars = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 2000;
        const skip = parseInt(req.query.skip) || 0;

        const stars = await Star.find({})
            .limit(limit)
            .skip(skip)
            .select('ra dec mag ci proper con bayer');

        res.json({
            success: true,
            count: stars.length,
            data: stars
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};*/

// Obtener todas las estrellas dentro del rango de magnitud y del área del cielo concreta
/*const getStars = async (req, res) => {
    try {
        const {
            raMin, raMax,
            decMin, decMax,
            magMax
        } = req.query;

        // Creamos filtros
        const query = {};

        if (raMin && raMax) {
            query.ra = { $gte: Number(raMin), $lte: Number(raMax) };
        }

        if (decMin && decMax) {
            query.dec = { $gte: Number(decMin), $lte: Number(decMax) };
        }

        if (magMax) {
            query.mag = { $lte: Number(magMax) };
        }

        // Solo los campos necesarios
        const stars = await Star.find(query)
            .select('ra dec mag ci proper con bayer')
            // .limit(5000)
            .sort({ mag: 1 }); // ordenar por magnitud

        res.json(stars);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};*/

// GET /stars?ra=40&dec=20&radius=25&magMax=10&limit=500
// OR
// GET /stars?magMax=6&limit=1000

const MAX_LIMIT = 50000;
const DEFAULT_LIMIT = 5000;
const SAFETY_LIMIT_RECT = 200000;

const getStars = async (req, res) => {
  try {
    const {
      ra: raq,
      dec: decq,
      radius: radiusq,
      magMax: magMaxq,
      limit: limitq,
      sort, // optional: 'mag' or '-mag' etc.
    } = req.query;

    const magMax = magMaxq !== undefined ? Number(magMaxq) : undefined;
    let limit = limitq ? Math.min(Number(limitq), MAX_LIMIT) : undefined;

    if (limit === undefined) {
      limit =
        raq === undefined && decq === undefined && radiusq === undefined
          ? DEFAULT_LIMIT
          : 10000;
    }
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({ error: 'Invalid limit' });
    }

    // Mongo query
    const query = {};

    if (magMax !== undefined) {
      if (isNaN(magMax))
        return res.status(400).json({ error: 'Invalid magMax' });
      query.mag = { $lte: magMax };
    }

    if (raq === undefined || decq === undefined || radiusq === undefined) {
      const stars = await Star.find(query)
        .select('hip hd hr gl bf ra dec mag dist ci proper con bayer spect')
        .sort(sort ? sort : { mag: 1 })
        .limit(limit)
        .lean();

      return res.json(stars);
    }

    const ra = Number(raq);
    const dec = Number(decq);
    const radius = Number(radiusq);

    if ([ra, dec, radius].some((v) => Number.isNaN(v))) {
      return res.status(400).json({ error: 'Invalid ra/dec/radius' });
    }
    if (radius <= 0 || radius > 180) {
      return res
        .status(400)
        .json({ error: 'radius must be between 0 and 180 degrees' });
    }

    const decMin = dec - radius;
    const decMax = dec + radius;

    const raCenter = ((ra % 360) + 360) % 360;
    let raMin = raCenter - radius;
    let raMax = raCenter + radius;
    raMin = ((raMin % 360) + 360) % 360;
    raMax = ((raMax % 360) + 360) % 360;

    query.dec = { $gte: decMin, $lte: decMax };

    if (raMin < raMax) {
      query.ra = { $gte: raMin, $lte: raMax };
    } else {
      query.$or = [{ ra: { $gte: raMin } }, { ra: { $lte: raMax } }];
    }

    let preStars = await Star.find(query)
      .select('hip hd hr gl ra dec mag ci proper con bayer ')
      .sort(sort ? sort : { mag: 1 })
      .limit(SAFETY_LIMIT_RECT)
      .lean();

    const raRad = (raCenter * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;
    const radiusRad = (radius * Math.PI) / 180;
    const cosRadius = Math.cos(radiusRad);

    const filtered = [];
    for (const s of preStars) {
      // Pasar RA/Dec a radianes
      const ra2 = ((((s.ra % 360) + 360) % 360) * Math.PI) / 180;
      const dec2 = (s.dec * Math.PI) / 180;

      // cos(dist) = sin(dec1)sin(dec2) + cos(dec1)cos(dec2)cos(ra1-ra2)
      const cosDist =
        Math.sin(decRad) * Math.sin(dec2) +
        Math.cos(decRad) * Math.cos(dec2) * Math.cos(raRad - ra2);

      if (cosDist >= cosRadius) {
        filtered.push(s);
        if (filtered.length >= limit) break;
      }
    }

    return res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Importar el catálogo en la base de datos
const importStars = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv()) // csv a objetos
    .on('data', (data) => {
      results.push(data);
    })
    .on('end', async () => {
      try {
        // Se puede añadir filtrado/validación
        // Ejemplo: comprobamos que hay email, nombre
        //const validUsers = results.filter(
        //  u => u.email && u.nombre && u.apellidos
        //);

        // Insertamos en MongoDB
        await Star.deleteMany({});
        await Star.insertMany(results);

        // Eliminamos el fichero temporal
        fs.unlinkSync(req.file.path);

        res.json({
          message: 'CSV cargado exitosamente',
          inserted: results.length,
        });
      } catch (error) {
        console.error(error);
        fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error al guardar en DB' });
      }
    });
};

// Búsqueda de estrellas
const searchStars = async (req, res) => {
  try {
    const { term = '', limit = 5, skip = 0 } = req.query;

    if (!term || typeof term !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'El término de búsqueda es obligatorio',
      });
    }

    const sanitizedTerm = term.trim();

    if (sanitizedTerm.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El término debe tener al menos 2 caracteres',
      });
    }

    if (sanitizedTerm.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Longitud máxima superada',
      });
    }

    // Expresión regular para búsqueda insensible a mayúsculas
    const regex = new RegExp(term, 'i');

    const query = {
      $or: [{ proper: regex }, { bf: regex }],
    };

    // Obtiene el total de coincidencias
    const totalCount = await Star.countDocuments(query);

    // Búsqueda, orden por magnitud + paginación
    const stars = await Star.find(query)
      .sort({ mag: 1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      total: totalCount,
      data: stars,
    });
  } catch (error) {
    console.error('Error en searchStars:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor al buscar estrellas',
    });
  }
};

/*// Para guardar el progreso de importación del catálogo
let importProgress = {
  status: 'idle', // idle | processing | done | error
  progress: 0
};

// Importar el catálogo en la base de datos
const importStars = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  importProgress.status = 'processing';
  importProgress.progress = 0;

  // Respondemos inmediatamente
  res.json({ message: 'Import started' });

  // Procesamos
  processCsv(req.file.path);
};

// Procesamos CSV
const processCsv = async (filePath) => {
  try {
    const rows = [];
    let total = 0;
    let processed = 0;

    // Calculamos líneas
    await new Promise(resolve => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', () => total++)
        .on('end', resolve);
    });

    await Star.deleteMany({});

    // Procesado + progreso
    await new Promise(resolve => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
          rows.push(row);
        })
        .on('end', async () => {
          for (const row of rows) {
            await Star.create(row);
            processed++;

            importProgress.progress = Math.round(
              (processed / total) * 100
            );
          }

          importProgress.status = 'done';
          importProgress.progress = 100;
          fs.unlinkSync(filePath);
          resolve();
        });
    });

  } catch (err) {
    console.error(err);
    importProgress.status = 'error';
  }
};

// Obtener progreso de imporación del catálogo
const getImportProgress = (req, res) => {
  res.json(importProgress);
};*/

module.exports = {
  getStars,
  importStars,
  searchStars,
};
