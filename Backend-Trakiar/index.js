const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes');
const setupSwagger = require('./swagger');
const { attachRealtimeHub } = require('./realtime/realtimeHub');

const app = express();
const PORT = 3000;
const server = http.createServer(app);

const corsOptions = {
  origin: (origin, callback) => {
    // Permite todos los orígenes (incluye apps móviles, Postman, curl y frontends externos)
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware para parsear JSON
app.use(cors(corsOptions));
app.use(express.json());

// Configurar Swagger UI
setupSwagger(app);

// Rutas
app.use('/api/users', userRoutes);

// Ruta básica para probar el servidor
app.get('/', (req, res) => {
  res.send('¡Servidor funcionando correctamente!');
});

attachRealtimeHub(server);

// Iniciar el servidor
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`WebSocket activo en ws://localhost:${PORT}/ws`);
});

