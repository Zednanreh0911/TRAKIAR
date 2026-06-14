const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me';
const MAX_FAILED_LOGIN_ATTEMPTS = 5;

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

    const usuarioActual = usuario.rows[0];

    if (usuarioActual.password_reset_required) {
      return res.status(403).json({
        error: 'Tu cuenta fue bloqueada por seguridad. Debes restablecer tu contraseña para poder ingresar.',
      });
    }

    if (!usuarioActual.password_hash) {
      return res.status(403).json({
        error: 'Esta cuenta no tiene contraseña local. Debes iniciar sesión con Google o restablecer la contraseña.',
      });
    }

    // Verificar la contraseña
    const passwordValido = await bcrypt.compare(password, usuarioActual.password_hash);
    if (!passwordValido) {
      const failedAttempts = (usuarioActual.failed_login_attempts || 0) + 1;
      const shouldLockAccount = failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

      await pool.query(
        `UPDATE usuario
         SET failed_login_attempts = $1,
             password_reset_required = CASE WHEN $2 THEN TRUE ELSE password_reset_required END
         WHERE id = $3`,
        [failedAttempts, shouldLockAccount, usuarioActual.id]
      );

      if (shouldLockAccount) {
        return res.status(403).json({
          error: 'Tu cuenta fue bloqueada por seguridad. Debes restablecer tu contraseña para poder ingresar.',
        });
      }

      return res.status(400).json({ error: 'Correo o contraseña incorrectos' });
    }

    await pool.query(
      `UPDATE usuario
       SET failed_login_attempts = 0
       WHERE id = $1`,
      [usuarioActual.id]
    );

    // Generar el token JWT
    const token = jwt.sign(
      {
        id: usuarioActual.id,
        rol: usuarioActual.rol,
        nombre: usuarioActual.nombre,
        tipoLinea: usuarioActual.tipo_linea,
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