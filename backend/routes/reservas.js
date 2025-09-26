import express from "express";
import { pool } from "../models/db.js";

const router = express.Router();

const METODOS_PERMITIDOS = ["tarjeta", "transferencia", "efectivo"];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const RESERVA_BASE_QUERY = `
  SELECT
    r.reserva_id,
    r.tenant_id,
    r.habitacion_id,
    r.huesped_id,
    r.fecha_inicio,
    r.fecha_fin,
    r.estado,
    r.total,
    r.created_at,
    hab.numero AS habitacion_numero,
    hab.hotel_id,
    hab.tenant_id AS habitacion_tenant_id,
    h.nombre AS hotel_nombre,
    p.pago_id,
    p.monto AS pago_monto,
    p.metodo AS pago_metodo,
    p.estado AS pago_estado,
    p.fecha AS pago_fecha
  FROM reserva r
  JOIN habitacion hab ON hab.habitacion_id = r.habitacion_id
  JOIN hotel h ON h.hotel_id = hab.hotel_id
  LEFT JOIN pago p ON p.reserva_id = r.reserva_id
`;

async function fetchReservaById(reservaId) {
  const detalle = await pool.query(`${RESERVA_BASE_QUERY} WHERE r.reserva_id = $1`, [reservaId]);
  return detalle.rows[0] || null;
}

function buildPaymentDescription(metodo, detalles = {}) {
  if (metodo === "tarjeta") {
    const digits = (detalles.numero || detalles.cardNumber || "").replace(/\D/g, "");
    const last4 = digits.slice(-4) || "####";
    return `Pago con tarjeta ficticia terminación ${last4}`;
  }
  if (metodo === "transferencia") {
    const banco = detalles.banco || detalles.bank || "Banco desconocido";
    const ref = detalles.referencia || detalles.reference || "sin referencia";
    return `Transferencia ficticia ${banco} ref ${ref}`;
  }
  return "Pago en efectivo a cancelar en recepción";
}

