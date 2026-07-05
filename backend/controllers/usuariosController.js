// ------------------------------------
// Controlador de Usuarios
// ------------------------------------
const Usuario = require('../models/usuarios');

exports.getUsuarios = async (req, res) => {
  try {
    // Paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtros
    const { nombre, apellidos, email, rol, search } = req.query;

    const filtros = {};

    if (nombre) {
      filtros.nombre = { $regex: nombre, $options: 'i' }; // búsqueda parcial
    }

    if (apellidos) {
      filtros.apellidos = { $regex: apellidos, $options: 'i' };
    }

    if (email) {
      filtros.email = { $regex: email, $options: 'i' };
    }

    if (rol) {
      filtros.rol = rol; // exact match
    }

    // Búsqueda universal por nombre, apellidos y email
    if (search) {
      const palabras = search.trim().split(/\s+/);

      if (Object.keys(filtros).length > 0) {
        filtros.$and = [
          ...Object.entries(filtros).map(([key, value]) => ({ [key]: value })),
          ...palabras.map((palabra) => ({
            $or: [
              { nombre: { $regex: palabra, $options: 'i' } },
              { apellidos: { $regex: palabra, $options: 'i' } },
              { email: { $regex: palabra, $options: 'i' } },
            ],
          })),
        ];
      } else {
        filtros.$and = palabras.map((palabra) => ({
          $or: [
            { nombre: { $regex: palabra, $options: 'i' } },
            { apellidos: { $regex: palabra, $options: 'i' } },
            { email: { $regex: palabra, $options: 'i' } },
          ],
        }));
      }
    }

    // Query
    const [usuarios, total] = await Promise.all([
      Usuario.find(filtros)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Usuario.countDocuments(filtros),
    ]);

    res.json({
      data: usuarios,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// GET → Obtener un usuario por ID
exports.getUsuarioById = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-password');
    if (!usuario)
      return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (error) {
    res.status(400).json({ message: 'ID no válido' });
  }
};

// PUT → Modificar un usuario
exports.putUsuario = async (req, res) => {
  try {
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      req.params.id,
      { $set: req.body }, // actualizamos solo los campos pasados
      {
        new: true,
        runValidators: true,
      },
    );

    if (!usuarioActualizado) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(usuarioActualizado);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'ID no válido' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// DELETE → Eliminar usuario
exports.deleteUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    if (!usuario)
      return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};
