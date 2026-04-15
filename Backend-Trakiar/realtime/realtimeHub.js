const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me';
const ACTIVE_ROUTE_TTL_MS = 90 * 1000;

const managerSocketsByLine = new Map();
const activeRoutesByLine = new Map();

const toIso = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const getLineManagersSet = (lineId) => {
  if (!managerSocketsByLine.has(lineId)) {
    managerSocketsByLine.set(lineId, new Set());
  }

  return managerSocketsByLine.get(lineId);
};

const getActiveRoutesMap = (lineId) => {
  if (!activeRoutesByLine.has(lineId)) {
    activeRoutesByLine.set(lineId, new Map());
  }

  return activeRoutesByLine.get(lineId);
};

const buildSnapshot = (lineId) => {
  const routesMap = getActiveRoutesMap(lineId);

  return Array.from(routesMap.values())
    .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime())
    .map((route) => ({ ...route }));
};

const cleanupStaleRoutes = (lineId) => {
  const routesMap = getActiveRoutesMap(lineId);
  const now = Date.now();

  for (const [routeId, routeData] of routesMap.entries()) {
    const age = now - new Date(routeData.lastUpdate).getTime();
    if (age > ACTIVE_ROUTE_TTL_MS) {
      routesMap.delete(routeId);
    }
  }
};

const sendJson = (socket, payload) => {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(payload));
  }
};

const broadcastToLineManagers = (lineId, payload) => {
  const managerSockets = getLineManagersSet(lineId);

  managerSockets.forEach((socket) => {
    sendJson(socket, payload);
  });
};

const registerActiveRouteUpdate = ({
  idLinea,
  idRuta,
  nombreRuta,
  idUnidad,
  unidadIdentificador,
  choferNombre,
  choferCorreo,
  latitud,
  longitud,
  velocidadKmh = null,
  capturedAt,
}) => {
  const lineId = Number(idLinea);
  const routeId = Number(idRuta);
  const pointTimeIso = toIso(capturedAt) || new Date().toISOString();

  cleanupStaleRoutes(lineId);

  const routesMap = getActiveRoutesMap(lineId);
  const previous = routesMap.get(routeId);
  const next = {
    idLinea: lineId,
    idRuta: routeId,
    nombreRuta,
    idUnidad,
    unidadIdentificador,
    chofer: {
      nombre: choferNombre,
      correo: choferCorreo,
    },
    lastUpdate: pointTimeIso,
    totalPuntosRecibidos: (previous?.totalPuntosRecibidos || 0) + 1,
    ultimaUbicacion: {
      latitud,
      longitud,
      velocidadKmh,
      capturedAt: pointTimeIso,
    },
  };

  routesMap.set(routeId, next);

  broadcastToLineManagers(lineId, {
    type: 'driver_location',
    data: next,
  });
};

const getGerenteLinea = async (idUsuario) => {
  const line = await pool.query('SELECT id_linea FROM gerente_linea WHERE id_usuario = $1 LIMIT 1', [idUsuario]);
  return line.rows[0] || null;
};

const getDriverRealtimeScope = async (idUsuario, idRuta) => {
  const result = await pool.query(
    `SELECT
      un.id_linea,
      un.id AS id_unidad,
      un.identificador AS unidad_identificador,
      r.id AS id_ruta,
      r.nombre AS ruta_nombre,
      us.nombre AS chofer_nombre,
      us.correo AS chofer_correo
    FROM usuario us
    INNER JOIN chofer ch ON ch.id_usuario = us.id
    INNER JOIN unidad un ON un.id_chofer = ch.id
    INNER JOIN ruta r ON r.id = $2 AND r.id_linea = un.id_linea
    WHERE us.id = $1
    LIMIT 1`,
    [idUsuario, idRuta]
  );

  return result.rows[0] || null;
};

const handleDriverLocationMessage = async (socket, payload) => {
  const idRuta = Number(payload?.idRuta);
  const latitud = Number(payload?.latitud);
  const longitud = Number(payload?.longitud);

  if (!Number.isFinite(idRuta) || !Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    sendJson(socket, { type: 'error', message: 'Mensaje inválido: idRuta, latitud y longitud son obligatorios.' });
    return;
  }

  const driverScope = await getDriverRealtimeScope(socket.user.id, idRuta);
  if (!driverScope) {
    sendJson(socket, { type: 'error', message: 'No se pudo validar la ruta para el chofer autenticado.' });
    return;
  }

  const velocidadRaw = payload?.velocidadKmh;
  const velocidadKmh = velocidadRaw == null ? null : Number(velocidadRaw);

  registerActiveRouteUpdate({
    idLinea: driverScope.id_linea,
    idRuta: driverScope.id_ruta,
    nombreRuta: driverScope.ruta_nombre,
    idUnidad: driverScope.id_unidad,
    unidadIdentificador: driverScope.unidad_identificador,
    choferNombre: driverScope.chofer_nombre,
    choferCorreo: driverScope.chofer_correo,
    latitud,
    longitud,
    velocidadKmh: Number.isFinite(velocidadKmh) ? velocidadKmh : null,
    capturedAt: payload?.capturedAt,
  });
};

const attachRealtimeHub = (server) => {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (socket, req) => {
    try {
      const requestUrl = new URL(req.url, 'http://localhost');
      const token = requestUrl.searchParams.get('token');

      if (!token) {
        sendJson(socket, { type: 'error', message: 'Falta token en la conexión WebSocket.' });
        socket.close(1008, 'Token requerido');
        return;
      }

      const user = jwt.verify(token, JWT_SECRET);
      socket.user = user;

      if (user.rol === 'gerente') {
        const line = await getGerenteLinea(user.id);
        if (!line?.id_linea) {
          sendJson(socket, { type: 'error', message: 'Gerente sin línea asignada.' });
          socket.close(1008, 'Sin línea');
          return;
        }

        socket.idLinea = Number(line.id_linea);
        getLineManagersSet(socket.idLinea).add(socket);
        cleanupStaleRoutes(socket.idLinea);

        sendJson(socket, {
          type: 'active_routes_snapshot',
          data: {
            idLinea: socket.idLinea,
            rutas: buildSnapshot(socket.idLinea),
          },
        });

        sendJson(socket, { type: 'connected', role: 'gerente' });
      } else if (user.rol === 'chofer') {
        sendJson(socket, { type: 'connected', role: 'chofer' });
      } else {
        sendJson(socket, { type: 'error', message: 'Rol no autorizado para WebSocket.' });
        socket.close(1008, 'Rol no permitido');
        return;
      }

      socket.on('message', async (rawMessage) => {
        try {
          const message = JSON.parse(rawMessage.toString());

          if (socket.user.rol === 'chofer' && message?.type === 'driver_location') {
            await handleDriverLocationMessage(socket, message?.data || {});
          }
        } catch (error) {
          console.error('Error procesando mensaje WebSocket:', error);
          sendJson(socket, { type: 'error', message: 'No se pudo procesar el mensaje WebSocket.' });
        }
      });

      socket.on('close', () => {
        if (socket.user?.rol === 'gerente' && socket.idLinea) {
          getLineManagersSet(socket.idLinea).delete(socket);
        }
      });
    } catch (error) {
      console.error('Error en conexión WebSocket:', error);
      sendJson(socket, { type: 'error', message: 'No se pudo autenticar conexión WebSocket.' });
      socket.close(1008, 'Autenticación inválida');
    }
  });

  return {
    publishDriverLocation: registerActiveRouteUpdate,
  };
};

module.exports = {
  attachRealtimeHub,
};
