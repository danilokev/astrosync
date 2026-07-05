const mongoose = require('mongoose');

const suscripcionSchema = new mongoose.Schema({
  email: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Suscripcion', suscripcionSchema);
