const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const googleLogin = async (req, res) => {
  const { id_token } = req.body;

  if (!id_token) return res.status(400).json({ error: 'id_token es requerido' });

  try {
    const ticket = await client.verifyIdToken({ idToken: id_token, audience: GOOGLE_CLIENT_ID || undefined });
    const payload = ticket.getPayload();
    const sub = payload.sub;
    const email = payload.email;
    const name = payload.name || payload.email;
    const email_verified = payload.email_verified;

    // Buscar por google_sub
    let userRes = await pool.query('SELECT * FROM usuario WHERE google_sub = $1', [sub]);
    let user = userRes.rows[0];

    if (!user) {
      // Buscar por correo
      const byEmail = await pool.query('SELECT * FROM usuario WHERE correo = $1', [email]);
      user = byEmail.rows[0];

      if (user) {
        // Si existe usuario local y el email viene verificado, lo vinculamos a Google
        if (user.auth_provider === 'local') {
          if (!email_verified) {
            return res.status(400).json({ error: 'Email de Google no verificado' });
          }

          await pool.query('UPDATE usuario SET google_sub = $1, auth_provider = $2 WHERE id = $3', [sub, 'google', user.id]);
          user.google_sub = sub;
          user.auth_provider = 'google';
        } else {
          // si auth_provider no es local, simplemente asociamos el google_sub si falta
          if (!user.google_sub) {
            await pool.query('UPDATE usuario SET google_sub = $1 WHERE id = $2', [sub, user.id]);
            user.google_sub = sub;
          }
        }
      } else {
        // Crear nuevo usuario con datos de Google
        const insert = await pool.query(
          `INSERT INTO usuario (nombre, correo, auth_provider, google_sub, tipo_linea, profile_completed)
           VALUES ($1, $2, 'google', $3, $4, $5) RETURNING *`,
          [name, email, sub, null, false]
        );
        user = insert.rows[0];
      }
    }

    // Emitir JWT
    const token = jwt.sign(
      {
        id: user.id,
        rol: user.rol,
        nombre: user.nombre,
        tipoLinea: user.tipo_linea,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({ token });
  } catch (error) {
    console.error('googleLogin error', error);
    return res.status(500).json({ error: 'Error verificando token de Google' });
  }
};

module.exports = { googleLogin };
