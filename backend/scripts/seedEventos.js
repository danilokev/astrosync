#!/usr/bin/env node

/**
 * Script para carga de eventos astronómicos en MongoDB
 * Comandos para cargar los eventos:
 * - npm run seed:eventos
 * - node scripts/seedEventos.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Evento = require('../models/eventos');

const DATA_FILE = path.join(__dirname, '../data/eventos2026_v2.json');
const MONGODB_URI = process.env.MONGODB_URI;

const validarEvento = (evento) => {
  if (!evento.nombre || !evento.tipo || !evento.fecha_pico) {
    throw new Error(
      `Evento inválido: faltan campos obligatorios. Evento: ${evento.nombre}`,
    );
  }

  // Valida tipo de evento
  const tiposValidos = [
    'eclipse_solar',
    'eclipse_lunar',
    'meteor_shower',
    'supermoon',
  ];
  if (!tiposValidos.includes(evento.tipo)) {
    throw new Error(
      `Tipo de evento inválido: ${evento.tipo}. Valores válidos: ${tiposValidos.join(', ')}`,
    );
  }

  // Valida ubicación si existe
  if (evento.ubicacion) {
    if (
      evento.ubicacion.lat !== undefined &&
      (evento.ubicacion.lat < -90 || evento.ubicacion.lat > 90)
    ) {
      throw new Error(`Latitud inválida: ${evento.ubicacion.lat}`);
    }
    if (
      evento.ubicacion.lon !== undefined &&
      (evento.ubicacion.lon < -180 || evento.ubicacion.lon > 180)
    ) {
      throw new Error(`Longitud inválida: ${evento.ubicacion.lon}`);
    }
  }

  return evento;
};

const formatearEvento = (evento) => {
  return {
    nombre: evento.nombre,
    tipo: evento.tipo,
    ubicacion: {
      lat: evento.ubicacion?.lat || null,
      lon: evento.ubicacion?.lon || null,
      nombre: evento.ubicacion?.nombre || null,
    },
    fecha_pico: new Date(evento.fecha_pico),
    fecha_inicio: evento.fecha_inicio ? new Date(evento.fecha_inicio) : null,
    fecha_fin: evento.fecha_fin ? new Date(evento.fecha_fin) : null,
    hora_pico_utc: evento.hora_pico_utc || null,
    mejor_hora_local: evento.mejor_hora_local || null,
    descripcion: evento.descripcion || null,
    imagen_url: evento.imagen_url || null,
    fuente: evento.fuente || 'No especificada',
  };
};

const cargarEventosDelArchivo = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      throw new Error(`Archivo no encontrado: ${DATA_FILE}`);
    }
    const contenido = fs.readFileSync(DATA_FILE, 'utf-8');
    const datos = JSON.parse(contenido);

    if (!Array.isArray(datos.eventos)) {
      throw new Error(
        'Formato inválido: la propiedad "eventos" debe ser un array',
      );
    }

    return datos.eventos;
  } catch (error) {
    throw new Error(`Error al cargar archivo JSON: ${error.message}`);
  }
};

const seedDB = async () => {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI no está definido en .env');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Conectado a MongoDB correctamente\n');

    console.log('Cargando eventos del archivo...');
    const eventosRaw = cargarEventosDelArchivo();
    console.log(`Se encontraron ${eventosRaw.length} eventos en el archivo\n`);

    const eventosFormateados = eventosRaw
      .map((evento, index) => {
        try {
          validarEvento(evento);
          return formatearEvento(evento);
        } catch (error) {
          console.warn(
            `Error en evento ${index + 1} (${evento.nombre}): ${error.message}`,
          );
          return null;
        }
      })
      .filter((evento) => evento !== null);

    if (eventosFormateados.length === 0) {
      throw new Error('No hay eventos válidos para insertar');
    }

    console.log(
      `${eventosFormateados.length} eventos validados correctamente\n`,
    );

    // Limpia colección antes de insertar
    console.log('Limpiando colección anterior...');
    const resultado = await Evento.deleteMany({});
    console.log(`Se eliminaron ${resultado.deletedCount} eventos anteriores\n`);

    // Inserta  eventos
    console.log('Insertando nuevos eventos...');
    const eventosInsertados = await Evento.insertMany(eventosFormateados, {
      ordered: true,
    });
    console.log(
      `${eventosInsertados.length} eventos insertados correctamente\n`,
    );

    console.log('Carga completada...');
  } catch (error) {
    console.error('Error:', error.message);
    console.error('\nDetalles completos:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nConexión a MongoDB cerrada');
  }
};

if (require.main === module) {
  seedDB();
}

module.exports = { seedDB, validarEvento, formatearEvento };
