const tzlookup = require('tz-lookup');
const Fact = require("../models/facts");
const Planeta = require("../models/datosPlanetas");
const Evento = require("../models/eventos");

// require('./weatherController');
const weather_utils = require('../utils/weather_utils');

// -----------------------------
// FUNCIONES PLANETARIAS
// -----------------------------


async function buscarDescripcionWikipedia(astro) {
    const planetMap = {
        "Mercurio": "Mercurio_(planeta)",
        "Venus": "Venus_(planeta)",
        "Tierra": "Tierra",
        "Marte": "Marte_(planeta)",
        "Júpiter": "Júpiter_(planeta)",
        "Saturno": "Saturno_(planeta)",
        "Urano": "Urano_(planeta)",
        "Neptuno": "Neptuno_(planeta)"
    };

    const wikiTitle = planetMap[astro] || astro;
    const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return `No encontré información sobre ${astro}.`;
        const data = await response.json();
        return data.extract || `No encontré datos sobre ${astro}.`;
    } catch (err) {
        console.error(err);
        return "Ocurrió un error al buscar la información.";
    }
}

async function obtenerEventosPorTipo(tipo) {
    const ahora = new Date();

    const filtro = {
        tipo: tipo,
        fecha_pico: { $gte: ahora }
    };

    return await Evento.find(filtro)
        .sort({ fecha_pico: 1 })
        .limit(3);
}

function formatearEvento(evento) {
    const fecha = new Date(evento.fecha_pico).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    return {
        type: "description",
        title: `🌌 ${evento.nombre}`,
        text: [
            `📅 Fecha pico: ${fecha}`,
            `📍 Ubicación: ${evento.ubicacion?.nombre || "No especificada"}`,
            evento.descripcion
        ]
    };
}

// Abrir la pestaña desde el chatbot
function openTab(parameters){
    // Lista de tabs
    const tabs = {
        "sky": "Explorar el cielo",
        "map": "Lugares de observación",
        "calendar": "Calendario de eventos",
        "photo": "Galería de fotos",
        "weather": "Pronóstico de tiempo",
        "save": "Cuerpos celestes guardados",
        "animations": "Animaciones"
    }
    
    // Formamos la respuesta
    const response = {
        fulfillmentText: `Abriendo la pestaña "${tabs[parameters.tab]}"...`,
    }

    return response;
}


// Función para obtener un hecho aleatorio desde la base de datos
async function obtenerHechoAleatorioDB() {
  try {
    console.log("Buscando ...");
    const count = await Fact.countDocuments();
    console.log("Cantidad de hechos en la DB:", count);
    if (count === 0) return "No hay hechos en la base de datos.";
    const randomIndex = Math.floor(Math.random() * count);
    const doc = await Fact.findOne().skip(randomIndex);
    return doc?.texto || "No encontré un hecho astronómico.";
  } catch (err) {
    console.error("Error obteniendo hecho:", err);
    return "Error al consultar la base de datos.";
  }
}

