const mongoose = require("mongoose");

const FactSchema = new mongoose.Schema({
  texto: { type: String, required: true },
  etiquetas: [String] // opcional para asociar temas (e.g. "venus", "grecia", "mitologia")
});

module.exports = mongoose.model("Fact", FactSchema);