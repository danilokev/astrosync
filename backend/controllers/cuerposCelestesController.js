// ------------------------------------
// Controlador de Cuerpos Celestes
// ------------------------------------
const CuerpoCeleste = require('../models/cuerposCelestes');

// GET → Obtener todos los cuerpos celestes
exports.getCuerpos = async (req, res) => {
  try {
    const cuerpos = await CuerpoCeleste.find();
    res.json(cuerpos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener cuerpos celestes' });
  }
};

// GET → Obtener uno por ID
exports.getCuerpoById = async (req, res) => {
  try {
    const cuerpo = await CuerpoCeleste.findById(req.params.id);
    if (!cuerpo) return res.status(404).json({ message: 'Cuerpo celeste no encontrado' });
    res.json(cuerpo);
  } catch (error) {
    res.status(400).json({ message: 'ID no válido' });
  }
};

// POST → Crear nuevo
exports.createCuerpo = async (req, res) => {
  try {
    const nuevoCuerpo = new CuerpoCeleste(req.body);
    await nuevoCuerpo.save();
    res.status(201).json(nuevoCuerpo);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear cuerpo celeste', error });
  }
};

// PUT → Actualizar
exports.updateCuerpo = async (req, res) => {
  try {
    const cuerpo = await CuerpoCeleste.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cuerpo) return res.status(404).json({ message: 'Cuerpo celeste no encontrado' });
    res.json(cuerpo);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar cuerpo celeste', error });
  }
};

exports.updateCuerpoFoto = async (req, res) => {
  try {
    const cuerpo = await CuerpoCeleste.findByIdAndUpdate(req.params.id, { wikidataImage: req.body.foto }, { new: true });
    if (!cuerpo) return res.status(404).json({ message: 'Cuerpo celeste no encontrado' });
    res.json(cuerpo);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar cuerpo celeste', error });
  }
};

// DELETE → Eliminar
exports.deleteCuerpo = async (req, res) => {
  try {
    const cuerpo = await CuerpoCeleste.findByIdAndDelete(req.params.id);
    if (!cuerpo) return res.status(404).json({ message: 'Cuerpo celeste no encontrado' });
    res.json({ message: 'Cuerpo celeste eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar cuerpo celeste' });
  }


};

  // GET /cuerposCelestes/search?term=mar
exports.searchCuerposCelestes = async (req, res) => {
  const { term = '' } = req.query;

  const results = await CuerpoCeleste.find({
    label: { $regex: term, $options: 'i' }
  }).limit(10);

  res.json({
    success: true,
    data: results
  });
};
