const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!pool) {
    const sslConfig =
      process.env.DB_SSL === 'false'
        ? undefined
        : { rejectUnauthorized: false };

    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: sslConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

const defaultRepository = {
  async findAll() {
    const [rows] = await getPool().execute(
      'SELECT id, titulo, autor, anio_publicacion FROM libros ORDER BY id ASC'
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await getPool().execute(
      'SELECT id, titulo, autor, anio_publicacion FROM libros WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async create({ titulo, autor, anio_publicacion }) {
    const [result] = await getPool().execute(
      'INSERT INTO libros (titulo, autor, anio_publicacion) VALUES (?, ?, ?)',
      [titulo, autor, anio_publicacion]
    );
    return {
      id: result.insertId,
      titulo,
      autor,
      anio_publicacion,
    };
  },

  async update(id, { titulo, autor, anio_publicacion }) {
    const [result] = await getPool().execute(
      'UPDATE libros SET titulo = ?, autor = ?, anio_publicacion = ? WHERE id = ?',
      [titulo, autor, anio_publicacion, id]
    );
    if (result.affectedRows === 0) {
      return null;
    }
    return {
      id: Number(id),
      titulo,
      autor,
      anio_publicacion,
    };
  },

  async remove(id) {
    const [result] = await getPool().execute(
      'DELETE FROM libros WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = {
  getPool,
  defaultRepository,
};
