const Suscripcion = require('../models/suscripcion');

const createSuscripcion = async (req, res) => {
  try {
    const nueva = new Suscripcion(req.body);
    await nueva.save();
    res.status(201).json(nueva);
  } catch (err) {
    res.status(400).json({ error: 'Error al crear la suscripción' });
  }
};

const deleteSuscripcion = async (req, res) => {
  try {
    await Suscripcion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Suscripción eliminada' });
  } catch (err) {
    res.status(400).json({ error: 'Error al eliminar la suscripción' });
  }
};

module.exports = {
  createSuscripcion,
  deleteSuscripcion
};
