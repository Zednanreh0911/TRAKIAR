const express = require('express');
const { registerUser } = require('../controllers/userController');
const { loginUser } = require('../controllers/authController');
const {
  promoteToDriver,
  demoteDriverToUser,
  getDriverProfile,
  getDriverRoutes,
  registerDriverLocation,
  registerDriverLocationsBatch,
} = require('../controllers/driverController');
const {
  createUnit,
  listUnitsByLine,
  assignUnitToDriver,
  updateUnitDriver,
  deleteUnit,
  updateUnitStatus,
} = require('../controllers/unitController');
const { getManagerStats } = require('../controllers/managerStatsController');
const {
  addRoute,
  listRoutesByLine,
  searchRoutes,
  listPublicRoutesCatalog,
  estimateEtaToNearestStop,
  editRoute,
  deleteRoute,
} = require('../controllers/routeController');
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();

// Ruta para registrar usuarios
router.post('/register', registerUser);

// Ruta para iniciar sesión
router.post('/login', loginUser);

// Ruta protegida de ejemplo
router.get('/protected', verifyToken, (req, res) => {
  res.status(200).json({ message: 'Acceso permitido', user: req.user });
});

// Ruta para promover usuarios a choferes
router.post('/promote-to-driver', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, promoteToDriver);

// Ruta para degradar chofer a usuario
router.post('/demote-driver', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, demoteDriverToUser);

// Ruta para obtener perfil de chofer autenticado
router.get('/driver-profile', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'chofer') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los choferes pueden realizar esta acción.' });
  }
  next();
}, getDriverProfile);

// Ruta para obtener rutas disponibles del chofer (según su línea)
router.get('/driver-routes', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'chofer') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los choferes pueden realizar esta acción.' });
  }
  next();
}, getDriverRoutes);

// Ruta para registrar ubicación en tiempo real del chofer
router.post('/driver-location', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'chofer') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los choferes pueden realizar esta acción.' });
  }
  next();
}, registerDriverLocation);

// Ruta para registrar lote de ubicaciones del chofer al finalizar ruta
router.post('/driver-locations-batch', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'chofer') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los choferes pueden realizar esta acción.' });
  }
  next();
}, registerDriverLocationsBatch);

// Ruta para crear unidades
router.post('/create-unit', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, createUnit);

// Ruta para listar unidades por línea del gerente
router.get('/units-by-line', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, listUnitsByLine);

// Ruta para asignar unidades a choferes
router.post('/assign-unit', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, assignUnitToDriver);

// Ruta para cambiar chofer de una unidad
router.put('/update-unit-driver', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, updateUnitDriver);

// Ruta para actualizar estado de una unidad
router.put('/update-unit-status', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, updateUnitStatus);

// Ruta para eliminar una unidad
router.delete('/delete-unit/:idUnidad', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, deleteUnit);

// Ruta para agregar una nueva ruta
router.post('/add-route', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, addRoute);

// Ruta para listar rutas de la línea del gerente
router.get('/routes-by-line', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, listRoutesByLine);

// Ruta para buscar rutas por línea, nombre o descripción (usuarios autenticados)
router.get('/search-routes', verifyToken, searchRoutes);

// Catálogo de líneas y rutas para usuarios autenticados
router.get('/routes-catalog', verifyToken, listPublicRoutesCatalog);

// Ruta para estimar ETA al punto de encuentro más cercano del usuario
router.get('/routes/:idRuta/eta', verifyToken, estimateEtaToNearestStop);

// Ruta para editar una ruta
router.put('/edit-route/:idRuta', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, editRoute);

// Ruta para eliminar una ruta
router.delete('/delete-route/:idRuta', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, deleteRoute);

// Ruta para estadisticas de gerente
router.get('/manager-stats', verifyToken, (req, res, next) => {
  if (req.user.rol !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado. Solo los gerentes pueden realizar esta acción.' });
  }
  next();
}, getManagerStats);

module.exports = router;