// -------------------------------------
// Esquema para la colección de estrellas
// -------------------------------------


const { Schema, model } = require('mongoose');

const StarSchema = Schema(
  {
    id: {
      type: Number,
      required: true,
    },
    hip: {
      type: Number,
      required: false,
    },
    hd: {
      type: Number,
      required: false,
    },
    hr: {
      type: Number,
      required: false,
    },
    gl: {
      type: String,
      required: false,
    },
    bf: {
      type: String,
      required: false,
    },
    proper: {
      type: String,
      required: false,
    },
    ra: {
      type: Number,
      required: true,
    },
    dec: {
      type: Number,
      required: true,
    },
    pmra: {
      type: Number,
      required: false,
    },
    pmdec: {
      type: Number,
      required: false,
    },
    dist: {
      type: Number,
      required: true,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    z: {
      type: Number,
      required: true,
    },
    con: {
      type: String,
      required: false,
    },
    bayer: {
      type: String,
      required: false,
    },
    ci: {
      type: Number,
      required: false,
    },
    spect: {
      type: String,
      required: false,
    },
    mag: {
      type: Number,
      required: false,
    }
  },
  { collection: 'estrellas' }
  // { collection: 'stars' } // Otra para probar import
);

module.exports = model('Star', StarSchema);