function normalize(text) {
  return text
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function buscarHechoPorTemaDB(tema) {
  try {
    const hechos = await Fact.find();

    const temaNorm = normalize(tema);

    const resultados = hechos.filter(f =>
      f.etiquetas.some(e =>
        normalize(e).includes(temaNorm)
      )
    );

    if (resultados.length === 0) return null;

    // devolver uno aleatorio
    return resultados[Math.floor(Math.random() * resultados.length)].texto;

  } catch (err) {
    console.error("Error buscando hecho por tema:", err);
    return null;
  }
}


// Obtener pronóstico para el día
// Idea para futuro: obtener localización actual del usuario y mejorar el aspecto visual
async function getWeatherDay(parameters){
    console.log(`date-time: ${parameters['date-time']}   geo-city: ${parameters['geo-city']}`);

    // Fecha-tiempo
    let date = null;

    // Coordenadas por defecto (Madrid)
    let lat = 40.42;
    let long = -3.7;
    let city = "Madrid";

    // Si no llega la fecha-tiempo, usamos la de ahora
    if(!parameters['date-time']) date = new Date();
    else date = new Date(parameters['date-time']);

    // Si llega la localización, obtenemos coordenadas
    if(parameters['geo-city']) {
        city = parameters['geo-city'];

        // Obtenemos las coordenadas
        const url_location = `https://nominatim.openstreetmap.org/search?q=${city}&format=json&limit=1`;
        const res = await fetch(url_location, {
            headers: { "User-Agent": "SANABot/1.0" }
        });
        const data = await res.json();

        // Guardamos las coordenadas
        if (data.length > 0){
            /*lat = data[0].lat;
            long = data[0].lon;*/
            lat = parseFloat(data[0].lat);
            long = parseFloat(data[0].lon);
            console.log(`lat: ${lat}, long: ${long}`)
        }
    }

    // Obtenemos parámetros para la petición de tiempo
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    const hour = date.getHours();
    const timezone = tzlookup(lat, long);

    // Lista de códigos de tiempo
    const weatherCodes = {
        0: 'Claro',
        1: 'Mayormente claro',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        45: 'Niebla',
        48: 'Niebla escarchada',
        51: 'Llovizna ligera',
        53: 'Llovizna moderada',
        55: 'Llovizna densa',
        56: 'Llovizna helada ligera',
        57: 'Llovizna helada densa',
        61: 'Lluvia ligera',
        63: 'Lluvia moderada',
        65: 'Lluvia intensa',
        66: 'Lluvia helada ligera',
        67: 'Lluvia helada intensa',
        71: 'Nieve ligera',
        73: 'Nieve moderada',
        75: 'Nieve intensa',
        77: 'Granos de nieve',
        80: 'Chubascos ligeros',
        81: 'Chubascos moderados',
        82: 'Chubascos fuertes',
        85: 'Chubascos de nieve ligeros',
        86: 'Chubascos de nieve fuertes',
        95: 'Tormenta eléctrica ligera/moderada',
        96: 'Tormenta con granizo ligero',
        99: 'Tormenta con granizo intenso'
    };

    // Hacemos petición de tiempo
    let response = null;
    const params = new URLSearchParams({
        lat: lat,
        lon: long,
        timezone: timezone,
        date: formattedDate,
        hour: hour
    });

    const url_weather = `${process.env.API_URL}/api/weather/hour?${params.toString()}`;
    const weather = await fetch(url_weather);

    if (weather.ok) {
        const weatherData = await weather.json();
        console.log(weatherData);

        // Datos para la respuesta
        const condition = weatherCodes[weatherData.data.weathercode] || 'Desconocido';
        const subtitle = [
            
        ];

        // Formamos la respuesta
        response = {
            fulfillmentMessages: [
                {
                    "payload": {
                        "richContent": [
                            [
                                {
                                    "type": "description",
                                    "text": [`${condition}`],
                                    "title": `Tiempo para el ${day}/${month}/${year} a las ${hour}:00 en ${city}:`
                                },
                                { "type": "divider" },
                                {
                                    "type": "description",
                                    "text": [
                                        // subtitle
                                        `🌡️ Temperatura: ${weatherData.data.temperature_2m} °C`,
                                        `💧 Humedad: ${weatherData.data.relativehumidity_2m}%`,
                                        `🧭 Presión: ${weatherData.data.pressure_msl} hPa`,
                                        `💨 Viento: ${weatherData.data.windspeed_10m} m/s`,
                                        `☁️ Nubosidad: ${weatherData.data.cloudcover}%`,
                                        `🌧️ Precipitación: ${weatherData.data.precipitation} mm`,
                                        `🌫️ Punto de rocío: ${weatherData.data.dewpoint_2m} °C`
                                    ],
                                    // "title": `Tiempo para el ${day}/${month}/${year} a las ${hour}:00 en ${city}:`
                                },
                                /*{
                                    "type": "info",
                                    "title": "🌡️ Temperatura",
                                    "subtitle": `${weatherData.data.temperature_2m} °C`
                                },
                                { "type": "divider" },
                                {
                                    "type": "info",
                                    "title": "💧 Humedad",
                                    "subtitle": `${weatherData.data.relativehumidity_2m}%`
                                },
                                { "type": "divider" },
                                {
                                    "type": "info",
                                    "title": "🧭 Presión",
                                    "subtitle": `${weatherData.data.pressure_msl} hPa`
                                },
                                { "type": "divider" },
                                {
                                    "type": "info",
                                    "title": "💨 Viento",
                                    "subtitle": `${weatherData.data.windspeed_10m} m/s`
                                },
                                { "type": "divider" },
                                
                                {
                                    "type": "info",
                                    "title": "☁️ Nubosidad",
                                    "subtitle": `${weatherData.data.cloudcover}%`
                                },
                                { "type": "divider" },
                                {
                                    "type": "info",
                                    "title": "🌧️ Precipitación",
                                    "subtitle": `${weatherData.data.precipitation} mm`
                                },
                                { "type": "divider" },
                                {
                                    "type": "info",
                                    "title": "🌫️ Punto de rocío",
                                    "subtitle": `${weatherData.data.dewpoint_2m} °C`
                                },
                                { "type": "divider" },
                                {
                                    "type": "info",
                                    "title": "Condición",
                                    "subtitle": `${condition}`
                                }*/
                           ]
                        ]
                    }
                }
            ],
            // fulfillmentText: subtitle,
        };
    }
    else {
        response = {
            fulfillmentText: `Error al obtener datos para el ${date} en ${city}`,
        };
    }
    return response;
}


// Función para interpretar datos y generar pronóstico para la semana
function makeDailyForecast(data) {
  const days = {};

  // Agrupar por fechas
  for (let i = 0; i < data.hourly.time.length; i++) {
    const [date] = data.hourly.time[i].split("T");
    if (!days[date]) days[date] = [];

    days[date].push({
      temp: data.hourly.temperature_2m[i],
      code: data.hourly.weathercode[i],
      precip: data.hourly.precipitation[i],
      wind: data.hourly.windspeed_10m[i]
    });
  }

  // Lista de códigos de tiempo
    const weatherCodes = {
        0: 'Claro',
        1: 'Mayormente claro',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        45: 'Niebla',
        48: 'Niebla escarchada',
        51: 'Llovizna ligera',
        53: 'Llovizna moderada',
        55: 'Llovizna densa',
        56: 'Llovizna helada ligera',
        57: 'Llovizna helada densa',
        61: 'Lluvia ligera',
        63: 'Lluvia moderada',
        65: 'Lluvia intensa',
        66: 'Lluvia helada ligera',
        67: 'Lluvia helada intensa',
        71: 'Nieve ligera',
        73: 'Nieve moderada',
        75: 'Nieve intensa',
        77: 'Granos de nieve',
        80: 'Chubascos ligeros',
        81: 'Chubascos moderados',
        82: 'Chubascos fuertes',
        85: 'Chubascos de nieve ligeros',
        86: 'Chubascos de nieve fuertes',
        95: 'Tormenta eléctrica ligera/moderada',
        96: 'Tormenta con granizo ligero',
        99: 'Tormenta con granizo intenso'
    };
  /*сonst decodeWeather = (code) => {
    if (code === 0) return "Ясно";
    if (code === 1) return "В основном ясно";
    if (code === 2) return "Облачно с прояснениями";
    if (code === 3) return "Пасмурно";
    if ([45,48].includes(code)) return "Туман";
    if (code >= 51 && code <= 57) return "Морось";
    if (code >= 61 && code <= 67) return "Дождь";
    if (code >= 71 && code <= 77) return "Снег";
    if (code >= 80 && code <= 82) return "Ливневый дождь";
    if (code >= 85 && code <= 86) return "Ливневый снег";
    if (code === 95) return "Гроза";
    if (code >= 96 && code <= 99) return "Гроза с градом";
    return "Неизвестно";
  };*/
  const decodeWeather = (code) => {
    return weatherCodes[code] || "Desconocido";
  };

  const result = [];

  for (const date of Object.keys(days)) {
    const entries = days[date];

    const temps = entries.map(e => e.temp);
    const codes = entries.map(e => e.code);
    const precips = entries.map(e => e.precip);
    const winds = entries.map(e => e.wind);

    // Summary
    const freq = {};
    codes.forEach(c => freq[c] = (freq[c] || 0) + 1);
    const modeCode = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0][0];

    const dayObj = {
      date,
      temp_min: Math.min(...temps),
      temp_max: Math.max(...temps),
      summary: decodeWeather(Number(modeCode)),
      precip_percent: Math.round(precips.filter(p => p > 0).length / precips.length * 100),
      wind_avg: Math.round(winds.reduce((s,w)=>s+w,0)/winds.length)
    };

    result.push(dayObj);
  }

  return result;
}


