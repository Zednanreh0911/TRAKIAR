const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../db');
const { sendPasswordResetCode } = require('../services/emailService');

const RESET_CODE_TTL_MINUTES = 15;

const generateResetCode = () => String(crypto.randomInt(100000, 1000000));

const requestPasswordReset = async (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ error: 'El correo es obligatorio' });
  }

  try {
    const userResult = await pool.query('SELECT id, nombre, correo FROM usuario WHERE correo = $1', [correo]);

    if (userResult.rows.length > 0) {
      const usuario = userResult.rows[0];
      const code = generateResetCode();
      const codeHash = await bcrypt.hash(code, 10);

      await pool.query('DELETE FROM password_reset_tokens WHERE id_usuario = $1 AND used_at IS NULL', [usuario.id]);

      await pool.query(
        `INSERT INTO password_reset_tokens (id_usuario, token_hash, expires_at)
         VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
        [usuario.id, codeHash, RESET_CODE_TTL_MINUTES]
      );

      await sendPasswordResetCode({
        to: usuario.correo,
        name: usuario.nombre,
        code,
      });
    }

    return res.status(200).json({
      message: 'Si el correo existe, recibirás un código para restablecer tu contraseña.',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo solicitar el restablecimiento de contraseña' });
  }
};

const confirmPasswordReset = async (req, res) => {
  const { correo, codigo, nuevaPassword } = req.body;

  if (!correo || !codigo || !nuevaPassword) {
    return res.status(400).json({ error: 'Correo, código y nueva contraseña son obligatorios' });
  }

  try {
    const userResult = await pool.query('SELECT id, password_reset_required FROM usuario WHERE correo = $1', [correo]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Código inválido o vencido' });
    }

    const usuario = userResult.rows[0];
    const tokenResult = await pool.query(
      `SELECT id, token_hash
       FROM password_reset_tokens
       WHERE id_usuario = $1 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [usuario.id]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Código inválido o vencido' });
    }

    const resetToken = tokenResult.rows[0];
    const codeValido = await bcrypt.compare(String(codigo), resetToken.token_hash);

    if (!codeValido) {
      return res.status(400).json({ error: 'Código inválido o vencido' });
    }

    const passwordHash = await bcrypt.hash(nuevaPassword, 10);

    await pool.query(
      `UPDATE usuario
       SET password_hash = $1,
           failed_login_attempts = 0,
           password_reset_required = FALSE
       WHERE id = $2`,
      [passwordHash, usuario.id]
    );

    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [resetToken.id]);

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
  }
};

module.exports = {
  requestPasswordReset,
  confirmPasswordReset,
};