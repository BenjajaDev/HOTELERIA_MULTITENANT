import express from "express";
import { pool } from "../models/db.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// -------------------------
// LOGIN de usuario
// -------------------------
router.post("/login", async (req, res) => {
  const {
    email,
    password,
    tenantId: tenantIdFromBody,
    tenant_id: tenantIdSnake,
    hotelId,
    hotel_id: hotelIdSnake,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  // Permitir tenantId en camelCase o snake_case; idem para hotelId
  const requestedTenantId = tenantIdFromBody || tenantIdSnake;
  const requestedHotelId = hotelId || hotelIdSnake;

  if (!requestedTenantId && !requestedHotelId) {
    return res
      .status(400)
      .json({ error: "Debe indicar el tenant (hotel) al que desea ingresar" });
  }

  try {
    const userResult = await pool.query(
      "SELECT usuario_id, email, password_hash, nombre FROM usuario WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    let tenantId = requestedTenantId;
    let hotelInfo = null;

    if (requestedHotelId) {
      const hotelResult = await pool.query(
        "SELECT hotel_id, tenant_id, nombre FROM hotel WHERE hotel_id = $1",
        [requestedHotelId]
      );

      if (hotelResult.rows.length === 0) {
        return res.status(404).json({ error: "Hotel no encontrado" });
      }

      hotelInfo = hotelResult.rows[0];
      tenantId = tenantId || hotelInfo.tenant_id;
    }

    if (!tenantId) {
      return res
        .status(400)
        .json({ error: "No se pudo determinar el tenant para el usuario" });
    }

    const membershipResult = await pool.query(
      `SELECT tu.rol, tu.tenant_id, t.nombre AS tenant_nombre
       FROM tenant_usuario tu
       JOIN tenant t ON t.tenant_id = tu.tenant_id
       WHERE tu.usuario_id = $1 AND tu.tenant_id = $2
       LIMIT 1`,
      [user.usuario_id, tenantId]
    );

    if (membershipResult.rows.length === 0) {
      return res.status(403).json({ error: "No tiene acceso al tenant seleccionado" });
    }

    const membership = membershipResult.rows[0];

    if (!hotelInfo) {
      const hotelResult = await pool.query(
        `SELECT hotel_id, nombre
         FROM hotel
         WHERE tenant_id = $1
         ORDER BY created_at ASC
         LIMIT 1`,
        [tenantId]
      );
      hotelInfo = hotelResult.rows[0] || null;
    } else if (hotelInfo.tenant_id !== membership.tenant_id) {
      return res.status(403).json({ error: "El hotel no pertenece al tenant seleccionado" });
    }

    let mensaje = "";
    if (membership.rol === "admin") {
      mensaje = "🎉 Has ingresado como ADMIN";
    } else if (membership.rol === "recepcionista") {
      mensaje = "🎉 Has ingresado como RECEPCIONISTA";
    } else if (membership.rol === "huesped") {
      mensaje = "🎉 Has ingresado como HUESPED";
    }

    if (hotelInfo?.nombre) {
      mensaje = `${mensaje} en ${hotelInfo.nombre}`.trim();
    }

    res.json({
      message: mensaje,
      user: {
        usuario_id: user.usuario_id,
        user_id: user.usuario_id,
        nombre: user.nombre,
        email: user.email,
        rol: membership.rol,
        tenant_id: membership.tenant_id,
        tenant_nombre: membership.tenant_nombre,
        hotel_id: hotelInfo?.hotel_id || null,
        hotel_nombre: hotelInfo?.nombre || null,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// backend/routes/usuarios.js
router.get("/me", async (req, res) => {
  try {
    // 🔹 Supongamos que ya tienes userId desde el token o sesión
    const userId = req.user.id; 
    const result = await pool.query(
      "SELECT id, email, role, hotel_id FROM usuario WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener usuario:", err);
    res.status(500).json({ error: "Error al obtener usuario" });
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
