const Favorito = require('../models/favoritos');
const Constelaciones = require('../models/constelaciones');

const getFavoritos = async (req, res) => {
  try {
    const favs = await Favorito.find({ usuario: req.uid }).sort({
      createdAt: -1,
    });
    res.json(favs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los favoritos' });
  }
};

const addFavorito = async (req, res) => {
  try {
    const { label, extract, wikidataImage, wikipediaUrl, tipo } = req.body;

    if (!label) return res.status(400).json({ error: 'Label requerido' });

    // Validar tipo
    const tiposValidos = ['star', 'planet', 'moon', 'constellation'];
    const tipoValido = tiposValidos.includes(tipo) ? tipo : 'star';

    // Si no hay tipo o es 'star', verificar si existe en Constelaciones
    let tipoFinal = tipoValido;
    if (!tipo || tipoValido === 'star') {
      const existeEnConstelaciones = await Constelaciones.findOne({ label });
      if (existeEnConstelaciones) {
        tipoFinal = 'constellation';
      }
    }

    // Evitar duplicados
    const existe = await Favorito.findOne({ usuario: req.uid, label });
    if (existe) return res.status(400).json({ error: 'Favorito ya existe' });

    const nuevo = await Favorito.create({
      usuario: req.uid,
      label,
      extract,
      wikidataImage,
      wikipediaUrl,
      tipo: tipoFinal,
    });

    res.status(201).json(nuevo);
  } catch (err) {
    console.error('Error creando favorito:', err);
    res.status(500).json({ error: 'Error al crear favorito' });
  }
};

const deleteFavorito = async (req, res) => {
  try {
    const eliminado = await Favorito.findOneAndDelete({
      _id: req.params.id,
      usuario: req.uid,
    });

    if (!eliminado)
      return res.status(404).json({ error: 'Favorito no encontrado' });

    res.json({ message: 'Favorito eliminado' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Error al eliminar favorito' });
  }
};

module.exports = {
  getFavoritos,
  addFavorito,
  deleteFavorito,
};