// Función para traducir array al texto
function formatDayText(day) {
  const weekdayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const dateObj = new Date(day.date);
  const weekday = weekdayNames[dateObj.getDay()];

  const dt = day.date.split("-"); // YYYY-MM-DD
  const prettyDate = `${dt[2]}/${dt[1]}/${dt[0]}`;

  const json = {
    title: `${weekday}, ${prettyDate}`,
    text: [
        `${day.summary}`,
        `🌡️ Temperatura: ${day.temp_min}…${day.temp_max}°C`,
        `🌧️ Precipitación: ${day.precip_percent}%`,
        `💨 Viento: ${day.wind_avg} m/s`
    ]
  }

  return json;

  /*return (
    `${weekday}, ${prettyDate}\n` +
    `🌤 ${day.summary}\n` +
    `🌡 Temperatura: ${day.temp_min}…${day.temp_max}°C\n` +
    `🌧 Precipitación: ${day.precip_percent}%\n` +
    `🌬 Viento: ${day.wind_avg} m/s`
  );*/
}

/*function formatWeeklyForecast(forecast) {
  return forecast.map(formatDayText).join("\n\n");
}*/
function formatWeeklyForecast(forecast, city) {
    const result = [];

    result.push({
        type: "description",
        title: `Pronóstico para los próximos 7 días en ${city}`,
        // text: interpretationText.text
    });

    result.push({ type: "divider" });

    forecast.forEach((day, index) => {
        const interpretationText = formatDayText(day);

        // description
        result.push({
        type: "description",
        title: interpretationText.title,
        text: interpretationText.text
        });

        // divider (sin el último)
        if (index < forecast.length - 1) {
        result.push({
            type: "divider"
        });
        }
    });

  return result;
}



// Obtener pronóstico para la semana
// Idea para futuro: obtener localización actual del usuario y mejorar el aspecto visual
async function getWeatherWeek(parameters){
    // Fecha-tiempo
    let date = null;

    // Coordenadas por defecto (Madrid)
    let lat = 40.42;
    let long = -3.7;
    let city = "Madrid";

    // Si no llega la fecha-tiempo, usamos la de ahora
    if(!parameters['date-time']) date = new Date();
    else date = new Date(parameters['date-time']);

    // Si llega la localización, obtenemos coordenadas
    if(parameters['geo-city']) {
        city = parameters['geo-city'];

        // Obtenemos las coordenadas
        const url_location = `https://nominatim.openstreetmap.org/search?q=${city}&format=json&limit=1`;
        const res = await fetch(url_location, {
            headers: { "User-Agent": "SANABot/1.0" }
        });
        const data = await res.json();

        // Guardamos las coordenadas
        if (data.length > 0){
            /*lat = data[0].lat;
            long = data[0].lon;*/
            lat = parseFloat(data[0].lat);
            long = parseFloat(data[0].lon);
            console.log(`lat: ${lat}, long: ${long}`)
        }
    }

    // Obtenemos parámetros para la petición de tiempo
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    const hour = date.getHours();
    const timezone = tzlookup(lat, long);

    // Lista de códigos de tiempo
    const weatherCodes = {
        0: 'Claro',
        1: 'Mayormente claro',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        45: 'Niebla',
        48: 'Niebla escarchada',
        51: 'Llovizna ligera',
        53: 'Llovizna moderada',
        55: 'Llovizna densa',
        56: 'Llovizna helada ligera',
        57: 'Llovizna helada densa',
        61: 'Lluvia ligera',
        63: 'Lluvia moderada',
        65: 'Lluvia intensa',
        66: 'Lluvia helada ligera',
        67: 'Lluvia helada intensa',
        71: 'Nieve ligera',
        73: 'Nieve moderada',
        75: 'Nieve intensa',
        77: 'Granos de nieve',
        80: 'Chubascos ligeros',
        81: 'Chubascos moderados',
        82: 'Chubascos fuertes',
        85: 'Chubascos de nieve ligeros',
        86: 'Chubascos de nieve fuertes',
        95: 'Tormenta eléctrica ligera/moderada',
        96: 'Tormenta con granizo ligero',
        99: 'Tormenta con granizo intenso'
    };

    // Hacemos petición de tiempo
    let response = null;
    const params = new URLSearchParams({
        lat: lat,
        lon: long,
        timezone: timezone
    });

    const url_weather = `${process.env.API_URL}/api/weather?${params.toString()}`;
    const weather = await fetch(url_weather);

    if (weather.ok) {
        const weatherData = await weather.json();
        // console.log(weatherData);

        // Hacemos la interpretación de los datos
        const interpretation = makeDailyForecast(weatherData);
        //const interpretationText = formatWeeklyForecast(interpretation);
        const interpretationObjects = formatWeeklyForecast(interpretation, city);

        /*// Datos para la respuesta
        const condition = weatherCodes[weatherData.data.weathercode] || 'Desconocido';
        const subtitle = 
            `Tiempo para el ${day}/${month}/${year} a las ${hour}:00 en ${city}:
            Temperatura: ${weatherData.data.temperature_2m} °C
            Humedad: ${weatherData.data.relativehumidity_2m}%
            Presión: ${weatherData.data.pressure_msl} hPa
            Viento: ${weatherData.data.windspeed_10m} m/s
            Nubosidad: ${weatherData.data.cloudcover}%
            Precipitación: ${weatherData.data.precipitation} mm
            Punto de rocío: ${weatherData.data.dewpoint_2m} °C
            Condición: ${condition}`;*/

        // Formamos la respuesta
        response = {
            fulfillmentMessages: [
                {
                    "payload": {
                        "richContent": [
                            interpretationObjects
                        ]
                    }
                }
            ]
            //fulfillmentText: interpretationText,
        };
    }
    else {
        response = {
            fulfillmentText: `Error al obtener datos para el ${date} en ${city}`,
        };
    }
    return response;
}


