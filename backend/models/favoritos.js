const mongoose = require('mongoose');

const favoritoSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    label: String,
    extract: String,
    wikidataImage: String,
    wikipediaUrl: String,
    tipo: {
      type: String,
      enum: ['star', 'planet', 'moon', 'constellation'],
      default: 'star',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Favorito', favoritoSchema);
