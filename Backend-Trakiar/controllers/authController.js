const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me';

// Controlador para iniciar sesión
const loginUser = async (req, res) => {
  const { correo, password } = req.body;

  // Validar que los campos requeridos estén presentes
  if (!correo || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Verificar si el usuario existe
    const usuario = await pool.query('SELECT * FROM usuario WHERE correo = $1', [correo]);
    if (usuario.rows.length === 0) {
      return res.status(400).json({ error: 'Correo o contraseña incorrectos' });
    }

    // Verificar la contraseña
    const passwordValido = await bcrypt.compare(password, usuario.rows[0].password_hash);
    if (!passwordValido) {
      return res.status(400).json({ error: 'Correo o contraseña incorrectos' });
    }

    // Generar el token JWT
    const token = jwt.sign(
      {
        id: usuario.rows[0].id,
        rol: usuario.rows[0].rol,
        nombre: usuario.rows[0].nombre,
        tipoLinea: usuario.rows[0].tipo_linea,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Inicio de sesión exitoso', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

module.exports = { loginUser };