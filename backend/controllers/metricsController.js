const mongoose = require('mongoose');
const Usuario = require('../models/usuarios');
const Favorito = require('../models/favoritos');
const Foto = require('../models/fotos');

const getRanking = async (req, res) => {
  try {
    // Agregación para contar favoritos por label y tipo, ordenados por count descendente, limitando a top 10
    const ranking = await Favorito.aggregate([
      {
        $match: { tipo: { $in: ['star', 'planet', 'moon', 'constellation'] } },
      },
      {
        $group: {
          _id: '$label',
          tipo: { $first: '$tipo' }, // Tomamos el tipo del primer documento del grupo
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          label: '$_id',
          tipo: 1,
          count: 1,
        },
      },
    ]);

    res.json({ ok: true, data: ranking });
  } catch (error) {
    console.error('Error en ranking:', error);
    res.status(500).json({ ok: false, msg: 'Error al obtener ranking' });
  }
};

// Función para obtener métricas generales y por período
const getOverview = async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days, 10) || 30);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // convierte la fecha a ObjectId para filtrar por _id en lugar de createdAt
    const startDateObjectId = new mongoose.Types.ObjectId(
      Math.floor(startDate.getTime() / 1000)
        .toString(16)
        .padEnd(24, '0'),
    );

    // Ejecuta las tres agregaciones en paralelo para optimizar el tiempo de respuesta
    const [usuariosStats, favoritosByType, fotosStats] = await Promise.all([
      Usuario.aggregate([
        { $match: {} },
        {
          $facet: {
            total: [{ $count: 'count' }],
            beforePeriod: [
              // Cuenta usuarios registrados antes del período
              { $match: { _id: { $lt: startDateObjectId } } },
              { $count: 'count' },
            ],
            lastPeriod: [
              // Cuenta usuarios registrados durante el período, agrupados por día
              { $match: { _id: { $gte: startDateObjectId } } },
              {
                $addFields: { createdAt: { $toDate: '$_id' } },
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                  },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
            activosPeriodo: [
              // Cuenta usuarios activos (con lastLogin) durante el período
              { $match: { lastLogin: { $gte: startDate } } },
              { $count: 'count' },
            ],
          },
        },
      ]),
      Favorito.aggregate([
        {
          $facet: {
            estrellas: [
              { $match: { tipo: 'star', createdAt: { $gte: startDate } } },
              { $count: 'count' },
            ],
            planetas: [
              { $match: { tipo: 'planet', createdAt: { $gte: startDate } } },
              { $count: 'count' },
            ],
            lunas: [
              { $match: { tipo: 'moon', createdAt: { $gte: startDate } } },
              { $count: 'count' },
            ],
          },
        },
      ]),
      Foto.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            ultimos: [
              // Cuenta fotos subidas durante el período, agrupadas por día
              { $match: { fechaSubida: { $gte: startDate } } },
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$fechaSubida' },
                  },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]),
    ]);

    const totalUsuarios = usuariosStats[0].total[0]?.count || 0;
    const baseCount = usuariosStats[0].beforePeriod[0]?.count || 0; // Usuarios registrados antes del período
    const registrosPorDia = usuariosStats[0].lastPeriod;
    const usuariosActivosPeriodo =
      usuariosStats[0].activosPeriodo[0]?.count || 0;
    const totalFotos = fotosStats[0].total[0]?.count || 0;
    const fotosPorDia = fotosStats[0].ultimos;

    // Construye arrays de Labels (fechas) para los últimos n días
    const today = new Date();
    const usuarioLabels = [];
    const usuarioData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const found = registrosPorDia.find((d) => d._id === dateStr);
      usuarioLabels.push(dateStr);
      usuarioData.push(found ? found.count : 0);
    }

    const fotoLabels = [];
    const fotoData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const found = fotosPorDia.find((d) => d._id === dateStr);
      fotoLabels.push(dateStr);
      fotoData.push(found ? found.count : 0);
    }

    // Calcula el acumulado de usuarios registrados durante el período sumando al conteo base
    const cumulativeData = [];
    let cumulative = 0;
    for (const dayCount of usuarioData) {
      cumulative += dayCount;
      cumulativeData.push(baseCount + cumulative);
    }

    res.json({
      ok: true,
      data: {
        totalUsuarios,
        usuariosActivosPeriodo,
        totalFotos,
        favoritos: {
          estrellas: favoritosByType[0].estrellas[0]?.count || 0,
          planetas: favoritosByType[0].planetas[0]?.count || 0,
          lunas: favoritosByType[0].lunas[0]?.count || 0,
        },
        registrosPeriodo: {
          labels: usuarioLabels,
          data: cumulativeData,
        },
        fotosPeriodo: {
          labels: fotoLabels,
          data: fotoData,
        },
        periodDays: days,
      },
    });
  } catch (error) {
    console.error('Error en metrics overview:', error);
    res.status(500).json({
      ok: false,
      msg: 'Error al obtener métricas',
    });
  }
};

module.exports = {
  getOverview,
  getRanking,
};
