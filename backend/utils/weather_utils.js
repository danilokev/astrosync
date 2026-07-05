const SunCalc = require('suncalc');

const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const mostFrequent = arr =>
  arr.sort((a, b) =>
    arr.filter(v => v === a).length - arr.filter(v => v === b).length
  ).pop();

const scoreMap = {
  good: 1,
  medium: 0.5,
  bad: 0
};

function evaluateNight(weatherData, lat, lon, dateString) {
  const date = new Date(dateString);

  // -------- 1. Sunrise / Sunset --------
  const sun = SunCalc.getTimes(date, lat, lon);
  const sunrise = sun.sunrise;
  const sunset = sun.sunset;

  // -------- 2. Horas nocturnas --------
  const times = weatherData.hourly.time.map(t => new Date(t));

  const nightIndexes = times
    .map((t, i) => (t >= sunset || t <= sunrise ? i : null))
    .filter(v => v !== null);

  if (nightIndexes.length === 0) {
    return {
      category: "unknown",
      score: 0,
      reasons: ["No hay datos de las horas nocturnas"]
    };
  }

  // Obtenemos valores por índices
  const take = arr => nightIndexes.map(i => arr[i]);

  const nightTemp = take(weatherData.hourly.temperature_2m);
  const nightDew = take(weatherData.hourly.dewpoint_2m);
  const nightHum = take(weatherData.hourly.relativehumidity_2m);
  const nightWind = take(weatherData.hourly.windspeed_10m);
  const nightCloud = take(weatherData.hourly.cloudcover);
  const nightPrec = take(weatherData.hourly.precipitation);
  const nightCode = take(weatherData.hourly.weathercode);
  const nightPress = take(weatherData.hourly.pressure_msl);

  // -------- 3. Valores medios --------
  const T = avg(nightTemp);
  const D = avg(nightDew);
  const H = avg(nightHum);
  const W = avg(nightWind);
  const C = avg(nightCloud);
  const P = avg(nightPrec);
  const WCODE = mostFrequent(nightCode);
  const PRESS_DIFF = Math.max(...nightPress) - Math.min(...nightPress);

  // -------- 4. Clasificación de los parámetros --------
  let interpretation = [];
  // Temperatura / punto de rocío
  const delta = T - D;
  let tempCat = "";
  if (delta > 5) {
    tempCat = "good";
    interpretation.push("✅ No se forma condensación");
  }
  else if (delta >= 2) {
    tempCat = "medium";
    interpretation.push("⚠️ Hay posibilidad de la formación de condensación");
  }
  else {
    tempCat = "bad";
    interpretation.push("❌ Se forma condensación");
  }

  // Temperatura (frío)
  if (T < -10) {
    tempCat = "bad";
    interpretation.push("❌ Demasiado frío para las salidas de observación");
  }
  else if (T < -5 && tempCat === "good") {
    tempCat = "medium";
    interpretation.push("⚠️ A lo mejor es un poco frío para las salidas de observación");
  }

  // Humedad
  let humCat = "";
  if (H < 50) {
    humCat = "good";
    interpretation.push("✅ La humedad es baja");
  }
  else if (H <= 70) {
    humCat = "medium";
    interpretation.push("⚠️ La humedad es media");
  }
  else {
    humCat = "bad";
    interpretation.push("❌ La observación puede ser dificultada por la humedad alta");
  }

  // Nubosidad
  let cloudCat = "";
  if (C < 30) {
    cloudCat = "good";
    interpretation.push("✅ El cielo está claro");
  }
  else if (C <= 50) {
    cloudCat = "medium";
    interpretation.push("⚠️ El cielo puede estar cubierto parcialmente por las nubes");
  }
  else {
    cloudCat = "bad";
    interpretation.push("❌ Es muy probable que el cielo no se verá");
  }

  // Viento
  let windCat = "";
  if (W < 6) {
    windCat = "good";
    interpretation.push("✅ No hay viento");
  }
  else if (W <= 10) {
    windCat = "medium";
    interpretation.push("⚠️ El viento puede producir ciertas vibraciones del equipo");
  }
  else {
    windCat = "bad";
    interpretation.push("❌ El viento fuerte dificulta la observación");
  }

  // Precipitación
  let precCat = "";
  if (P > 0.1) {
    precCat = "bad";
    interpretation.push("❌Hay precipitación que dificulta la observación");
  }
  else {
    precCat = "good";
    interpretation.push("✅ No se espera la precipitación");
  }

  // Weathercode
  let codeCat = "";
  if (WCODE === 0 || WCODE === 1) {
    codeCat = "good";
    interpretation.push("✅ Se espera el cielo claro");
  }
  else if (WCODE === 2) {
    codeCat = "medium";
    interpretation.push("⚠️ El cielo puede estar cubierto por las nubes");
  }
  else {
    codeCat = "bad";
    interpretation.push("❌ Las condiciones generales no son buenas para la observación");
  }

  // Presión atmosférica
  let pressureCat = "";
  if (PRESS_DIFF < 5) {
    pressureCat = "good";
    interpretation.push("✅ No se esperan los cambios bruscos de la presión atmosférica que podrían hacer la atmósfera inestable");
  }
  else if (PRESS_DIFF <= 10) {
    pressureCat = "medium";
    interpretation.push("⚠️ Puede hacer cierta inestabilidad en la atmósfera por cambios de la presión atmosférica");
  }
  else {
    pressureCat = "bad";
    interpretation.push("❌ El tiempo puede empeorarse debido a los cambios bruscos de la presión atmosférica");
  }

  // -------- 5. Pesos --------
  const weights = {
    temp: 0.20,
    hum: 0.15,
    cloud: 0.25,
    precip: 0.25,
    wind: 0.10,
    pressure: 0.05
  };

  // -------- 6. Final score --------
  let score =
    scoreMap[tempCat] * weights.temp +
    scoreMap[humCat] * weights.hum +
    scoreMap[cloudCat] * weights.cloud +
    Math.min(scoreMap[precCat], scoreMap[codeCat]) * weights.precip +
    scoreMap[windCat] * weights.wind +
    scoreMap[pressureCat] * weights.pressure;

  // -------- 7. Fases lunares --------
  const moon = SunCalc.getMoonIllumination(date);
  const phase = moon.fraction; // 0 = new moon, 1 = full moon

  let moonPenalty = 0;

  if (phase > 0.75) {
    moonPenalty = -0.15; // Luna llena
    interpretation.push("❌ La luz de la Luna puede dificultar a la observación");
  }
  else if (phase > 0.5) {
    moonPenalty = -0.10; // Luna brillante
    interpretation.push("⚠️ La luz de la Luna puede influir ligeramente a la observación");
  }
  else if (phase > 0.25) {
    moonPenalty = -0.05; // Luna notable
    interpretation.push("⚠️ La luz de la Luna puede influir ligeramente a la observación");
  }

  score = Math.max(0, Math.min(1, score + moonPenalty));

  // -------- 8. Categoría --------
  let category;
  if (score >= 0.8) category = "good";
  else if (score >= 0.55) category = "medium";
  else category = "bad";

  // -------- 9. Resultado --------
  return {
    category,
    score: Number(score.toFixed(3)),
    moonPhase: Number(phase.toFixed(3)),
    details: {
      temperature: tempCat,
      humidity: humCat,
      cloudcover: cloudCat,
      precipitation: precCat,
      weathercode: codeCat,
      wind: windCat,
      pressure: pressureCat,
      moonPenalty
    },
    raw: {
      T, D, H, W, C, P, WCODE, PRESS_DIFF
    },
    interpretation: interpretation
  };
}


// Evaluar varias noches
function evaluateMultipleNights(weatherData, lat, lon) {
  // Obtener array de fechas
  const dateArray = [...new Set(weatherData.hourly.time.map(t => t.split("T")[0]))];

  const results = dateArray.map(date => {
    const nightEval = evaluateNight(weatherData, lat, lon, date);
    return {
      date,
      score: nightEval.score,
      category: nightEval.category,
      moonPhase: nightEval.moonPhase,
      interpretation: nightEval.interpretation,
      details: nightEval.details
    };
  });

  // Ordenar por score
  results.sort((a, b) => b.score - a.score);

  return results;
}


module.exports = {
  evaluateNight,
  evaluateMultipleNights
};
