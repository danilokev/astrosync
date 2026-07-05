const mongoose = require('mongoose');

const EventoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    tipo: {
      type: String,
      required: true,
      enum: ['eclipse_solar', 'eclipse_lunar', 'meteor_shower', 'supermoon'],
      index: true,
    },
    ubicacion: {
      lat: {
        type: Number,
        required: false,
        min: -90,
        max: 90,
      },
      lon: {
        type: Number,
        required: false,
        min: -180,
        max: 180,
      },
      nombre: {
        type: String,
        require: false,
      },
    },
    fecha_pico: {
      type: Date,
      required: true,
      index: true,
    },
    fecha_inicio: {
      type: Date,
      required: false,
    },
    fecha_fin: {
      type: Date,
      required: false,
    },
    hora_pico_utc: {
      type: String,
      required: false,
      match: /^\d{2}:\d{2}$/, // Formato: HH:MM
    },
    mejor_hora_local: {
      type: String,
      required: false,
      match: /^\d{2}:\d{2}-\d{2}:\d{2}$/, // Formato: HH:MM-HH:MM
    },
    descripcion: {
      type: String,
      required: false,
      trim: true,
    },
    imagen_url: {
      type: String,
      required: false,
    },
    fuente: {
      type: String,
      required: true,
    },
  },
  { collection: 'eventos' },
);

EventoSchema.methods.toJSON = function () {
  const { __v, ...object } = this.toObject();
  return object;
};

module.exports = mongoose.model('Evento', EventoSchema);