router.get("/", async (req, res) => {
  const {
    hotelId,
    tenantId,
    estado,
    metodo_pago: metodoPago,
    estado_pago: estadoPago,
  } = req.query;

  const conditions = [];
  const values = [];
  let idx = 1;

  if (hotelId) {
    conditions.push(`hab.hotel_id = $${idx++}`);
    values.push(hotelId);
  }
  if (tenantId) {
    conditions.push(`hab.tenant_id = $${idx++}`);
    values.push(tenantId);
  }
  if (estado) {
    conditions.push(`r.estado = $${idx++}`);
    values.push(estado);
  }
  if (metodoPago) {
    conditions.push(`p.metodo = $${idx++}`);
    values.push(metodoPago);
  }
  if (estadoPago) {
    conditions.push(`p.estado = $${idx++}`);
    values.push(estadoPago);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `${RESERVA_BASE_QUERY} ${whereClause} ORDER BY r.created_at DESC NULLS LAST`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener reservas:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const {
    tenant_id: tenantIdFromBody,
    habitacion_id,
    huesped_id,
    fecha_inicio,
    fecha_fin,
    metodo_pago,
    detalles_pago,
  } = req.body;

  if (!habitacion_id || !huesped_id || !fecha_inicio || !fecha_fin || !metodo_pago) {
    return res.status(400).json({ error: "Faltan datos obligatorios para crear la reserva" });
  }

  const metodo = String(metodo_pago).toLowerCase();
  if (!METODOS_PERMITIDOS.includes(metodo)) {
    return res.status(400).json({ error: "Método de pago inválido" });
  }

  const startDate = new Date(`${fecha_inicio}T00:00:00Z`);
  const endDate = new Date(`${fecha_fin}T00:00:00Z`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return res.status(400).json({ error: "Fechas inválidas" });
  }

  const nights = Math.ceil((endDate - startDate) / MS_PER_DAY);
  if (nights <= 0) {
    return res
      .status(400)
      .json({ error: "El rango de fechas debe incluir al menos una noche" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const habitacionRes = await client.query(
      `SELECT habitacion_id, tenant_id, hotel_id, precio_noche
       FROM habitacion
       WHERE habitacion_id = $1`,
      [habitacion_id]
    );

    if (habitacionRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Habitación no encontrada" });
    }

    const habitacion = habitacionRes.rows[0];

    if (tenantIdFromBody && tenantIdFromBody !== habitacion.tenant_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "La habitación no pertenece al tenant indicado" });
    }

    const huespedId = huesped_id;

    const huespedRes = await client.query(
      `SELECT huesped_id
       FROM huesped
       WHERE huesped_id = $1
         AND tenant_id = $2
       LIMIT 1`,
      [huespedId, habitacion.tenant_id]
    );

    if (huespedRes.rowCount === 0) {
      const usuarioRes = await client.query(
        `SELECT u.usuario_id, u.nombre, u.email
         FROM usuario u
         WHERE u.usuario_id = $1
         LIMIT 1`,
        [huespedId]
      );

      const usuario = usuarioRes.rows[0] || {
        usuario_id: huespedId,
        nombre: null,
        email: null,
      };

      await client.query(
        `INSERT INTO huesped (huesped_id, tenant_id, nombre_completo, email, telefono, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (huesped_id) DO NOTHING`,
        [
          usuario.usuario_id,
          habitacion.tenant_id,
          usuario.nombre || usuario.email || "Huésped",
          usuario.email,
          null,
        ]
      );
    }

    const overlap = await client.query(
      `SELECT 1
       FROM reserva r
       WHERE r.habitacion_id = $1
         AND r.estado != 'cancelada'
         AND NOT ($3 <= r.fecha_inicio OR $2 >= r.fecha_fin)
       LIMIT 1`,
      [habitacion_id, fecha_inicio, fecha_fin]
    );

    if (overlap.rowCount > 0) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "La habitación ya está reservada en esas fechas" });
    }

    const total = nights * Number(habitacion.precio_noche);
    const estadoReserva = metodo === "efectivo" ? "pendiente" : "confirmada";
    const estadoPago = metodo === "efectivo" ? "pendiente" : "pagado";

    const reservaRes = await client.query(
      `INSERT INTO reserva (tenant_id, habitacion_id, huesped_id, fecha_inicio, fecha_fin, estado, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [habitacion.tenant_id, habitacion_id, huesped_id, fecha_inicio, fecha_fin, estadoReserva, total]
    );
    const reserva = reservaRes.rows[0];

    const pagoRes = await client.query(
      `INSERT INTO pago (tenant_id, reserva_id, monto, metodo, estado)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [habitacion.tenant_id, reserva.reserva_id, total, metodo, estadoPago]
    );
    const pago = pagoRes.rows[0];

    if (metodo !== "efectivo" || detalles_pago) {
      const descripcion = buildPaymentDescription(metodo, detalles_pago);
      const referencia =
        detalles_pago?.referencia ||
        detalles_pago?.reference ||
        detalles_pago?.numero ||
        detalles_pago?.cardNumber ||
        null;
      const comprobante =
        detalles_pago?.comprobante_url || detalles_pago?.comprobanteUrl || null;

      await client.query(
        `INSERT INTO detalle_pago (pago_id, descripcion, fecha_pago, hora_confirmacion, referencia_transaccion, comprobante_url)
         VALUES ($1, $2, CASE WHEN $3 THEN NOW() ELSE NULL END, CASE WHEN $3 THEN NOW() ELSE NULL END, $4, $5)`,
        [pago.pago_id, descripcion, estadoPago === "pagado", referencia, comprobante]
      );
    }

    await client.query("COMMIT");

    const creada = await fetchReservaById(reserva.reserva_id);
    res.status(201).json(creada);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error al crear reserva:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha_inicio, fecha_fin, estado, total, estado_pago } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updates = [];
    const values = [];
    let idx = 1;

    if (typeof fecha_inicio !== "undefined") {
      updates.push(`fecha_inicio = $${idx++}`);
      values.push(fecha_inicio);
    }
    if (typeof fecha_fin !== "undefined") {
      updates.push(`fecha_fin = $${idx++}`);
      values.push(fecha_fin);
    }
    if (typeof estado !== "undefined") {
      updates.push(`estado = $${idx++}`);
      values.push(estado);
    }
    if (typeof total !== "undefined") {
      updates.push(`total = $${idx++}`);
      values.push(total);
    }

    if (updates.length > 0) {
      values.push(id);
      const updatedReserva = await client.query(
        `UPDATE reserva SET ${updates.join(", ")} WHERE reserva_id = $${idx} RETURNING *`,
        values
      );
      if (updatedReserva.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Reserva no encontrada" });
      }
      if (typeof total !== "undefined") {
        await client.query(`UPDATE pago SET monto = $1 WHERE reserva_id = $2`, [total, id]);
      }
    } else {
      const exists = await client.query(`SELECT 1 FROM reserva WHERE reserva_id = $1`, [id]);
      if (exists.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Reserva no encontrada" });
      }
    }

    if (typeof estado_pago !== "undefined") {
      await client.query(
        `UPDATE pago
         SET estado = $1::estado_pago_enum,
             fecha = CASE WHEN $1::estado_pago_enum = 'pagado'::estado_pago_enum THEN NOW() ELSE fecha END
         WHERE reserva_id = $2`,
        [estado_pago, id]
      );

      if (estado_pago === "pagado") {
        await client.query(
          `UPDATE detalle_pago
           SET fecha_pago = COALESCE(fecha_pago, NOW()),
               hora_confirmacion = COALESCE(hora_confirmacion, NOW())
           WHERE pago_id = (
             SELECT pago_id FROM pago WHERE reserva_id = $1 LIMIT 1
           )`,
          [id]
        );
      }
    }

    await client.query("COMMIT");

    const detalle = await fetchReservaById(id);
    if (!detalle) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }
    res.json(detalle);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error al actualizar reserva:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM reserva WHERE reserva_id=$1 RETURNING reserva_id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }
    res.json({ message: "Reserva eliminada", reserva_id: result.rows[0].reserva_id });
  } catch (err) {
    console.error("Error al eliminar reserva:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
