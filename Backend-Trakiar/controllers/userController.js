const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me';

const buildToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      rol: user.rol,
      nombre: user.nombre,
      tipoLinea: user.tipo_linea,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

// Controlador para registrar usuarios
const registerUser = async (req, res) => {
  const { nombre, correo, password, tipoLinea = 'natural' } = req.body;

  // Validar que los campos requeridos estén presentes
  if (!nombre || !correo || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const tipoLineaNormalizado = String(tipoLinea).toLowerCase();
  if (!['natural', 'estudiantes'].includes(tipoLineaNormalizado)) {
    return res.status(400).json({ error: 'El tipo de pasajero es inválido' });
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
      'INSERT INTO usuario (nombre, correo, password_hash, tipo_linea, profile_completed) VALUES ($1, $2, $3, $4, TRUE) RETURNING *',
      [nombre, correo, passwordHash, tipoLineaNormalizado]
    );

    res.status(201).json({ message: 'Usuario registrado exitosamente', usuario: nuevoUsuario.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
};

const updateMyProfile = async (req, res) => {
  const { tipoLinea } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const tipoLineaNormalizado = String(tipoLinea || '').toLowerCase();
  if (!['natural', 'estudiantes'].includes(tipoLineaNormalizado)) {
    return res.status(400).json({ error: 'El tipo de pasajero es inválido' });
  }

  try {
    const updatedUserResult = await pool.query(
      `UPDATE usuario
       SET tipo_linea = $1,
           profile_completed = TRUE
       WHERE id = $2
       RETURNING *`,
      [tipoLineaNormalizado, userId]
    );

    if (updatedUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const updatedUser = updatedUserResult.rows[0];
    const token = buildToken(updatedUser);

    return res.status(200).json({ message: 'Perfil actualizado', token, usuario: updatedUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
};

const changeMyPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'La contraseña actual y la nueva son obligatorias' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const userResult = await pool.query('SELECT id, password_hash FROM usuario WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = userResult.rows[0];
    const currentPasswordValid = await bcrypt.compare(currentPassword, usuario.password_hash || '');

    if (!currentPasswordValid) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE usuario
       SET password_hash = $1,
           password_reset_required = FALSE,
           failed_login_attempts = 0
       WHERE id = $2`,
      [passwordHash, userId]
    );

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al actualizar la contraseña' });
  }
};

const toggleMyStatus = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM usuario WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const currentUser = userResult.rows[0];
    const nextTipoLinea = currentUser.tipo_linea === 'estudiantes' ? 'natural' : 'estudiantes';

    const updatedUserResult = await pool.query(
      `UPDATE usuario
       SET tipo_linea = $1,
           profile_completed = TRUE
       WHERE id = $2
       RETURNING *`,
      [nextTipoLinea, userId]
    );

    const updatedUser = updatedUserResult.rows[0];
    const token = buildToken(updatedUser);

    return res.status(200).json({
      message: 'Estatus actualizado correctamente',
      token,
      usuario: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al actualizar el estatus' });
  }
};

module.exports = { registerUser, updateMyProfile, changeMyPassword, toggleMyStatus };