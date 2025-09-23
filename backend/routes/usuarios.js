import express from "express";
import { pool } from "../models/db.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// -------------------------
// LOGIN de usuario
// -------------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar usuario
    const result = await pool.query(
      "SELECT * FROM usuario WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    // 2. Verificar contraseña
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // 3. Buscar rol en tenant_usuario
    const rolResult = await pool.query(
      "SELECT rol FROM tenant_usuario WHERE usuario_id = $1 LIMIT 1",
      [user.usuario_id]
    );

    if (rolResult.rows.length === 0) {
      return res.status(403).json({ error: "El usuario no tiene rol asignado" });
    }

    const rol = rolResult.rows[0].rol;

    // 4. Mensaje personalizado
    let mensaje = "";
    if (rol === "admin") {
      mensaje = "🎉 Felicidades, has ingresado como ADMIN.";
    } else if (rol === "recepcionista") {
      mensaje = "🎉 Felicidades, has ingresado como RECEPCIONISTA.";
    } else if (rol === "huesped") {
      mensaje = "🎉 Felicidades, has ingresado como HUESPED.";
    }

    res.json({
      message: mensaje,
      user_id: user.usuario_id,
      rol,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// -------------------------
// REGISTRO de huésped
// -------------------------
router.post("/register-huesped", async (req, res) => {
  const { tenant_id, email, password, nombre } = req.body;

  try {
    // 1. Verificar si ya existe
    const exists = await pool.query("SELECT * FROM usuario WHERE email = $1", [
      email,
    ]);

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    // 2. Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Crear usuario
    const usuario_id = uuidv4();
    await pool.query(
      "INSERT INTO usuario (usuario_id, email, password_hash, nombre, created_at) VALUES ($1, $2, $3, $4, NOW())",
      [usuario_id, email, hashedPassword, nombre]
    );

    // 4. Asociar como huésped al tenant (hotel)
    await pool.query(
      "INSERT INTO tenant_usuario (tenant_id, usuario_id, rol) VALUES ($1, $2, $3)",
      [tenant_id, usuario_id, "huesped"]
    );

    res.status(201).json({
      message: "Registro exitoso. Bienvenido como HUESPED 🎉",
      usuario_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

export default router;