// Decir si un día es bueno para la observación
async function evaluateObservationDay(parameters){
    console.log(`date-time: ${parameters['date-time']}   geo-city: ${parameters['geo-city']}`);

    // Fecha-tiempo
    let date = null;

    // Coordenadas por defecto (Madrid)
    let lat = 40.42;
    let long = -3.7;
    let city = "Madrid";

    // Si no llega la fecha-tiempo, usamos la de ahora
    if(!parameters['date-time']) date = new Date();
    else date = new Date(parameters['date-time']);

    // Si llega la localización, obtenemos coordenadas
    if(parameters['geo-city']) {
        city = parameters['geo-city'];

        // Obtenemos las coordenadas
        const url_location = `https://nominatim.openstreetmap.org/search?q=${city}&format=json&limit=1`;
        const res = await fetch(url_location, {
            headers: { "User-Agent": "SANABot/1.0" }
        });
        const data = await res.json();

        // Guardamos las coordenadas
        if (data.length > 0){
            /*lat = data[0].lat;
            long = data[0].lon;*/
            lat = parseFloat(data[0].lat);
            long = parseFloat(data[0].lon);
            console.log(`lat: ${lat}, long: ${long}`)
        }
    }

    // Obtenemos parámetros para la petición de tiempo
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const day2 = String(date.getDate()+1).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    const hour = date.getHours();
    const timezone = tzlookup(lat, long);

    // Hacemos petición de tiempo
    let response = null;
    const params = new URLSearchParams({
        lat: lat,
        lon: long,
        timezone: timezone
    });

    const url_weather = `${process.env.API_URL}/api/weather?${params.toString()}`;
    const weather = await fetch(url_weather);

    if (weather.ok) {
        const weatherData = await weather.json();
        //console.log(weatherData);

        const evaluation = weather_utils.evaluateNight(weatherData, lat, long, formattedDate);
        console.log(evaluation);

        // Datos para la respuesta
        let category = "";
        if(evaluation.category == "bad") category = "no es favorable";
        else if(evaluation.category == "medium") category = "es favorable, pero no ideal";
        else if(evaluation.category == "good") category = "es favorable";

        /*let subtitle = 
            `La noche desde el ${day}/${month}/${year} a ${day2}/${month}/${year} en ${city} ${category} para la observación por las razones siguientes:
            Temperatura: ${evaluation.details.temperature}
            Humedad: ${evaluation.details.humidity}
            Presión: ${evaluation.details.pressure}
            Viento: ${evaluation.details.wind}
            Nubosidad: ${evaluation.details.cloudcover}
            Precipitación: ${evaluation.details.precipitation}
            Código de tiempo: ${evaluation.details.weathercode}
            Fase lunar: ${evaluation.details.moonPenalty}
            Interpretación: `;*/

        let subtitle = 
            `La noche desde el ${day}/${month}/${year} a ${day2}/${month}/${year} en ${city} ${category} para la observación por las razones siguientes: `;
         
        for (let i = 0; i < evaluation.interpretation.length; i++) {
            subtitle += evaluation.interpretation[i] + " \n";
        }

        // Formamos la respuesta
        response = {
            /*fulfillmentMessages: [
                {
                    card: {
                        title: `Clima en ${city}`,
                        subtitle: subtitle,
                        imageUri: 'https://images.twinkl.co.uk/tw1n/image/private/t_630/u/ux/spanish-weather_ver_3.jpg',
                        buttons: [
                            {
                                text: 'Ver más detalles',
                                postback: 'https://images.twinkl.co.uk/tw1n/image/private/t_630/u/ux/spanish-weather_ver_3.jpg'
                            }
                        ]
                    }
                }
            ]*/
            fulfillmentMessages: [
                {
                    "payload": {
                        "richContent": [
                            [
                                {
                                    "type": "description",
                                    "text": evaluation.interpretation,
                                    "title": `La noche desde el ${day}/${month}/${year} a ${day2}/${month}/${year} en ${city} ${category} para la observación por las razones siguientes:`
                                },
                            ]
                        ]
                    }
                }
            ]
            //fulfillmentText: subtitle,
        };
    }
    else {
        response = {
            fulfillmentText: `Error al obtener datos para el ${date} en ${city}`,
        };
    }
    return response;
}

