import express from "express";
import { pool } from "../models/db.js";
import { ensureRedisConnection } from "../models/redisClient.js";

const router = express.Router();

const HOTEL_LIST_CACHE_KEY = "cache:hoteles:list";
const HOTEL_CACHE_PREFIX = "cache:hoteles:id:";
const HOTEL_CACHE_TTL_SECONDS = 60;

const HOTEL_BASE_QUERY = `
  SELECT
    h.*,
    t.nombre AS tenant_nombre,
    COALESCE(totales.total_pagado, 0)::INTEGER AS total_ganancias,
    COALESCE(totales.total_pendiente, 0)::INTEGER AS total_pendiente
  FROM hotel h
  JOIN tenant t ON h.tenant_id = t.tenant_id
  LEFT JOIN LATERAL (
    SELECT 
      SUM(CASE WHEN p.estado = 'pagado' THEN p.monto ELSE 0 END) AS total_pagado,
      SUM(CASE WHEN p.estado = 'pendiente' THEN p.monto ELSE 0 END) AS total_pendiente
    FROM reserva r
    JOIN habitacion hab ON hab.habitacion_id = r.habitacion_id
    LEFT JOIN pago p ON p.reserva_id = r.reserva_id
    WHERE hab.hotel_id = h.hotel_id
  ) AS totales ON true
`;

async function fetchHotelById(hotelId) {
  const result = await pool.query(`${HOTEL_BASE_QUERY} WHERE h.hotel_id = $1`, [hotelId]);
  return result.rows[0] || null;
}

// GET /api/hoteles
router.get("/", async (req, res) => {
  try {
    const redis = await ensureRedisConnection();
    const cachedHotels = await redis.get(HOTEL_LIST_CACHE_KEY);

    if (cachedHotels) {
      return res.json(JSON.parse(cachedHotels));
    }

    const result = await pool.query(`${HOTEL_BASE_QUERY} ORDER BY h.created_at DESC NULLS LAST`);
    const hotels = result.rows;

    await redis.setEx(
      HOTEL_LIST_CACHE_KEY,
      HOTEL_CACHE_TTL_SECONDS,
      JSON.stringify(hotels)
    );

    res.json(hotels);
  } catch (err) {
    console.error("Error al obtener hoteles:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hoteles/:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const redis = await ensureRedisConnection();
    const cacheKey = `${HOTEL_CACHE_PREFIX}${id}`;
    const cachedHotel = await redis.get(cacheKey);

    if (cachedHotel) {
      return res.json(JSON.parse(cachedHotel));
    }

    const hotel = await fetchHotelById(id);
    if (!hotel) {
      return res.status(404).json({ error: "Hotel no encontrado" });
    }
    await redis.setEx(cacheKey, HOTEL_CACHE_TTL_SECONDS, JSON.stringify(hotel));
    res.json(hotel);
  } catch (err) {
    console.error("Error al obtener hotel:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hoteles
router.post("/", async (req, res) => {
  const { nombre, direccion, telefono, email } = req.body;

  try {
    // 1. Crear tenant con el nombre del hotel
    const tenantResult = await pool.query(
      "INSERT INTO tenant (nombre) VALUES ($1) RETURNING tenant_id",
      [nombre]
    );
    const tenant_id = tenantResult.rows[0].tenant_id;

    // 2. Crear hotel asociado al tenant
    const hotelResult = await pool.query(
      `INSERT INTO hotel (tenant_id, nombre, direccion, telefono, email) 
       VALUES ($1, $2, $3, $4, $5) RETURNING hotel_id`,
      [tenant_id, nombre, direccion, telefono, email]
    );

    const created = await fetchHotelById(hotelResult.rows[0].hotel_id);

    const redis = await ensureRedisConnection();
    await Promise.all([
      redis.del(HOTEL_LIST_CACHE_KEY),
      redis.setEx(
        `${HOTEL_CACHE_PREFIX}${created.hotel_id}`,
        HOTEL_CACHE_TTL_SECONDS,
        JSON.stringify(created)
      ),
    ]);

    res.status(201).json(created);
  } catch (err) {
    console.error("Error al crear hotel:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hoteles/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, direccion, telefono, email } = req.body;
  try {
    const result = await pool.query(
      "UPDATE hotel SET nombre=$1, direccion=$2, telefono=$3, email=$4 WHERE hotel_id=$5 RETURNING *",
      [nombre, direccion, telefono, email, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Hotel no encontrado" });
    }
    if (nombre) {
      await pool.query("UPDATE tenant SET nombre=$1 WHERE tenant_id=$2", [nombre, result.rows[0].tenant_id]);
    }
    const updated = await fetchHotelById(id);

    const redis = await ensureRedisConnection();
    await Promise.all([
      redis.del(HOTEL_LIST_CACHE_KEY),
      redis.setEx(
        `${HOTEL_CACHE_PREFIX}${id}`,
        HOTEL_CACHE_TTL_SECONDS,
        JSON.stringify(updated)
      ),
    ]);

    res.json(updated);
  } catch (err) {
    console.error("Error al actualizar hotel:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/hoteles/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const hotelResult = await client.query(
      "SELECT hotel_id, tenant_id FROM hotel WHERE hotel_id = $1",
      [id]
    );

    if (hotelResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Hotel no encontrado" });
    }

    const { tenant_id: tenantId } = hotelResult.rows[0];

    const membershipsResult = await client.query(
      `DELETE FROM tenant_usuario
       WHERE tenant_id = $1
         AND rol IN ('recepcionista', 'huesped', 'gerente')
       RETURNING usuario_id, rol`,
      [tenantId]
    );

    // Borramos fichas de huéspedes asociadas al hotel (tenant)
    await client.query(
      "DELETE FROM huesped WHERE tenant_id = $1",
      [tenantId]
    );

    const removedUserIds = membershipsResult.rows.map(row => row.usuario_id);

    if (removedUserIds.length > 0) {
      await client.query(
        `DELETE FROM usuario
         WHERE usuario_id = ANY($1::uuid[])
           AND NOT EXISTS (
             SELECT 1
             FROM tenant_usuario tu
             WHERE tu.usuario_id = usuario.usuario_id
           )`,
        [removedUserIds]
      );
    }

    const deleteResult = await client.query(
      "DELETE FROM hotel WHERE hotel_id = $1 RETURNING *",
      [id]
    );

    await client.query("COMMIT");

    const redis = await ensureRedisConnection();
    await Promise.all([
      redis.del(HOTEL_LIST_CACHE_KEY),
      redis.del(`${HOTEL_CACHE_PREFIX}${id}`),
    ]);

    res.json({
      message: "Hotel eliminado",
      hotel: deleteResult.rows[0],
      usuariosEliminados: membershipsResult.rows.length,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al eliminar hotel:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
