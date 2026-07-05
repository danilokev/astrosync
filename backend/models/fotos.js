const mongoose = require('mongoose');

const fotoSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    referencias: [
      {
        type: String,
        trim: true,
      },
    ],
    localizacion: {
      nombre: String,
      latitud: Number,
      longitud: Number,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    fechaCreacion: {
      type: Date,
      default: Date.now,
      required: true,
    },
    fechaSubida: {
      type: Date,
      default: Date.now,
    },
    privada: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

fotoSchema.index({ usuario: 1, fechaCreacion: -1 });
fotoSchema.index({ fechaSubida: -1 });

module.exports = mongoose.model('Foto', fotoSchema);