// Buscar el mejor día para la observación
async function searchObservationDay(parameters){
    console.log(`geo-city: ${parameters['geo-city']}`);

    // Fecha-tiempo
    let date = new Date();

    // Coordenadas por defecto (Madrid)
    let lat = 40.42;
    let long = -3.7;
    let city = "Madrid";

    // Si llega la localización, obtenemos coordenadas
    if(parameters['geo-city']) {
        city = parameters['geo-city'];

        // Obtenemos las coordenadas
        const url_location = `https://nominatim.openstreetmap.org/search?q=${city}&format=json&limit=1`;
        const res = await fetch(url_location, {
            headers: { "User-Agent": "SANABot/1.0" }
        });
        const data = await res.json();

        // Guardamos las coordenadas
        if (data.length > 0){
            /*lat = data[0].lat;
            long = data[0].lon;*/
            lat = parseFloat(data[0].lat);
            long = parseFloat(data[0].lon);
            console.log(`lat: ${lat}, long: ${long}`)
        }
    }

    // Obtenemos parámetros para la petición de tiempo
    /*const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const day2 = String(date.getDate()+1).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;*/
    const timezone = tzlookup(lat, long);

    // Hacemos petición de tiempo
    let response = null;
    const params = new URLSearchParams({
        lat: lat,
        lon: long,
        timezone: timezone
    });

    const url_weather = `${process.env.API_URL}/api/weather?${params.toString()}`;
    const weather = await fetch(url_weather);

    if (weather.ok) {
        const weatherData = await weather.json();

        const evaluation = weather_utils.evaluateMultipleNights(weatherData, lat, long);
        console.log(evaluation);

        // Datos para la respuesta
        let title = "";
        console.log(evaluation[0]);
        const [year, month, day] = evaluation[0].date.split("-");
        const day2 = Number(day) + 1;

        if(evaluation[0].category == "bad") {
            title = `Entre los próximos 7 días en ${city} no fue encuntrado el mejor día favorable para la observación. Resumen: `;
        }
        else if(evaluation[0].category == "medium" || evaluation[0].category == "good") {
            title = `La mejor noche para observación en ${city} entre los 7 días siguientes es la noche desde el ${day}/${month}/${year} a ${day2}/${month}/${year} por las razones siguientes: `;
        }
         
        /*for (let i = 0; i < evaluation[0].interpretation.length; i++) {
            subtitle += evaluation[0].interpretation[i] + " \n";
        }*/

        // Formamos la respuesta
        response = {
            /*fulfillmentMessages: [
                {
                    card: {
                        title: `Clima en ${city}`,
                        subtitle: subtitle,
                        imageUri: 'https://images.twinkl.co.uk/tw1n/image/private/t_630/u/ux/spanish-weather_ver_3.jpg',
                        buttons: [
                            {
                                text: 'Ver más detalles',
                                postback: 'https://images.twinkl.co.uk/tw1n/image/private/t_630/u/ux/spanish-weather_ver_3.jpg'
                            }
                        ]
                    }
                }
            ]*/
            fulfillmentMessages: [
                {
                    "payload": {
                        "richContent": [
                            [
                                {
                                    "type": "description",
                                    "text": evaluation[0].interpretation,
                                    "title": title
                                },
                            ]
                        ]
                    }
                }
            ]
            //fulfillmentText: subtitle,
        };
    }
    else {
        response = {
            fulfillmentText: `Error al obtener datos para el ${date} en ${city}`,
        };
    }
    return response;
}

async function obtenerTemasDisponibles() {
  const temas = await Fact.distinct("etiquetas");
  return temas;
}


async function astroGeneral(parameters){
    const astro = parameters["astros"] || "astro desconocido";
    console.log(astro)

    // Gestión de imrevistos
    if(astro==='astro desconocido')
        return "Perdón, no conozco este astro, pero siempre puedes preguntarme sobre planetas, Luna y Sol."

    const planeta = await Planeta.findOne({
        nombre: new RegExp(`^${astro}$`, "i")
    });

    console.log(planeta.descripcion);

    let mostrar = {
                                "type": "button",
                                "icon": { "type": "arrow_forward", "color": "#FF9800" },
                                "text": `Muestra en el planetario`,
                                "event": { 
                                    "name": "show_planet",
                                    "languageCode": "es",
                                    "parameters": {
                                        "astro": `${planeta.nombre}`
                                    },
                                }
                            }

    if(astro==="Tierra"){
        mostrar = "";
    }

    const response = {
        //fulfillmentText: `${planeta.descripcion}`,
        fulfillmentMessages: [
            {
                text: { text: [planeta.descripcion] }
            },
            {
                payload: {
                    richContent: [
                        [
                            /*{
                                type: "chips",
                                options: [
                                    { text: `Características de ${planeta.nombre}` },
                                    { text: `Mitología de ${planeta.nombre}` },
                                    { text: `Curiosidades de ${planeta.nombre}` },
                                    { text: `Muestra ${planeta.nombre}` },
                                    { text: `Más información sobre ${planeta.nombre}` }
                                ]
                            },*/
                            {
                                "type": "button",
                                "icon": { "type": "arrow_forward", "color": "#FF9800" },
                                "text": `Características`,
                                "event": { 
                                    "name": "caracteristics",
                                    "languageCode": "es",
                                    "parameters": {
                                        "astros": `${planeta.nombre}`
                                    },
                                }
                            },
                            {
                                "type": "button",
                                "icon": { "type": "arrow_forward", "color": "#FF9800" },
                                "text": `Mitología`,
                                "event": { 
                                    "name": "myth",
                                    "languageCode": "es",
                                    "parameters": {
                                        "astros": `${planeta.nombre}`
                                    },
                                }
                            },
                            {
                                "type": "button",
                                "icon": { "type": "arrow_forward", "color": "#FF9800" },
                                "text": `Curiosidades`,
                                "event": { 
                                    "name": "interesting",
                                    "languageCode": "es",
                                    "parameters": {
                                        "astros": `${planeta.nombre}`
                                    },
                                }
                            },
                            mostrar,
                            {
                                "type": "button",
                                "icon": { "type": "arrow_forward", "color": "#FF9800" },
                                "text": `Más información`,
                                "event": { 
                                    "name": "mas_info",
                                    "languageCode": "es",
                                    "parameters": {
                                        "astros": `${planeta.nombre}`
                                    },
                                }
                            }
                        ]
                    ]
                }
            }
        ]
        
    };
    return response;
}

