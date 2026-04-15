# Trakiar (React Native + Expo)

Proyecto móvil en JavaScript con Expo, conectado al backend `Backend-Trakiar`.

## Qué incluye

- UI renovada con componentes reutilizables (cards, botones e inputs).
- Navegación entre pantallas con `@react-navigation/native`.
- Flujo de sesión persistente (login/logout con token en almacenamiento local).
- Pantallas de operaciones para gerente:
	- Promover usuario a chofer (usando correo)
	- Crear unidad
	- Asignar unidad a chofer
	- Crear, editar y eliminar rutas
- Prueba de conectividad backend y ruta protegida.

## Configuración de backend URL

La app usa por defecto:

- Android Emulator: `http://10.0.2.2:3000`
- iOS Simulator / Web: `http://localhost:3000`

Si usas dispositivo físico, define la IP local de tu PC:

1. Crea archivo `.env` en la raíz de `Trakiar`.
2. Agrega:

```env
EXPO_PUBLIC_SERVER_URL=http://TU_IP_LOCAL:3000
```

> Ejemplo: `EXPO_PUBLIC_SERVER_URL=http://192.168.1.25:3000`

## Ejecutar

1. Inicia tu backend en `Backend-Trakiar` (puerto 3000).
2. En `Trakiar`, instala dependencias y corre Expo.

```powershell
Set-Location 'c:\Users\intel\Desktop\TESIS\Trakiar'
npm install
npm run dev
```

## Pantallas configuradas

- `Login`: autenticación del usuario.
- `Register`: alta de usuario.
- `Home`: estado de conexión, ruta protegida y acceso a operaciones.
- `ManagerTools`: formularios para endpoints protegidos de gestión.

## Compatibilidad con Expo Go

- Este proyecto ya está migrado a **Expo SDK 54** para ser compatible con Expo Go actual.
- Si aparece un error por versión, verifica que en `package.json` esté `"expo": "^54.0.0"` (o superior en la línea SDK 54).
- Si aparece `ENOENT ...\\assets`, confirma que exista la carpeta `assets/` en la raíz del proyecto.

## Endpoints usados

- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/protected` (requiere token)
- `GET /`
- `POST /api/users/promote-to-driver` (requiere token de gerente)
- `POST /api/users/create-unit` (requiere token de gerente)
- `POST /api/users/assign-unit` (requiere token de gerente)
- `POST /api/users/add-route` (requiere token de gerente)
- `PUT /api/users/edit-route/:idRuta` (requiere token de gerente)
- `DELETE /api/users/delete-route/:idRuta` (requiere token de gerente)

## Notas

- Tu backend espera el token JWT directo en header `Authorization` (sin prefijo `Bearer`).
- Si cambias puerto o host del backend, actualiza `EXPO_PUBLIC_SERVER_URL`.
- Las herramientas de gerente devolverán `403` o `404` cuando el usuario no tenga permisos o no exista el recurso.
