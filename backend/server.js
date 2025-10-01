import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { pool } from "./models/db.js";
import { ensureRedisConnection, quitRedis } from "./models/redisClient.js";
import hotelesRouter from "./routes/hoteles.js";
import usuariosRouter from "./routes/usuarios.js";
import reservasRouter from "./routes/reservas.js";
import gestion_habitacionesRouter from "./routes/gestion_habitaciones.js";
import pagosRouter from "./routes/pagos.js";
import huespedesRouter from "./routes/huespedes.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración CORS super permisiva
app.use(cors({
  origin: "*", // Permite todos los orígenes
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Métodos permitidos
  allowedHeaders: ["Content-Type", "Authorization"], // Headers permitidos
}));

// Manejo de preflight (OPTIONS)
app.options("*", cors());

app.use(bodyParser.json());

// Rutas
app.use("/api/hoteles", hotelesRouter);
app.use("/api/usuarios", usuariosRouter);
app.use("/api/reservas", reservasRouter);
app.use("/api/habitaciones", gestion_habitacionesRouter);
app.use("/api/pagos", pagosRouter);
app.use("/api/huespedes", huespedesRouter);

app.get("/", (req, res) => {
  res.send("API Hotel Manager funcionando 🚀");
});

async function start() {
  try {
    await ensureRedisConnection();
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en puerto ${PORT}`);
    });
  } catch (err) {
    console.error("No se pudo iniciar el servidor:", err);
    process.exit(1);
  }
}

start();

const shutdownSignals = ["SIGINT", "SIGTERM"];

shutdownSignals.forEach((signal) => {
  process.on(signal, async () => {
    try {
      await quitRedis();
    } catch (err) {
      console.error("Error al cerrar conexión Redis:", err);
    } finally {
      process.exit(0);
    }
  });
});