async function astroInfo(parameters, type){
    const astro = parameters["astros"] || "astro desconocido";
    let response = {};

    const planeta = await Planeta.findOne({
        nombre: new RegExp(`^${astro}$`, "i")
    });

    if (!planeta) return { fulfillmentText: "Perdón, no conozco este astro, pero siempre puedes preguntarme sobre planetas, Luna y Sol."};
    
    let distancia_sol = `• Distancia media del Sol: ${planeta.distancia_sol}`;
    let distancia_tierra = `• Distancia media a la Tierra: ${planeta.distancia_tierra}`;
    let num_lunas = `• Lunas: ${planeta.num_lunas}`;
    let tipo = 'planeta';
    let hasLunas = `• Lunas: ${planeta.num_lunas}`;

    let infoNasa1 = {
        "type": "button",
        "icon": { "type": "open_in_new" },
        "text": `NASA todo sobre ${planeta.nombre}`,
        "link": planeta.mas_info.nasa[1]
    };
    let infoNasa2 = {
        "type": "button",
        "icon": { "type": "open_in_new" },
        "text": `NASA hechos sobre ${planeta.nombre}`,
        "link": planeta.mas_info.nasa[2]
    };

    if(planeta.nombre === 'Sol') {
        distancia_sol = "";
        num_lunas = "";
        tipo = '';
        infoNasa1 = '';
        infoNasa2 = '';
        hasLunas = "";
    }
    if(planeta.nombre === 'Luna') {
        distancia_sol = "";
        num_lunas = "";
        tipo = '';
        infoNasa1 = '';
        infoNasa2 = '';
        hasLunas = "";
    }
    if(planeta.nombre === 'Tierra') {
        distancia_tierra = "";
    }

    switch(type){
        case "caracteristics":
            let lunas = "";
            let title = "• Lunas famosas: ";

            if (planeta.lunas?.length > 0) {
                lunas = planeta.lunas.join(", ");
                console.log(lunas);
                lunas = title + lunas;
            }

            response = {
                fulfillmentMessages: [
                    {
                        payload: {
                            richContent: [
                                [
                                    {
                                        "title": `Características de ${planeta.nombre}:`,
                                        "type": "description",
                                        "text": [
                                            `• Tipo: ${tipo + planeta.tipo}`,
                                            `• Grupo: ${planeta.grupo}`,
                                            `• Diámetro: ${planeta.tamano}`,
                                            `• Masa: ${planeta.masa}`,
                                            distancia_sol,
                                            distancia_tierra,
                                            `• Gravedad: ${planeta.gravedad}`,
                                            `• Duración del día: ${planeta.dia}`,
                                            `• Duración del año: ${planeta.anyo}`,
                                            `• Temperatura superficial: ${planeta.temperatura}`,
                                            `• Edad: ${planeta.edad}`,
                                            hasLunas,
                                            lunas
                                        ]
                                    },
                                ]
                            ]
                        }
                    }
                ]
                
            };
            break;
        case "myth":
            response = { fulfillmentText: planeta.mitologia};
            break;
        case "mas_info":
            response = {
                fulfillmentMessages: [
                    {
                        text: { text: [planeta.descripcion] }
                    },
                    {
                        payload: {
                            richContent: [
                                [
                                    {
                                        "type": "button",
                                        "icon": { "type": "open_in_new" },
                                        "text": "Wikipedia",
                                        "link": planeta.mas_info.wikipedia
                                    },
                                    {
                                        "type": "button",
                                        "icon": { "type": "open_in_new" },
                                        "text": "National Geographic",
                                        "link": planeta.mas_info.national_geographic
                                    },
                                    {
                                        "type": "button",
                                        "icon": { "type": "open_in_new" },
                                        "text": `NASA ${planeta.nombre}`,
                                        "link": planeta.mas_info.nasa[0]
                                    },
                                    infoNasa1,
                                    infoNasa2
                                ]
                            ]
                        }
                    }
                ]
                
            };
            break;
        case "interesting":
            response = {
                fulfillmentMessages: [
                    {
                        payload: {
                            richContent: [
                                [
                                    
                                    {
                                        "title": `Hechos interesantes sobre ${planeta.nombre}:`,
                                        "type": "description",
                                        "text": planeta.curiosidades.map(
                                            item => `• ${item}`
                                        )
                                    },
                                ]
                            ]
                        }
                    }
                ]
                
            };
            break;
    }

    return response;
}



