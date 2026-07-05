const Foto = require('../models/fotos');
const fs = require('fs');
const path = require('path');

// Obtener todas las fotos del usuario
const getFotos = async (req, res) => {
  try {
    const fotos = await Foto.find({ usuario: req.uid, privada: true })
      .select('titulo thumbnail localizacion fechaCreacion _id')
      .sort({ fechaCreacion: -1 });

    res.json({
      ok: true,
      fotos,
    });
  } catch (err) {
    console.error('Error getFotos:', err);
    res.status(500).json({
      ok: false,
      error: 'Error al obtener las fotos',
    });
  }
};

// Obtener una foto específica
const getFoto = async (req, res) => {
  try {
    const foto = await Foto.findById(req.params.id).populate(
      'usuario',
      'nombre apellidos email',
    );

    if (!foto) {
      return res.status(404).json({
        ok: false,
        error: 'Foto no encontrada',
      });
    }

    // Comprueba que el usuario propietario sea correcto
    if (foto.usuario._id.toString() !== req.uid) {
      return res.status(403).json({
        ok: false,
        error: 'No tienes permiso para acceder a esta foto',
      });
    }

    res.json({
      ok: true,
      foto,
    });
  } catch (err) {
    console.error('Error getFoto:', err);
    res.status(500).json({
      ok: false,
      error: 'Error al obtener la foto',
    });
  }
};

// Crea nueva foto
const createFoto = async (req, res) => {
  try {
    const { titulo, referencias, localizacion, fechaCreacion } = req.body;

    // Comprueba que se ha subido un archivo
    if (!req.processedFile) {
      return res.status(400).json({
        ok: false,
        error: 'Se requiere subir una foto',
      });
    }

    if (!titulo) {
      return res.status(400).json({
        ok: false,
        error: 'El titulo es requerido',
      });
    }

    // Valida y procesa referencias
    let referenciasArray = [];
    if (referencias) {
      if (typeof referencias === 'string') {
        try {
          referenciasArray = JSON.parse(referencias).filter(
            (r) => typeof r === 'string' && r.trim(),
          );
        } catch (error) {
          referenciasArray = [referencias];
        }
      } else if (Array.isArray(referencias)) {
        referenciasArray = referencias.filter(
          (r) => typeof r === 'string' && r.trim(),
        );
      }
    }

    // valida localización
    let localizacionObj = null;
    if (localizacion) {
      try {
        localizacionObj =
          typeof localizacion === 'string'
            ? JSON.parse(localizacion)
            : localizacion;
      } catch (error) {
        return res.status(400).json({
          ok: false,
          error: 'Formato de localización inválido',
        });
      }
    }

    const nuevaFoto = new Foto({
      titulo: titulo.trim(),
      url: req.processedFile.url,
      thumbnail: req.processedFile.thumbnail,
      referencias: referenciasArray,
      localizacion: localizacionObj,
      usuario: req.uid,
      fechaCreacion: fechaCreacion ? new Date(fechaCreacion) : new Date(),
      privada: true,
    });

    await nuevaFoto.save();

    res.status(201).json({
      ok: true,
      msg: 'Foto subida correctamente',
      foto: nuevaFoto,
    });
  } catch (err) {
    // Limpia el archivo
    if (req.processedFile?.url) {
      const uploadDir = process.env.UPLOAD_DIR;
      [req.processedFile.url, req.processedFile.thumbnail].forEach((file) => {
        const filePath = path.join(uploadDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    console.error('Error createFoto:', err);
    res.status(400).json({
      ok: false,
      error: 'Error al crear la foto',
    });
  }
};

// Actualizar metadatos de una foto
const updateFoto = async (req, res) => {
  try {
    const foto = await Foto.findById(req.params.id);

    if (!foto) {
      return res.status(404).json({
        ok: false,
        error: 'Foto no encontrada',
      });
    }

    // Verificar el propietario de la foto
    if (foto.usuario.toString() !== req.uid) {
      return res.status(403).json({
        ok: false,
        error: 'No tienes permiso para modificar esta foto',
      });
    }

    const { titulo, referencias, localizacion, fechaCreacion } = req.body;

    // Actualiza solo los campos permitidos
    if (titulo) foto.titulo = titulo.trim();
    if (referencias) {
      foto.referencias = Array.isArray(referencias)
        ? referencias.filter((r) => typeof r === 'string' && r.trim())
        : [];
    }
    if (localizacion) {
      try {
        foto.localizacion =
          typeof localizacion === 'string'
            ? JSON.parse(localizacion)
            : localizacion;
      } catch (error) {
        return res.status(400).json({
          ok: false,
          error: 'Formato de localización inválido',
        });
      }
    }
    if (fechaCreacion) foto.fechaCreacion = new Date(fechaCreacion);

    const fotoActualizada = await foto.save();

    res.json({
      ok: true,
      msg: 'Foto actualizada correctamente',
      foto: fotoActualizada,
    });
  } catch (err) {
    console.error('Error updateFoto', err);
    res.status(400).json({
      ok: false,
      error: 'Error al actualizar la foto',
    });
  }
};

// Eliminar una foto
const deleteFoto = async (req, res) => {
  try {
    const foto = await Foto.findById(req.params.id);

    if (!foto) {
      return res.status(404).json({
        ok: false,
        error: 'Foto no encontrada',
      });
    }

    if (foto.usuario.toString() !== req.uid) {
      return res.status(403).json({
        ok: false,
        error: 'No tienes permiso para modificar esta foto',
      });
    }

    // Elimina archivos del servidor
    const uploadDir = process.env.UPLOAD_DIR;
    [foto.url, foto.thumbnail].forEach((file) => {
      const filePath = path.join(uploadDir, file);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Elimina de DB
    await Foto.findByIdAndDelete(req.params.id);

    res.json({
      ok: true,
      message: 'Foto eliminada correctamente',
    });
  } catch (err) {
    onsole.error('Error deleteFoto:', err);
    res.status(500).json({
      ok: false,
      error: 'Error al eliminar la foto',
    });
  }
};

module.exports = {
  getFotos,
  getFoto,
  createFoto,
  updateFoto,
  deleteFoto,
};
