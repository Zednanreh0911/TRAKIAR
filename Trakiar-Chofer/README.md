# Trakiar Chofer

App Expo minimal y optimizada para uso exclusivo de choferes.

## Reglas de acceso

- Solo permite iniciar sesión si el token JWT tiene `rol = "chofer"`.
- Si el usuario es `gerente`, `pasajero` o `admin`, el acceso se bloquea.

## Configuración

Crea un archivo `.env` con la URL del backend:

```properties
EXPO_PUBLIC_SERVER_URL=http://localhost:3000
```

> En dispositivo físico usa la IP local de tu PC (por ejemplo `http://192.168.1.103:3000`).

## Ejecutar

```bash
npm install
npm run start
```

hola, esto es una prueba uwu

## Estructura principal

- `src/context/AuthContext.js`: sesión y validación de rol chofer.
- `src/services/apiService.js`: login y check de servidor.
- `src/services/storageService.js`: persistencia de token.
- `src/screens/LoginScreen.js`: inicio de sesión.
- `src/screens/DriverHomeScreen.js`: panel principal simplificado del chofer.
