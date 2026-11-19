const express = require('express');
const { defaultRepository } = require('./db');

function validateLibroPayload(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'El cuerpo de la solicitud es inválido.' };
  }

  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
  const autor = typeof body.autor === 'string' ? body.autor.trim() : '';
  const rawAnio = body.anio_publicacion;

  if (!titulo) {
    return { error: 'El campo "titulo" es obligatorio y no puede estar vacío.' };
  }

  if (!autor) {
    return { error: 'El campo "autor" es obligatorio y no puede estar vacío.' };
  }

  const anioNum =
    typeof rawAnio === 'number'
      ? rawAnio
      : typeof rawAnio === 'string' && rawAnio.trim() !== ''
      ? Number(rawAnio)
      : NaN;

  if (!Number.isInteger(anioNum) || anioNum <= 0) {
    return {
      error: 'El campo "anio_publicacion" debe ser un número entero válido.',
    };
  }

  return {
    value: {
      titulo,
      autor,
      anio_publicacion: anioNum,
    },
  };
}

function createApp(repository = defaultRepository) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'api-catalogo-libros',
      autor: 'Chavarria Nieto Jesus Ymanol',
      version: process.env.APP_VERSION || '1.1.0-ci-cd',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/libros', async (req, res) => {
    try {
      const libros = await repository.findAll();
      res.status(200).json(libros);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener la lista de libros.', details: err.message });
    }
  });

  app.get('/libros/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(404).json({ error: 'Libro no encontrado.' });
      }
      const libro = await repository.findById(id);
      if (!libro) {
        return res.status(404).json({ error: 'Libro no encontrado.' });
      }
      res.status(200).json(libro);
    } catch (err) {
      res.status(500).json({ error: 'Error al consultar el libro.', details: err.message });
    }
  });

  app.post('/libros', async (req, res) => {
    const validation = validateLibroPayload(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const nuevoLibro = await repository.create(validation.value);
      res.status(201).json(nuevoLibro);
    } catch (err) {
      res.status(500).json({ error: 'Error al crear el libro.', details: err.message });
    }
  });

  app.put('/libros/:id', async (req, res) => {
    const validation = validateLibroPayload(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(404).json({ error: 'Libro no encontrado.' });
      }
      const actualizado = await repository.update(id, validation.value);
      if (!actualizado) {
        return res.status(404).json({ error: 'Libro no encontrado.' });
      }
      res.status(200).json(actualizado);
    } catch (err) {
      res.status(500).json({ error: 'Error al actualizar el libro.', details: err.message });
    }
  });

  app.delete('/libros/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(404).json({ error: 'Libro no encontrado.' });
      }
      const eliminado = await repository.remove(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Libro no encontrado.' });
      }
      res.status(200).json({ message: 'Libro eliminado correctamente.', id });
    } catch (err) {
      res.status(500).json({ error: 'Error al eliminar el libro.', details: err.message });
    }
  });

  return app;
}

module.exports = {
  createApp,
  validateLibroPayload,
};
