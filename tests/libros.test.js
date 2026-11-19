const request = require('supertest');
const { createApp } = require('../src/app');

function createInMemoryRepository(initialData = []) {
  let items = [...initialData];
  let nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;

  return {
    async findAll() {
      return [...items];
    },
    async findById(id) {
      return items.find((item) => item.id === Number(id)) || null;
    },
    async create({ titulo, autor, anio_publicacion }) {
      const nuevo = {
        id: nextId++,
        titulo,
        autor,
        anio_publicacion,
      };
      items.push(nuevo);
      return nuevo;
    },
    async update(id, { titulo, autor, anio_publicacion }) {
      const index = items.findIndex((item) => item.id === Number(id));
      if (index === -1) return null;
      items[index] = {
        id: Number(id),
        titulo,
        autor,
        anio_publicacion,
      };
      return items[index];
    },
    async remove(id) {
      const index = items.findIndex((item) => item.id === Number(id));
      if (index === -1) return false;
      items.splice(index, 1);
      return true;
    },
  };
}

describe('API Catálogo de Libros (con doble de prueba sin RDS real)', () => {
  let app;
  let mockRepo;

  beforeEach(() => {
    mockRepo = createInMemoryRepository([
      {
        id: 1,
        titulo: 'Cien años de soledad',
        autor: 'Gabriel García Márquez',
        anio_publicacion: 1967,
      },
    ]);
    app = createApp(mockRepo);
  });

  test('GET /health devuelve 200 y confirma que el servicio está activo', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'api-catalogo-libros');
  });

  test('GET /libros devuelve 200 y la lista de libros', async () => {
    const res = await request(app).get('/libros');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].titulo).toBe('Cien años de soledad');
  });

  test('POST /libros crea un libro válido y responde 201 con el registro creado', async () => {
    const payload = {
      titulo: 'El amor en los tiempos del cólera',
      autor: 'Gabriel García Márquez',
      anio_publicacion: 1985,
    };

    const res = await request(app).post('/libros').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 2,
      ...payload,
    });
  });

  test('POST /libros rechaza datos inválidos con 400 (titulo o autor vacío, o anio_publicacion no entero)', async () => {
    const resTituloVacio = await request(app).post('/libros').send({
      titulo: '   ',
      autor: 'Mario Vargas Llosa',
      anio_publicacion: 1963,
    });
    expect(resTituloVacio.status).toBe(400);

    const resAutorVacio = await request(app).post('/libros').send({
      titulo: 'La ciudad y los perros',
      autor: '',
      anio_publicacion: 1963,
    });
    expect(resAutorVacio.status).toBe(400);

    const resAnioInvalido = await request(app).post('/libros').send({
      titulo: 'La ciudad y los perros',
      autor: 'Mario Vargas Llosa',
      anio_publicacion: 'no-es-un-entero',
    });
    expect(resAnioInvalido.status).toBe(400);
  });

  test('GET /libros/:id devuelve 200 si existe y 404 al consultar un libro inexistente', async () => {
    const resOk = await request(app).get('/libros/1');
    expect(resOk.status).toBe(200);
    expect(resOk.body.id).toBe(1);

    const resNotFound = await request(app).get('/libros/999');
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body).toHaveProperty('error');
  });

  test('PUT /libros/:id actualiza un libro existente (200) y devuelve 404 si no existe', async () => {
    const updateData = {
      titulo: 'Cien años de soledad (Edición Conmemorativa)',
      autor: 'Gabriel García Márquez',
      anio_publicacion: 2007,
    };

    const resOk = await request(app).put('/libros/1').send(updateData);
    expect(resOk.status).toBe(200);
    expect(resOk.body.titulo).toBe(updateData.titulo);

    const resNotFound = await request(app).put('/libros/999').send(updateData);
    expect(resNotFound.status).toBe(404);
  });

  test('DELETE /libros/:id elimina un libro existente (200) y devuelve 404 si no existe', async () => {
    const resOk = await request(app).delete('/libros/1');
    expect(resOk.status).toBe(200);

    const resNotFound = await request(app).delete('/libros/1');
    expect(resNotFound.status).toBe(404);
  });
});
