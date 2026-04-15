const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me';

// Middleware para verificar el token JWT
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified; // Agregar los datos del usuario al objeto req
    next();
  } catch (error) {
    res.status(400).json({ error: 'Token inválido.' });
  }
};

module.exports = verifyToken;