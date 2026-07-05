const { evaluateMultipleNights } = require('../utils/weather_utils');

// Tiempo para la semana por horas
const getWeatherData = async (req, res) => {
    try{
        // Obtain paramers
        const { lat, lon, timezone } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Missing latitude or longitude' });
        }

        // Date range
        const today = new Date().toISOString().split("T")[0];
        const nextWeek = new Date(Date.now() + 7*24*60*60*1000)
            .toISOString()
            .split("T")[0];

        // List of parameters to obtain
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            start_date: today,
            end_date: nextWeek,
            hourly: [
                'temperature_2m',
                'relativehumidity_2m',
                'pressure_msl',
                'windspeed_10m',
                'cloudcover',
                'precipitation',
                'dewpoint_2m',
                'weathercode'
            ].join(','),
                timezone: timezone || 'UTC'
        });

        // Full url
        const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
        
        // Request
        const response = await fetch(url);
        if(!response.ok){
            throw new Error(`Open-Meteo API error: ${response.status}`);
        }
        const data = await response.json();
        res.status(200).json(data);
    }
    catch(error){
        console.error('Weather API error:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

// Tiempo para una hora determinada
const getWeatherHour = async (req, res) => {
    try {
        const { lat, lon, timezone, date, hour } = req.query;

        if (!lat || !lon || !date || hour === undefined) {
            return res.status(400).json({ error: 'Missing lat, lon, date or hour' });
        }

        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            start_date: date,
            end_date: date,
            hourly: [
                'temperature_2m',
                'relativehumidity_2m',
                'pressure_msl',
                'windspeed_10m',
                'cloudcover',
                'precipitation',
                'dewpoint_2m',
                'weathercode'
            ].join(','),
            timezone: timezone || 'UTC'
        });

        const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Open-Meteo API error: ${response.status}`);
        }

        const data = await response.json();

        // Search hour index
        const hourIndex = data.hourly.time.findIndex(t => t.endsWith(`${hour.toString().padStart(2,'0')}:00`));

        if (hourIndex === -1) {
            return res.status(404).json({ error: 'Hour not found in forecast' });
        }

        // Form object
        const hourData = {};
        for (const key in data.hourly) {
            hourData[key] = data.hourly[key][hourIndex];
        }

        res.status(200).json({ date, hour, data: hourData });

    } catch (error) {
        console.error('Weather API error:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Evaluación de observación astronómica
const getWeatherEvaluation = async (req, res) => {
  try {
    const { lat, lon, timezone } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing latitude or longitude' });
    }

    // Llamar a la API de Open-Meteo (como hace getWeatherData)
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7*24*60*60*1000)
      .toISOString()
      .split("T")[0];

    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      start_date: today,
      end_date: nextWeek,
      hourly: [
        'temperature_2m',
        'relativehumidity_2m',
        'pressure_msl',
        'windspeed_10m',
        'cloudcover',
        'precipitation',
        'dewpoint_2m',
        'weathercode'
      ].join(','),
      timezone: timezone || 'UTC'
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const response = await fetch(url);
    if(!response.ok){
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }
    const data = await response.json();

    // Evaluar varias noches
    const results = evaluateMultipleNights(data, parseFloat(lat), parseFloat(lon));

    res.status(200).json(results);

  } catch (error) {
    console.error('Weather evaluation error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



module.exports = {
    getWeatherData, //example http://localhost:5000/api/weather?lat=38.3452&lon=-0.4810&timezone=Europe/Madrid
    getWeatherHour, //example http://localhost:5000/api/weather/hour?lat=38.3452&lon=-0.4810&timezone=Europe/Madrid&date=2025-12-05&hour=15
    getWeatherEvaluation
}
