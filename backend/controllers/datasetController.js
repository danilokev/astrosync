//https://creativecommons.org/licenses/by-sa/4.0/
const Astronomy = require('astronomy-engine');
const Star = require('../models/stars');
const { parse } = require('json2csv');
const path = require("path");
const fs = require('fs');



// Filtrar estrellas y generar CSV
const generateCsvForStars = async (latitude, longitude, date) => {
  const observer = new Astronomy.Observer(latitude, longitude, 0);

  // Declinación máxima y mínima según el polo
  const dRange = decRange(latitude);

  // Prefiltrado de estrellas visibles
  const candidates = await Star.find({
    mag: { $lte: 7 },
    dec: { $gte: Math.max(-90, dRange.min), $lte: Math.min(90, dRange.max) },
    proper: { $ne: "Sol" }
  }).lean();

  console.log(candidates.length);

  // Array de estrellas visibles
  const visibleStars = [];

  // Calculamos visibilidad para cada estrella
  var cont = 1;
  candidates.forEach(star => {
    const data = findRiseSet(observer, star.ra, star.dec, date);
    if (data.visible) {
      visibleStars.push({
        id: cont,
        hip: star.hip,
        hd: star.hd,
        hr: star.hr,
        gl: star.gl,
        bf: star.bf,
        proper: star.proper,
        ra: star.ra,
        dec: star.dec,
        dist: star.dist,
        pmra: star.pmra,
        pmdec: star.pmdec,
        rv: star.rv,
        mag: star.mag,
        absmag: star.absmag,
        spect: star.spect,
        ci: star.ci,
        rarad: star.rarad,
        decrad: star.decrad,
        pmrarad: star.pmrarad,
        pmdecrad: star.pmdecrad,
        bayer: star.bayer,
        flam: star.flam,
        con: star.con,
        comp: star.comp,
        comp_primary: star.comp_primary,
        base: star.base,
        lum: star.lum,
        var: star.var,
        var_min: star.var_min,
        var_max: star.var_max,
        startTime: data.rise,
        endTime: data.set
      });
    }
    cont++;
  });

  // Generar CSV
  if (!visibleStars || visibleStars.length === 0) {
    return null;
  }

  const csv = parse(visibleStars);
  return csv;
}


// Devuelve un CSV de estrellas visibles desde la localización indicada en una fecha indicada
const generateDatasetCustom  = async (req, res) => {
  try {
    const { lat, long, date } = req.query;

    // Comprobamoms si los parámetros existen
    if (!lat || !long || !date) {
      return res.status(400).json({ error: "Missing required query parameters: lat, long, date" });
    }

    // Comprobamos las coordenadas
    const latitude = Number(lat);
    const longitude = Number(long);
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: "lat and long must be valid numbers" });
    }

    // Comprobamos la fecha
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Date must be a valid date (format: yyyy-mm-dd)" });
    }

    // Generar CSV
    const csvData = await generateCsvForStars(latitude, longitude, parsedDate);

    if (!csvData){
      res.status(404).send("No stars visible for the given location and date.");
    }

    // Envío de CSV al cliente
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stars_${latitude}_${longitude}_${date}.csv"`,
    );
    res.send(csvData);

    //await generateCsvForStars(latitude, longitude, parsedDate, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


