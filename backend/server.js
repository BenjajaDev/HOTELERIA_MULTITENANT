import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { pool } from "./models/db.js";
import hotelesRouter from "./routes/hoteles.js";
import usuariosRouter from "./routes/usuarios.js";
import reservasRouter from "./routes/reservas.js";
import gestion_habitacionesRouter from "./routes/gestion_habitaciones.js";

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

app.get("/", (req, res) => {
  res.send("API Hotel Manager funcionando 🚀");
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});