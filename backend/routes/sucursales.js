import express from "express";
import { pool } from "../models/db.js";

const router = express.Router();

const SUCURSAL_BASE_QUERY = `
  SELECT
    s.sucursal_id,
    s.tenant_id,
    s.hotel_id,
    s.nombre,
    s.direccion,
    s.telefono,
    s.email,
    s.created_at,
    h.nombre AS hotel_nombre,
    t.nombre AS tenant_nombre,
    COALESCE(rc.total_recepcionistas, 0)::INTEGER AS total_recepcionistas
  FROM sucursal s
  JOIN hotel h ON h.hotel_id = s.hotel_id
  JOIN tenant t ON t.tenant_id = s.tenant_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_recepcionistas
    FROM recepcionista_sucursal rs
    WHERE rs.sucursal_id = s.sucursal_id
  ) rc ON TRUE
`;

async function fetchSucursalById(id) {
  const result = await pool.query(`${SUCURSAL_BASE_QUERY} WHERE s.sucursal_id = $1`, [id]);
  return result.rows[0] || null;
}

router.get("/", async (req, res) => {
  const { hotelId, tenantId } = req.query;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (hotelId) {
    conditions.push(`s.hotel_id = $${idx++}`);
    values.push(hotelId);
  }

  if (tenantId) {
    conditions.push(`s.tenant_id = $${idx++}`);
    values.push(tenantId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `${SUCURSAL_BASE_QUERY} ${whereClause} ORDER BY s.created_at DESC NULLS LAST`
    , values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener sucursales:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const sucursal = await fetchSucursalById(id);
    if (!sucursal) {
      return res.status(404).json({ error: "Sucursal no encontrada" });
    }
    res.json(sucursal);
  } catch (err) {
    console.error("Error al obtener sucursal:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const {
    hotel_id: hotelIdSnake,
    hotelId: hotelIdCamel,
    nombre,
    direccion,
    telefono,
    email,
  } = req.body;

  const hotelId = hotelIdCamel || hotelIdSnake;

  if (!hotelId) {
    return res.status(400).json({ error: "Debe indicar el hotel" });
  }

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre de la sucursal es obligatorio" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const hotelResult = await client.query(
      "SELECT hotel_id, tenant_id FROM hotel WHERE hotel_id = $1",
      [hotelId]
    );

    if (hotelResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Hotel no encontrado" });
    }

    const hotel = hotelResult.rows[0];

    const insertResult = await client.query(
      `INSERT INTO sucursal (tenant_id, hotel_id, nombre, direccion, telefono, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING sucursal_id`,
      [
        hotel.tenant_id,
        hotel.hotel_id,
        nombre.trim(),
        direccion || null,
        telefono || null,
        email || null,
      ]
    );

    await client.query("COMMIT");

    const created = await fetchSucursalById(insertResult.rows[0].sucursal_id);
    res.status(201).json(created);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al crear sucursal:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    hotel_id: hotelIdSnake,
    hotelId: hotelIdCamel,
    nombre,
    direccion,
    telefono,
    email,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      "SELECT sucursal_id, hotel_id, tenant_id FROM sucursal WHERE sucursal_id = $1",
      [id]
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Sucursal no encontrada" });
    }

    const current = currentResult.rows[0];
    const updates = [];
    const values = [];
    let idx = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${idx++}`);
      values.push(nombre);
    }

    if (direccion !== undefined) {
      updates.push(`direccion = $${idx++}`);
      values.push(direccion);
    }

    if (telefono !== undefined) {
      updates.push(`telefono = $${idx++}`);
      values.push(telefono);
    }

    if (email !== undefined) {
      updates.push(`email = $${idx++}`);
      values.push(email);
    }

    const providedHotelId = hotelIdCamel || hotelIdSnake;
    let targetHotelId = current.hotel_id;
    let targetTenantId = current.tenant_id;

    if (providedHotelId && providedHotelId !== current.hotel_id) {
      const hotelResult = await client.query(
        "SELECT hotel_id, tenant_id FROM hotel WHERE hotel_id = $1",
        [providedHotelId]
      );

      if (hotelResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Hotel no encontrado" });
      }

      const hotel = hotelResult.rows[0];
      targetHotelId = hotel.hotel_id;
      targetTenantId = hotel.tenant_id;
      updates.push(`hotel_id = $${idx++}`);
      values.push(targetHotelId);
      updates.push(`tenant_id = $${idx++}`);
      values.push(targetTenantId);
    }

    if (updates.length === 0) {
      await client.query("ROLLBACK");
      const unchanged = await fetchSucursalById(id);
      return res.json(unchanged);
    }

    values.push(id);

    await client.query(
      `UPDATE sucursal SET ${updates.join(", ")} WHERE sucursal_id = $${idx}`,
      values
    );

    await client.query("COMMIT");

    const updated = await fetchSucursalById(id);
    res.json(updated);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al actualizar sucursal:", err);
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

    const sucursalResult = await client.query(
      "SELECT sucursal_id FROM sucursal WHERE sucursal_id = $1",
      [id]
    );

    if (sucursalResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Sucursal no encontrada" });
    }

    const recepcionistasResult = await client.query(
      "SELECT COUNT(*)::INTEGER AS total FROM recepcionista_sucursal WHERE sucursal_id = $1",
      [id]
    );

    if (recepcionistasResult.rows[0].total > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "No se puede eliminar la sucursal porque tiene recepcionistas asignados",
      });
    }

    await client.query(
      "DELETE FROM sucursal WHERE sucursal_id = $1",
      [id]
    );

    await client.query("COMMIT");

    res.json({ message: "Sucursal eliminada" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al eliminar sucursal:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;

