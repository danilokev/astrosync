const Evento = require('../models/eventos');

const getEventos = async (req, res) => {
  try {
    const { tipo, mes } = req.query;

    let filtro = {};

    if (tipo) {
      filtro.tipo = tipo;
    }

    if (mes) {
      const mesNum = parseInt(mes);
      const anyo = new Date().getFullYear();
      const inicio = new Date(anyo, mesNum - 1, 1);
      const fin = new Date(anyo, mesNum, 1);

      filtro.fecha_pico = { $gte: inicio, $lt: fin };
    }

    const eventos = await Evento.find(filtro).sort({ fecha_pico: 1 });

    res.json({
      ok: true,
      data: eventos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: 'Error al obtener los eventos',
    });
  }
};

const getEvento = async (req, res) => {
  try {
    const { id } = req.params;

    const evento = await Evento.findById(id);

    if (!evento) {
      return res.status(404).json({
        ok: false,
        msg: 'Evento no encontrado',
      });
    }

    res.json({
      ok: true,
      data: evento,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        ok: false,
        error: 'Evento no encontrado',
      });
    }
    console.error(error);
    return res.status(500).json({
      ok: false,
      msg: 'Error al obtener evento',
    });
  }
};

const getProximosEventos = async (req, res) => {
  try {
    const ahora = new Date();

    const eventos = await Evento.find({
      fecha_pico: { $gte: ahora },
    })
      .sort({ fecha_pico: 1 })
      .limit(5);

    res.json({
      ok: true,
      data: eventos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: 'Error al obtener próximos eventos',
    });
  }
};

module.exports = {
  getEventos,
  getEvento,
  getProximosEventos,
};
