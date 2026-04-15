const bcrypt = require('bcrypt');
const pool = require('../db');

// Controlador para registrar usuarios
const registerUser = async (req, res) => {
  const { nombre, correo, password } = req.body;

  // Validar que los campos requeridos estén presentes
  if (!nombre || !correo || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Verificar si el correo ya está registrado
    const correoExistente = await pool.query('SELECT * FROM usuario WHERE correo = $1', [correo]);
    if (correoExistente.rows.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar el usuario en la base de datos
    const nuevoUsuario = await pool.query(
      'INSERT INTO usuario (nombre, correo, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [nombre, correo, passwordHash]
    );

    res.status(201).json({ message: 'Usuario registrado exitosamente', usuario: nuevoUsuario.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
};

module.exports = { registerUser };