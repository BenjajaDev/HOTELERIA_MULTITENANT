import express from "express";
import bcrypt from "bcrypt";
import { pool } from "../models/db.js";

const router = express.Router();

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

const RECEPCIONISTA_BASE_QUERY = `
  SELECT
    rs.recepcionista_sucursal_id,
    rs.usuario_id,
    rs.sucursal_id,
    rs.hotel_id,
    rs.tenant_id,
    rs.telefono,
    rs.activo,
    rs.created_at,
    u.nombre,
    u.email,
    h.nombre AS hotel_nombre,
    s.nombre AS sucursal_nombre,
    t.nombre AS tenant_nombre
  FROM recepcionista_sucursal rs
  JOIN usuario u ON u.usuario_id = rs.usuario_id
  JOIN sucursal s ON s.sucursal_id = rs.sucursal_id
  JOIN hotel h ON h.hotel_id = rs.hotel_id
  JOIN tenant t ON t.tenant_id = rs.tenant_id
`;

async function fetchRecepcionistaById(id) {
  const result = await pool.query(
    `${RECEPCIONISTA_BASE_QUERY} WHERE rs.recepcionista_sucursal_id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

router.get("/", async (req, res) => {
  const { hotelId, tenantId, sucursalId } = req.query;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (hotelId) {
    conditions.push(`rs.hotel_id = $${idx++}`);
    values.push(hotelId);
  }

  if (tenantId) {
    conditions.push(`rs.tenant_id = $${idx++}`);
    values.push(tenantId);
  }

  if (sucursalId) {
    conditions.push(`rs.sucursal_id = $${idx++}`);
    values.push(sucursalId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `${RECEPCIONISTA_BASE_QUERY} ${whereClause} ORDER BY rs.created_at DESC NULLS LAST`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener recepcionistas:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const recepcionista = await fetchRecepcionistaById(id);
    if (!recepcionista) {
      return res.status(404).json({ error: "Recepcionista no encontrado" });
    }
    res.json(recepcionista);
  } catch (err) {
    console.error("Error al obtener recepcionista:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const {
    sucursal_id: sucursalIdSnake,
    sucursalId: sucursalIdCamel,
    nombre,
    email,
    telefono,
    password,
  } = req.body;

  const sucursalId = sucursalIdCamel || sucursalIdSnake;
  const emailNormalizado = email ? email.trim().toLowerCase() : "";

  if (!sucursalId) {
    return res.status(400).json({ error: "Debe indicar la sucursal" });
  }

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  if (!emailNormalizado) {
    return res.status(400).json({ error: "El email es obligatorio" });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sucursalResult = await client.query(
      `SELECT sucursal_id, tenant_id, hotel_id
       FROM sucursal
       WHERE sucursal_id = $1`,
      [sucursalId]
    );

    if (sucursalResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Sucursal no encontrada" });
    }

    const existingEmail = await client.query(
      "SELECT usuario_id FROM usuario WHERE LOWER(email) = $1",
      [emailNormalizado]
    );

    if (existingEmail.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "El email ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const usuarioResult = await client.query(
      `INSERT INTO usuario (email, password_hash, nombre)
       VALUES ($1, $2, $3)
       RETURNING usuario_id`,
      [emailNormalizado, passwordHash, nombre.trim()]
    );

    const usuarioId = usuarioResult.rows[0].usuario_id;
    const sucursal = sucursalResult.rows[0];

    await client.query(
      `INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
       VALUES ($1, $2, 'recepcionista')
       ON CONFLICT DO NOTHING`,
      [sucursal.tenant_id, usuarioId]
    );

    const insertResult = await client.query(
      `INSERT INTO recepcionista_sucursal (tenant_id, hotel_id, sucursal_id, usuario_id, telefono, activo)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING recepcionista_sucursal_id`,
      [sucursal.tenant_id, sucursal.hotel_id, sucursal.sucursal_id, usuarioId, telefono || null]
    );

    await client.query("COMMIT");

    const created = await fetchRecepcionistaById(insertResult.rows[0].recepcionista_sucursal_id);
    res.status(201).json(created);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al crear recepcionista:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    sucursal_id: sucursalIdSnake,
    sucursalId: sucursalIdCamel,
    nombre,
    email,
    telefono,
    password,
    activo,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT
        rs.recepcionista_sucursal_id,
        rs.usuario_id,
        rs.sucursal_id,
        rs.hotel_id,
        rs.tenant_id,
        rs.telefono,
        rs.activo,
        u.email,
        u.nombre
       FROM recepcionista_sucursal rs
       JOIN usuario u ON u.usuario_id = rs.usuario_id
       WHERE rs.recepcionista_sucursal_id = $1
       FOR UPDATE`,
      [id]
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Recepcionista no encontrado" });
    }

    const current = currentResult.rows[0];

    const userUpdates = [];
    const userValues = [];
    let userIdx = 1;

    if (nombre !== undefined) {
      userUpdates.push(`nombre = $${userIdx++}`);
      userValues.push(nombre);
    }

    if (email !== undefined) {
      const emailNormalizado = email ? email.trim().toLowerCase() : "";
      if (!emailNormalizado) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "El email no puede quedar vacío" });
      }

      if (emailNormalizado !== current.email.toLowerCase()) {
        const emailResult = await client.query(
          "SELECT usuario_id FROM usuario WHERE LOWER(email) = $1 AND usuario_id <> $2",
          [emailNormalizado, current.usuario_id]
        );

        if (emailResult.rowCount > 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({ error: "El email ya está registrado" });
        }

        userUpdates.push(`email = $${userIdx++}`);
        userValues.push(emailNormalizado);
      }
    }

    if (password) {
      if (password.length < 6) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      userUpdates.push(`password_hash = $${userIdx++}`);
      userValues.push(passwordHash);
    }

    if (userUpdates.length > 0) {
      userValues.push(current.usuario_id);
      await client.query(
        `UPDATE usuario SET ${userUpdates.join(", ")} WHERE usuario_id = $${userIdx}`,
        userValues
      );
    }

    const mappingUpdates = [];
    const mappingValues = [];
    let mapIdx = 1;

    if (telefono !== undefined) {
      mappingUpdates.push(`telefono = $${mapIdx++}`);
      mappingValues.push(telefono);
    }

    if (activo !== undefined) {
      mappingUpdates.push(`activo = $${mapIdx++}`);
      mappingValues.push(Boolean(activo));
    }

    const providedSucursalId = sucursalIdCamel || sucursalIdSnake;
    let targetTenantId = current.tenant_id;
    let targetHotelId = current.hotel_id;
    let targetSucursalId = current.sucursal_id;

    if (providedSucursalId && providedSucursalId !== current.sucursal_id) {
      const sucursalResult = await client.query(
        `SELECT sucursal_id, tenant_id, hotel_id
         FROM sucursal
         WHERE sucursal_id = $1`,
        [providedSucursalId]
      );

      if (sucursalResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Sucursal no encontrada" });
      }

      const sucursal = sucursalResult.rows[0];
      targetSucursalId = sucursal.sucursal_id;
      targetTenantId = sucursal.tenant_id;
      targetHotelId = sucursal.hotel_id;

      mappingUpdates.push(`sucursal_id = $${mapIdx++}`);
      mappingValues.push(targetSucursalId);
      mappingUpdates.push(`tenant_id = $${mapIdx++}`);
      mappingValues.push(targetTenantId);
      mappingUpdates.push(`hotel_id = $${mapIdx++}`);
      mappingValues.push(targetHotelId);
    }

    if (mappingUpdates.length > 0) {
      mappingValues.push(id);
      await client.query(
        `UPDATE recepcionista_sucursal SET ${mappingUpdates.join(", ")} WHERE recepcionista_sucursal_id = $${mapIdx}`,
        mappingValues
      );
    }

    if (providedSucursalId && providedSucursalId !== current.sucursal_id) {
      await client.query(
        `DELETE FROM tenant_usuario
         WHERE tenant_id = $1
           AND usuario_id = $2
           AND rol = 'recepcionista'`,
        [current.tenant_id, current.usuario_id]
      );

      await client.query(
        `INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
         VALUES ($1, $2, 'recepcionista')
         ON CONFLICT DO NOTHING`,
        [targetTenantId, current.usuario_id]
      );
    }

    await client.query("COMMIT");

    const updated = await fetchRecepcionistaById(id);
    res.json(updated);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al actualizar recepcionista:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT recepcionista_sucursal_id, usuario_id, tenant_id
       FROM recepcionista_sucursal
       WHERE recepcionista_sucursal_id = $1`,
      [id]
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Recepcionista no encontrado" });
    }

    const current = currentResult.rows[0];

    await client.query(
      "DELETE FROM recepcionista_sucursal WHERE recepcionista_sucursal_id = $1",
      [id]
    );

    await client.query(
      `DELETE FROM tenant_usuario
       WHERE tenant_id = $1
         AND usuario_id = $2
         AND rol = 'recepcionista'`,
      [current.tenant_id, current.usuario_id]
    );

    const memberships = await client.query(
      "SELECT COUNT(*)::INTEGER AS total FROM tenant_usuario WHERE usuario_id = $1",
      [current.usuario_id]
    );

    if (memberships.rows[0].total === 0) {
      await client.query(
        "DELETE FROM usuario WHERE usuario_id = $1",
        [current.usuario_id]
      );
    }

    await client.query("COMMIT");

    res.json({ message: "Recepcionista eliminado" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al eliminar recepcionista:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;

