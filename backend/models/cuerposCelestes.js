const mongoose = require('mongoose');

const licenciaSchema = new mongoose.Schema({
  attributionRequired: {
    type: Boolean,
    default: false,
  },
  artist: {
    name: { type: String, default: '' },
    text: { type: String, default: '' },
    profileUrl: { type: String, default: '' },
  },
  license: { type: String, default: '' },
  licenseUrl: { type: String, default: '' },
});

const cuerpoCelestesSchema = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'El nombre del planeta es obligatorio'],
    trim: true,
  },
  wikidataImage: {
    type: String,
    default: '',
    trim: true,
  },
  wikidataImageFileUrl: {
    type: String,
    default: '', // url de la imagen en Wikimedia Commons
    trim: true,
  },
  wikipediaUrl: {
    type: String,
    default: '',
    trim: true,
  },
  extract: {
    type: String,
    default: '',
    trim: true,
  },
  download: {
    type: String,
    default: '', // url del archivo descargable si aplica
  },
  wikidataLicense: {
    type: licenciaSchema,
    default: () => ({}),
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('CuerposCelestes', cuerpoCelestesSchema);

