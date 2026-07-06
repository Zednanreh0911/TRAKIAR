const { Pool } = require("pg");

require("dotenv").config();

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "Trakiarr",
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  ssl:
    String(process.env.DB_SSL || "").toLowerCase() === "true"
      ? { rejectUnauthorized: false }
      : false,
});

module.exports = pool;