// Devuelve un CSV de estrellas visibles desde la localización indicada en una fecha indicada
const generateDatasetPole  = async (req, res) => {
  try {
    // Prefiltrado de estrellas visibles
    const candidates = await Star.find(/*{
      mag: { $lte: 7 },
      dec: { $gte: Math.max(-90, dRange.min), $lte: Math.min(90, dRange.max) },
      proper: { $ne: "Sol" }
    }*/).lean();

    console.log(candidates.length);
    
    var cont = 0;
    const enriched = candidates.map(star => {
      const { pole, distanceDeg } = polarInfo(star.dec);

      return {
        id: cont++,
        hip: star.hip,
        hd: star.hd,
        hr: star.hr,
        gl: star.gl,
        bf: star.bf,
        proper: star.proper,
        ra: star.ra,
        dec: star.dec,
        dist: star.dist,
        pmra: star.pmra,
        pmdec: star.pmdec,
        rv: star.rv,
        mag: star.mag,
        absmag: star.absmag,
        spect: star.spect,
        ci: star.ci,
        rarad: star.rarad,
        decrad: star.decrad,
        pmrarad: star.pmrarad,
        pmdecrad: star.pmdecrad,
        bayer: star.bayer,
        flam: star.flam,
        con: star.con,
        comp: star.comp,
        comp_primary: star.comp_primary,
        base: star.base,
        lum: star.lum,
        var: star.var,
        var_min: star.var_min,
        var_max: star.var_max,
        pole: pole,
        pole_dist_deg: distanceDeg
      };
    });

    const csv = parse(enriched);

    if (!csv){
      res.status(404).send("No stars visible for the given location and date.");
    }

    // Envío de CSV al cliente
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stars_poles.csv"`,
    );
    res.send(csvData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


// Calcular tiempo de salida y puesta de la estrella
function findRiseSet(observer, ra, dec, date) {
  const step = 1 * 60 * 1000; // calcular para cada minuto
  let rise = null;
  let set = null;
  let antSet = null;
  let aboveHorizon = false;
  let visible = false;

  // Calculamos fecha-tiempo de inicio y final
  const start = new Date(date);
  start.setDate(start.getDate());
  const end = new Date(date);
  end.setDate(end.getDate() + 2);

  // Comprobar si es circumpolar
  if(isCircumpolar(dec, observer.latitude)) {
    return { rise: null, set: null, visible: true };
  }

  // Buscar puesta anterior
  for (let t = start.getTime(); t < end.getTime(); t += step) {
    const time = new Date(t);
    const hor = Astronomy.Horizon(time, observer, ra, dec, 'normal');

    if (hor.altitude > 0) {
      aboveHorizon = true;
    } else {
      if (aboveHorizon) {
        antSet = new Date(time);
        break;
      }
      aboveHorizon = false;
    }
  }

  if (!antSet){
    return { rise, set, visible };
  }

  visible = true;
  aboveHorizon = false;

  // Buscar salida y puesta actuales
  for (let t = antSet.getTime(); t < end.getTime(); t += step) {
    const time = new Date(t);
    const hor = Astronomy.Horizon(time, observer, ra, dec, 'normal');

    if (hor.altitude > 0) {
      if (!aboveHorizon) rise = new Date(time);
      aboveHorizon = true;
    } else {
      if (aboveHorizon) {
        set = new Date(time);
        break;
      }
      aboveHorizon = false;
    }
  }

  return { rise, set, visible };
}


// Comprobar si la estrella es circumpolar
function isCircumpolar(dec, lat) {
  if (lat >= 0) return dec >= (90 - lat); // Polo norte
  else return dec <= (-90 - lat); // Polo sur
}


// Rango de declinación
function decRange(lat) {
  if (lat >= 0) return { min: lat - 90, max: 90 }; // Polo norte
  else return { min: -90, max: lat + 90 }; // Polo sur
}


// Determinar el polo al que pertenece la estrella
function polarInfo(dec) {
  if (dec < -90 || dec > 90 || Number.isNaN(dec)) {
    throw new Error("Dec must be in range [-90, +90]");
  }

  const distNorth = 90 - dec;
  const distSouth = 90 + dec;

  const pole = distNorth < distSouth ? "north" : "south";
  const distanceDeg = Math.min(distNorth, distSouth);

  return {
    pole,              // "north" | "south"
    distanceDeg,       // distancia angular al polo
  };
}


// Devolver el dataset de constelaciones
const getConstellationCSV = async (req, res) => {
  const filePath = path.join(__dirname, "..", "data", "constellation_stars.csv");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="constellation_stars.csv"'
  );

  res.sendFile(filePath);
}


const generateConstellationCSV = async (req, res) => {
  try {

    const linesPath = path.join(
      __dirname,
      "..",
      "data",
      "ConstellationLines.csv"
    );

    const filePath = path.join(
      __dirname,
      "..",
      "data",
      "constellation_stars.csv"
    );

    // ========= READ SOURCE CSV =========

    const content = fs.readFileSync(linesPath, "utf-8");

    const rows = content
      .trim()
      .split("\n")
      .slice(1);

    // ========= CONVERT TO LONG FORMAT =========

    const result = [];

    const constellationCounters = {};

    rows.forEach((row) => {

      const cols = row
        .split(",")
        .map(c => c.trim());

      const constellation = cols[0];

      if (!constellationCounters[constellation]) {
        constellationCounters[constellation] = 1;
      }

      const figure_id =
        constellationCounters[constellation]++;

      const stars = cols.slice(2);

      stars.forEach((star_ref, index) => {

        const hr = Number(star_ref);

        if (!hr || Number.isNaN(hr)) return;

        result.push({
          constellation,
          figure_id,
          order: index + 1,
          hr
        });
      });
    });

    console.log("Parsed stars:", result.length);

    // ========= UNIQUE HR =========

    const uniqueRefs = [
      ...new Set(result.map(r => r.hr))
    ];

    console.log("Unique HR:", uniqueRefs.length);

    // ========= LOAD STARS =========

    const stars = await Star.find({
      hr: { $in: uniqueRefs }
    }).lean();

    console.log("Stars found:", stars.length);

    // ========= INDEX =========

    const starMap = new Map();

    stars.forEach(star => {
      starMap.set(star.hr, star);
    });

    // ========= BUILD CSV =========

    const enriched = [];

    result.forEach(line => {

      const star = starMap.get(line.hr);

      if (!star) {
        console.log("Missing HR:", line.hr);
        return;
      }

      const { pole, distanceDeg } =
        polarInfo(star.dec);

      enriched.push({

        constellation: line.constellation,
        figure_id: line.figure_id,
        order: line.order,

        hip: star.hip,
        hd: star.hd,
        hr: star.hr,
        gl: star.gl,

        bf: star.bf,
        proper: star.proper,

        ra: star.ra,
        dec: star.dec,

        dist: star.dist,

        pmra: star.pmra,
        pmdec: star.pmdec,

        mag: star.mag,

        spect: star.spect,
        ci: star.ci,

        bayer: star.bayer,
        flam: star.flam,
        con: star.con,

        pole,
        pole_dist_deg: distanceDeg
      });
    });

    // ========= CSV =========

    const csv = parse(enriched);

    fs.writeFileSync(filePath, csv);

    console.log("CSV saved");

    res.status(200).json({
      rows: enriched.length,
      starsFound: stars.length
    });

  } catch (err) {

    console.error(err);

    res.status(500).send("Error generating CSV");
  }
};




module.exports = {
  generateDatasetCustom,
  generateDatasetPole,
  generateConstellationCSV,
  getConstellationCSV,
}