/*****************************************
            FUNCIÓN GENERAL
*****************************************/
const webhook = async (req, res) => {
    try {
        // Obteniendo el intent
        const intentName = req.body.queryResult.intent.displayName;
        const parameters = req.body.queryResult.parameters;

        const astroContext = req.body.queryResult.outputContexts?.find(ctx =>
            ctx.parameters?.astros
        );

        const query = req.body.queryResult.queryText?.toLowerCase() || "";
        const astro = parameters["astros"] || astroContext?.parameters?.astros || "astro desconocido";

        let response = null; // Respuesta a devolver
        console.log("INTENT RECIBIDO:", intentName);

        // Llamamos las funciones según el intent
        switch(intentName){
            case "open_tab":  // Abrir la pestaña desde el chatbot
                response = openTab(parameters);
                break;
            case "weather.day": // Obtener pronóstico para el día
                response = await getWeatherDay(parameters);
                break;
            case "weather.week": // Obtener pronóstico para la semana
                response = await getWeatherWeek(parameters);
                break;
            case "weather.observation.can": // Decir si un día es favorable para la observación
                response = await evaluateObservationDay(parameters);
                break;
            case "weather.observation": // Decir si un día es favorable para la observación
                response = await searchObservationDay(parameters);
                break;
            
            // Intents de contexto para las peticiones de tiempo
            // -------------------------------------------------
            case "weather.week - city":
                response = await getWeatherWeek(parameters);
                break;
            case "weather.observation.can - city-date":
                response = await evaluateObservationDay(parameters);
                break;
            case "weather.day - city-date": // Obtener pronóstico para el día
                response = await getWeatherDay(parameters);
                break;
            case "weather.observation - city": // Decir si un día es favorable para la observación
                response = await searchObservationDay(parameters);
                break;
            // -------------------------------------------------

            case "open_map_with_location": {
                
            }

            case "events.check - custom": {

                const tipoMap = {
                    "Eclipse solar": "eclipse_solar",
                    "Eclipse lunar": "eclipse_lunar",
                    "Lluvia de meteoros": "meteor_shower",
                    "Superlunas": "supermoon"
                };

                function normalizeText(text) {
                    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                }

                const tipoSeleccionado = Object.keys(tipoMap)
                    .find(key => normalizeText(query).includes(normalizeText(key)));

                if (!tipoSeleccionado) {
                    // Mostrar chips si no se reconoce
                    return res.json({
                        fulfillmentMessages: [
                            { text: { text: ["¿Qué tipo de evento astronómico deseas consultar?"] } },
                            {
                                payload: {
                                    richContent: [[{
                                        type: "chips",
                                        options: [
                                            { text: "Eclipse Solar" },
                                            { text: "Eclipse Lunar" },
                                            { text: "Lluvia de Meteoros" },
                                            { text: "Superlunas" }
                                        ]
                                    }]]
                                }
                            }
                        ]
                    });
                }

                const tipoDB = tipoMap[tipoSeleccionado];

                const eventos = await obtenerEventosPorTipo(tipoDB);

                if (!eventos.length) {
                    return res.json({
                        fulfillmentMessages: [
                            {
                                text: {
                                    text: ["No hay eventos próximos de este tipo."]
                                }
                            }
                        ]
                    });
                }

                const richContentArray = [];

                eventos.forEach((evento, index) => {
                    richContentArray.push(formatearEvento(evento));

                    if (index < eventos.length - 1) {
                        richContentArray.push({ type: "divider" });
                    }
                });

                // Texto antes de los chips
                richContentArray.push({ type: "divider" });
                richContentArray.push({
                    type: "description",
                    title: "",
                    text: ["¿Te interesa unos consejos de observación?"]
                });

                // Agregamos chips al final
                richContentArray.push({ type: "divider" });
                richContentArray.push({
                    type: "chips",
                    options: [
                        { text: "Sí" },
                        { text: "No" },
                    ]
                });

                return res.json({
                    fulfillmentMessages: [
                        {
                            payload: {
                                richContent: [richContentArray]
                            }
                        }
                    ]
                });
            }
            

            case "astro.information":
                response = await astroGeneral(parameters);
                /*response = `De acuerdo, ¿qué deseas saber sobre ${astro}? ¿Desea saber algo más acerca de ${astro}?`;
                return res.json({
                    fulfillmentMessages: [
                        {
                            text: { text: [response] }
                        },
                        {
                            payload: {
                                richContent: [
                                    [
                                        {
                                            type: "chips",
                                            options: [
                                                { text: "¿Cuándo se descubrió?" },
                                                { text: "¿Cuál es su distancia hasta el Sol?" },
                                                { text: "¿Cuál es su diámetro total?" },
                                                { text: "¿Cuántas lunas posee?" },
                                                { text: "¿Cuál es su masa real?" },
                                            ]
                                        }
                                    ]
                                ]
                            }
                        }
                    ]
                });*/
                break;

            // Peticiones de datos sobre planetas
            // -------------------------------------------
            case "astro.info.caracteristics":
                response = await astroInfo(parameters, 'caracteristics');
                break;
            case "astro.info.myth":
                response = await astroInfo(parameters, 'myth');
                break;
            case "astro.info.mas_info":
                response = await astroInfo(parameters, 'mas_info');
                break;
            case "astro.info.interesting":
                response = await astroInfo(parameters, 'interesting');
                break;
            // -------------------------------------------

            case "astro.information - custom":
                const planeta = await Planeta.findOne({
                    nombre: new RegExp(`^${astro}$`, "i")
                });

                const chipsResponse = {
                    fulfillmentMessages: [
                        {
                            text: {
                                text: [response]
                            }
                        },
                        {
                            payload: {
                                richContent: [
                                    [
                                        {
                                            type: "chips",
                                            options: [
                                                { text: "Sí" },
                                                { text: "No" },
                                                { text: "Más tarde" }
                                            ]
                                        }
                                    ]
                                ]
                            }
                        }
                    ]
                };

                switch (true) {

                    case query.includes("descubrió"):
                    case query.includes("descubrir"):
                        if (planeta?.descubrimiento) {
                            response = `${astro} fue ${planeta.descubrimiento}. ¿Desea saber algo más acerca de ${astro}?`;
                        } else {
                            const desc = await buscarDescripcionWikipedia(astro);
                            response = `${desc} ¿Desea saber algo más acerca de ${astro}?`;
                        }
                        return res.json({
                            fulfillmentMessages: [
                                {
                                    text: { text: [response] }
                                },
                                {
                                    payload: {
                                        richContent: [
                                            [
                                                {
                                                    type: "chips",
                                                    options: [
                                                        { text: "Sí" },
                                                        { text: "No" },
                                                        { text: "Más tarde" }
                                                    ]
                                                }
                                            ]
                                        ]
                                    }
                                }
                            ]
                        });

                    case query.includes("distancia"):
                        if (planeta?.distancia_sol) {
                            response = `La distancia de ${astro} al Sol es ${planeta.distancia_sol}. ¿Desea saber algo más acerca de ${astro}?`;
                        } else {
                            const desc = await buscarDescripcionWikipedia(astro);
                            response = `${desc} ¿Desea saber algo más acerca de ${astro}?`;
                        }
                        return res.json({
                            fulfillmentMessages: [
                                {
                                    text: { text: [response] }
                                },
                                {
                                    payload: {
                                        richContent: [
                                            [
                                                {
                                                    type: "chips",
                                                    options: [
                                                        { text: "Sí" },
                                                        { text: "No" },
                                                        { text: "Más tarde" }
                                                    ]
                                                }
                                            ]
                                        ]
                                    }
                                }
                            ]
                        });

                    case query.includes("tamaño"):
                    case query.includes("diámetro"):
                        if (planeta?.tamano) {
                            response = `El tamaño de ${astro} es ${planeta.tamano}. ¿Desea saber algo más acerca de ${astro}?`;
                        } else {
                            const desc = await buscarDescripcionWikipedia(astro);
                            response = `${desc} ¿Desea saber algo más acerca de ${astro}?`;
                        }
                        return res.json({
                            fulfillmentMessages: [
                                {
                                    text: { text: [response] }
                                },
                                {
                                    payload: {
                                        richContent: [
                                            [
                                                {
                                                    type: "chips",
                                                    options: [
                                                        { text: "Sí" },
                                                        { text: "No" },
                                                        { text: "Más tarde" }
                                                    ]
                                                }
                                            ]
                                        ]
                                    }
                                }
                            ]
                        });

                    case query.includes("lunas"):
                    case query.includes("satélites"):
                        if (planeta?.lunas) {
                            response = `${astro} tiene ${planeta.lunas.length} lunas: ${planeta.lunas.join(", ")}. ¿Desea saber algo más acerca de ${astro}?`;
                        } else {
                            const desc = await buscarDescripcionWikipedia(astro);
                            response = `${desc} ¿Desea saber algo más acerca de ${astro}?`;
                        }
                        return res.json({
                            fulfillmentMessages: [
                                {
                                    text: { text: [response] }
                                },
                                {
                                    payload: {
                                        richContent: [
                                            [
                                                {
                                                    type: "chips",
                                                    options: [
                                                        { text: "Sí" },
                                                        { text: "No" },
                                                        { text: "Más tarde" }
                                                    ]
                                                }
                                            ]
                                        ]
                                    }
                                }
                            ]
                        });

                    case query.includes("masa"):
                        if (planeta?.masa) {
                            response = `La masa de ${astro} es de aproximadamente${planeta.masa}. ¿Desea saber algo más acerca de ${astro}?`;
                        } else {
                            const desc = await buscarDescripcionWikipedia(astro);
                            response = `${desc} ¿Desea saber algo más acerca de ${astro}?`;
                        }
                        return res.json({
                            fulfillmentMessages: [
                                {
                                    text: { text: [response] }
                                },
                                {
                                    payload: {
                                        richContent: [
                                            [
                                                {
                                                    type: "chips",
                                                    options: [
                                                        { text: "Sí" },
                                                        { text: "No" },
                                                        { text: "Más tarde" }
                                                    ]
                                                }
                                            ]
                                        ]
                                    }
                                }
                            ]
                        });

                    default:
                        const desc = await buscarDescripcionWikipedia(astro);
                        response = `${desc} ¿Desea saber algo más acerca de ${astro}?`;
                        return res.json({
                            fulfillmentMessages: [
                                {
                                    text: { text: [response] }
                                },
                                {
                                    payload: {
                                        richContent: [
                                            [
                                                {
                                                    type: "chips",
                                                    options: [
                                                        { text: "Sí" },
                                                        { text: "No" },
                                                        { text: "Más tarde" }
                                                    ]
                                                }
                                            ]
                                        ]
                                    }
                                }
                            ]
                        });
                }
                break;

            case "about.facts_and_myth": {
            const temas = await obtenerTemasDisponibles();

            return res.json({
                fulfillmentMessages: [
                {
                    text: {
                    text: ["Vale, puedes escoger de entre los siguientes temas para aprender:"]
                    }
                },
                {
                    payload: {
                    richContent: [[{
                        type: "chips",
                        options: temas.map(t => ({ text: t }))
                    }]]
                    }
                },
                {
                    text: {
                    text: ["¿Te interesa algunos en particular?"]
                    }
                }
                ]
            });
            
            }
            break;

            // ---------------- Hechos y mitos ----------------
            case "about.facts_and_myth - custom":{
                let tema = parameters["astros"] || parameters["tema"];

                // fallback si Dialogflow no detecta nada
                if (!tema) {
                    tema = query;
                }

                // Si el usuario pide "otro", "sí" o "más" → aleatorio
                if (query.includes("otro") || query.includes("sí") || query.includes("más")) {
                const hecho = await obtenerHechoAleatorioDB();
                response = `${hecho} ¿Quieres escuchar otro hecho o mito astronómico?`;
                return res.json({
                            fulfillmentMessages: [
                                {
                                    text: { text: [response] }
                                },
                                {
                                    payload: {
                                        richContent: [
                                            [
                                                {
                                                    type: "chips",
                                                    options: [
                                                        { text: "Sí" },
                                                        { text: "No" }
                                                    ]
                                                }
                                            ]
                                        ]
                                    }
                                }
                            ]
                        });
                } 
                else if (tema) {
                const hechoTema = await buscarHechoPorTemaDB(tema);
                if (hechoTema) {
                    response = `${hechoTema} ¿Quieres escuchar otro hecho o mito astronómico?`;
                return res.json({
                            fulfillmentMessages: [
                                {
                                    text: { text: [response] }
                                },
                                {
                                    payload: {
                                        richContent: [
                                            [
                                                {
                                                    type: "chips",
                                                    options: [
                                                        { text: "Sí" },
                                                        { text: "No" }
                                                    ]
                                                }
                                            ]
                                        ]
                                    }
                                }
                            ]
                        });
                } else {
                    const random = await obtenerHechoAleatorioDB();
                    response = `No encontré un mito o hecho específico sobre ${tema}, pero aquí tienes uno interesante: ${random}. ¿Quieres escuchar otro?`;
                    return res.json({
                            fulfillmentMessages: [
                                {
                                    text: { text: [response] }
                                },
                                {
                                    payload: {
                                        richContent: [
                                            [
                                                {
                                                    type: "chips",
                                                    options: [
                                                        { text: "Sí" },
                                                        { text: "No" }
                                                    ]
                                                }
                                            ]
                                        ]
                                    }
                                }
                            ]
                        });
                }
                }
                break;
            }
            case "about.facts_and_myth - no":
            case "about_facts_and_myth_yes_custom":{
                const hecho = await obtenerHechoAleatorioDB();
                response = `${hecho} ¿Quieres escuchar otro hecho o mito astronómico?`;
                return res.json({
                            fulfillmentMessages: [
                                {
                                    text: { text: [response] }
                                },
                                {
                                    payload: {
                                        richContent: [
                                            [
                                                {
                                                    type: "chips",
                                                    options: [
                                                        { text: "Sí" },
                                                        { text: "No" }
                                                    ]
                                                }
                                            ]
                                        ]
                                    }
                                }
                            ]
                        });
                
            }

            case "search_request":
                console.log(astro)
                const tabResponse = openTab({ tab: "sky" });

                return res.json({
                fulfillmentText: tabResponse.fulfillmentText,
                fulfillmentMessages: [
                    {
                    text: { text: [tabResponse.fulfillmentText] }
                    },
                    {
                    type: "payload",  // 🔹 obligatorio
                    payload: {
                        action: "activate_toggle",
                        toggleIndex: 3,
                        tab: "sky"
                    }
                    }
                ],
                queryResult: {
                    parameters: {
                    tab: "sky"
                    }
                }
                });
        }

        // Devolvemos la respuesta
        console.log(response);
        return res.json(response);

    } catch (error) {
        console.error('Dialogflow Webhook error:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


module.exports = {
    webhook,
}