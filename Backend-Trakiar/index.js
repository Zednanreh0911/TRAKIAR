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

const allowedOrigins = [
  'http://localhost:19006',
  'http://127.0.0.1:19006',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8082',
  'http://127.0.0.1:8082'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requests sin origin (apps móviles, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
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

