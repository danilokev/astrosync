const mongoose = require("mongoose");

const planetaSchema = new mongoose.Schema({
  nombre: String,
  masa: String,
  distancia_sol: String,
  tamano: String,
  lunas: [String],
  tipo: String,
  grupo: String,
  open_tab: Boolean,
  distancia_tierra: String,
  gravedad: String,
  anyo: String,
  dia: String,
  edad: String,
  temperatura: String,
  curiosidades: Array,
  descripcion: String,
  mas_info: {
    nasa: Array,
    wikipedia: String,
    national_geographyc: String
  },
  mitologia: String,
  num_lunas: Number
});

module.exports = mongoose.model(
  "Planeta",
  planetaSchema,
  "datos_planetas"
);