const mongoose = require('mongoose');

const localizacionSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },

    latitud: {
      type: Number,
      required: true
    },

    longitud: {
      type: Number,
      required: true
    },

    favorita: {
      type: Boolean,
      default: true   // 👈 al crear desde marker, ya es favorita
    },

    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Localizacion', localizacionSchema);
