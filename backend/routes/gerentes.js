import express from "express";
import bcrypt from "bcrypt";
import { pool } from "../models/db.js";

const router = express.Router();
const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

const GERENTE_BASE_QUERY = `
  SELECT
    tu.tenant_id,
    tu.usuario_id,
    u.nombre,
    u.email,
    u.created_at,
    t.nombre AS tenant_nombre,
    h.hotel_id,
    h.nombre AS hotel_nombre
  FROM tenant_usuario tu
  JOIN usuario u ON u.usuario_id = tu.usuario_id
  JOIN tenant t ON t.tenant_id = tu.tenant_id
  LEFT JOIN hotel h ON h.tenant_id = tu.tenant_id
  WHERE tu.rol = 'gerente'
`;

async function fetchGerenteByIds({ tenantId, usuarioId }) {
  const result = await pool.query(
    `${GERENTE_BASE_QUERY} AND tu.tenant_id = $1 AND tu.usuario_id = $2 LIMIT 1`,
    [tenantId, usuarioId]
  );
  return result.rows[0] || null;
}

router.get("/", async (req, res) => {
  const { tenantId, hotelId } = req.query;
  const conditions = [];
  const values = [];

  if (tenantId) {
    conditions.push(`tu.tenant_id = $${conditions.length + 1}`);
    values.push(tenantId);
  }

  if (hotelId) {
    conditions.push(`h.hotel_id = $${conditions.length + 1}`);
    values.push(hotelId);
  }

  const whereClause = conditions.length ? ` AND ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `${GERENTE_BASE_QUERY}${whereClause} ORDER BY u.created_at DESC NULLS LAST`
      , values
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener gerentes:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { hotelId, nombre, email, password } = req.body;

  if (!hotelId) {
    return res.status(400).json({ error: "Debe indicar el hotel" });
  }

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "El email es obligatorio" });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const hotelResult = await client.query(
      "SELECT hotel_id, tenant_id, nombre FROM hotel WHERE hotel_id = $1",
      [hotelId]
    );

    if (hotelResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Hotel no encontrado" });
    }

    const hotel = hotelResult.rows[0];

    const existingGerente = await client.query(
      "SELECT 1 FROM tenant_usuario WHERE tenant_id = $1 AND rol = 'gerente' LIMIT 1",
      [hotel.tenant_id]
    );

    if (existingGerente.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "El hotel ya tiene un gerente asignado" });
    }

    const emailLower = email.trim().toLowerCase();

    const emailExists = await client.query(
      "SELECT 1 FROM usuario WHERE LOWER(email) = $1",
      [emailLower]
    );

    if (emailExists.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Ya existe un usuario con ese email" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const usuarioResult = await client.query(
      `INSERT INTO usuario (nombre, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING usuario_id`,
      [nombre.trim(), emailLower, passwordHash]
    );

    const usuarioId = usuarioResult.rows[0].usuario_id;

    await client.query(
      `INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
       VALUES ($1, $2, 'gerente')`,
      [hotel.tenant_id, usuarioId]
    );

    await client.query("COMMIT");

    const gerente = await fetchGerenteByIds({ tenantId: hotel.tenant_id, usuarioId });
    res.status(201).json(gerente);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al crear gerente:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put("/:id", async (req, res) => {
  const { id: usuarioId } = req.params;
  const { hotelId, nombre, email, password } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT tenant_id FROM tenant_usuario WHERE usuario_id = $1 AND rol = 'gerente' LIMIT 1`,
      [usuarioId]
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Gerente no encontrado" });
    }

    let targetTenantId = currentResult.rows[0].tenant_id;
    let targetHotelId = null;

    if (hotelId) {
      const hotelResult = await client.query(
        "SELECT hotel_id, tenant_id FROM hotel WHERE hotel_id = $1",
        [hotelId]
      );

      if (hotelResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Hotel no encontrado" });
      }

      const hotel = hotelResult.rows[0];

      const existingGerente = await client.query(
        `SELECT usuario_id
         FROM tenant_usuario
         WHERE tenant_id = $1 AND rol = 'gerente' AND usuario_id <> $2
         LIMIT 1`,
        [hotel.tenant_id, usuarioId]
      );

      if (existingGerente.rowCount > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "El hotel seleccionado ya tiene un gerente" });
      }

      if (hotel.tenant_id !== targetTenantId) {
        await client.query(
          `DELETE FROM tenant_usuario
           WHERE tenant_id = $1 AND usuario_id = $2 AND rol = 'gerente'`,
          [targetTenantId, usuarioId]
        );

        await client.query(
          `INSERT INTO tenant_usuario (tenant_id, usuario_id, rol)
           VALUES ($1, $2, 'gerente')
           ON CONFLICT DO NOTHING`,
          [hotel.tenant_id, usuarioId]
        );

        targetTenantId = hotel.tenant_id;
      }

      targetHotelId = hotel.hotel_id;
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${idx++}`);
      values.push(nombre);
    }

    if (email !== undefined) {
      const emailLower = email ? email.trim().toLowerCase() : "";
      if (!emailLower) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "El email no puede quedar vacío" });
      }

      const emailExists = await client.query(
        `SELECT usuario_id FROM usuario WHERE LOWER(email) = $1 AND usuario_id <> $2`,
        [emailLower, usuarioId]
      );

      if (emailExists.rowCount > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "El email ya está en uso" });
      }

      updates.push(`email = $${idx++}`);
      values.push(emailLower);
    }

    if (password) {
      if (password.length < 6) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      updates.push(`password_hash = $${idx++}`);
      values.push(passwordHash);
    }

    if (updates.length > 0) {
      values.push(usuarioId);
      await client.query(
        `UPDATE usuario SET ${updates.join(", ")} WHERE usuario_id = $${idx}`,
        values
      );
    }

    await client.query("COMMIT");

    const gerente = await fetchGerenteByIds({ tenantId: targetTenantId, usuarioId });
    res.json({ ...gerente, hotel_id: targetHotelId || gerente?.hotel_id || null });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al actualizar gerente:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  const { id: usuarioId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT tenant_id FROM tenant_usuario WHERE usuario_id = $1 AND rol = 'gerente' LIMIT 1`,
      [usuarioId]
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Gerente no encontrado" });
    }

    const tenantId = currentResult.rows[0].tenant_id;

    await client.query(
      `DELETE FROM tenant_usuario
       WHERE tenant_id = $1 AND usuario_id = $2 AND rol = 'gerente'`,
      [tenantId, usuarioId]
    );

    const remainingRoles = await client.query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM tenant_usuario
       WHERE usuario_id = $1`,
      [usuarioId]
    );

    if (remainingRoles.rows[0].total === 0) {
      await client.query(
        "DELETE FROM usuario WHERE usuario_id = $1",
        [usuarioId]
      );
    }

    await client.query("COMMIT");

    res.json({ message: "Gerente eliminado" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al eliminar gerente:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;

