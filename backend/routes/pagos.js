// backend/routes/pagos.js
import express from "express";
import { pool } from "../models/db.js";

const router = express.Router();

async function fetchMembership({ tenant, usuario }) {
  if (!tenant || !usuario) return null;
  const membershipRes = await pool.query(
    `SELECT rol
     FROM tenant_usuario
     WHERE tenant_id = $1 AND usuario_id = $2
     LIMIT 1`,
    [tenant, usuario]
  );
  return membershipRes.rows[0] || null;
}

async function ensureHotelBelongs({ hotel, tenant }) {
  if (!hotel || !tenant) return null;
  const hotelRes = await pool.query(
    `SELECT hotel_id, tenant_id
     FROM hotel
     WHERE hotel_id = $1 AND tenant_id = $2
     LIMIT 1`,
    [hotel, tenant]
  );
  return hotelRes.rows[0] || null;
}

async function ensureSucursalBelongs({ sucursalId, hotelId, tenantId }) {
  if (!sucursalId || !hotelId || !tenantId) return null;
  const sucursalRes = await pool.query(
    `SELECT sucursal_id, hotel_id, tenant_id
     FROM sucursal
     WHERE sucursal_id = $1 AND hotel_id = $2 AND tenant_id = $3
     LIMIT 1`,
    [sucursalId, hotelId, tenantId]
  );
  return sucursalRes.rows[0] || null;
}

async function fetchRecepcionistaSucursal({ usuarioId, tenantId, hotelId }) {
  if (!usuarioId || !tenantId) return null;
  const params = [usuarioId, tenantId];
  let query = `
    SELECT sucursal_id, hotel_id, tenant_id
    FROM recepcionista_sucursal
    WHERE usuario_id = $1
      AND tenant_id = $2
      AND (activo IS NULL OR activo = true)
  `;

  if (hotelId) {
    params.push(hotelId);
    query += ` AND hotel_id = $${params.length}`;
  }

  query += " ORDER BY created_at ASC NULLS LAST LIMIT 1";

  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

// Obtener detalles de un pago específico
router.get("/:pago_id/detalle", async (req, res) => {
  try {
    const { pago_id } = req.params;
    const {
      tenantId,
      tenant_id: tenantIdSnake,
      usuarioId,
      usuario_id: usuarioIdSnake,
      sucursalId,
      sucursal_id: sucursalIdSnake,
    } = req.query;

    const tenant = tenantId || tenantIdSnake || null;
    const usuario = usuarioId || usuarioIdSnake || null;
    const sucursal = sucursalId || sucursalIdSnake || null;

    const query = `
      SELECT 
        p.*,
        dp.*,
        r.reserva_id,
        r.fecha_inicio,
        r.fecha_fin,
        r.total as reserva_total,
        h.hotel_id,
        h.numero as habitacion_numero,
        h.tipo as habitacion_tipo,
        h.sucursal_id,
        hotel.nombre as hotel_nombre,
        hotel.direccion as hotel_direccion,
        hotel.telefono as hotel_telefono,
        hotel.email as hotel_email,
        u.nombre as huesped_nombre,
        u.email as huesped_email,
        t.nombre as tenant_nombre
      FROM pago p
      LEFT JOIN detalle_pago dp ON p.pago_id = dp.pago_id
      JOIN reserva r ON p.reserva_id = r.reserva_id
      JOIN habitacion h ON r.habitacion_id = h.habitacion_id
      JOIN hotel ON h.hotel_id = hotel.hotel_id
      JOIN tenant t ON p.tenant_id = t.tenant_id
      LEFT JOIN huesped hu ON r.huesped_id = hu.huesped_id
      LEFT JOIN usuario u ON hu.email = u.email
      WHERE p.pago_id = $1
    `;

    const result = await pool.query(query, [pago_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    const pago = result.rows[0];

    if (tenant && usuario) {
      const membership = await fetchMembership({ tenant, usuario });
      if (!membership) {
        return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
      }

      if (String(pago.tenant_id) !== String(tenant)) {
        return res.status(403).json({ error: "No puede acceder a pagos de otro tenant" });
      }

      if (membership.rol === "recepcionista") {
        const recepcionistaSucursal = await fetchRecepcionistaSucursal({
          usuarioId: usuario,
          tenantId: tenant,
          hotelId: pago.hotel_id,
        });

        if (!recepcionistaSucursal) {
          return res.status(403).json({ error: "El recepcionista no tiene una sucursal asignada" });
        }

        if (String(recepcionistaSucursal.sucursal_id) !== String(pago.sucursal_id)) {
          return res.status(403).json({ error: "No puede ver pagos de otra sucursal" });
        }

        if (sucursal && String(sucursal) !== String(pago.sucursal_id)) {
          return res.status(403).json({ error: "La sucursal indicada no coincide con la del pago" });
        }
      } else if (sucursal) {
        const sucursalRow = await ensureSucursalBelongs({
          sucursalId: sucursal,
          hotelId: pago.hotel_id,
          tenantId: tenant,
        });

        if (!sucursalRow || String(sucursalRow.sucursal_id) !== String(pago.sucursal_id)) {
          return res.status(403).json({ error: "No puede acceder a pagos de otra sucursal" });
        }
      }
    }

    res.json(pago);
  } catch (error) {
    console.error("Error al obtener detalle de pago:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Crear o actualizar detalle de pago
router.post("/:pago_id/detalle", async (req, res) => {
  try {
    const { pago_id } = req.params;
    const {
      descripcion,
      referencia_transaccion,
      comprobante_url
    } = req.body;

    // Verificar que el pago existe
    const pagoCheck = await pool.query(
      "SELECT pago_id FROM pago WHERE pago_id = $1",
      [pago_id]
    );

    if (pagoCheck.rows.length === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    // Insertar o actualizar detalle de pago
    const query = `
      INSERT INTO detalle_pago (
        pago_id, 
        descripcion, 
        fecha_pago, 
        hora_confirmacion, 
        referencia_transaccion, 
        comprobante_url
      ) VALUES ($1, $2, NOW(), NOW(), $3, $4)
      ON CONFLICT (pago_id) DO UPDATE SET
        descripcion = EXCLUDED.descripcion,
        hora_confirmacion = NOW(),
        referencia_transaccion = EXCLUDED.referencia_transaccion,
        comprobante_url = EXCLUDED.comprobante_url
      RETURNING *
    `;

    const result = await pool.query(query, [
      pago_id,
      descripcion,
      referencia_transaccion,
      comprobante_url
    ]);

    // Actualizar estado del pago a 'pagado'
    await pool.query(
      "UPDATE pago SET estado = 'pagado' WHERE pago_id = $1",
      [pago_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear/actualizar detalle de pago:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Generar boleta/factura
router.get("/:pago_id/boleta", async (req, res) => {
  try {
    const { pago_id } = req.params;
    const {
      tenantId,
      tenant_id: tenantIdSnake,
      usuarioId,
      usuario_id: usuarioIdSnake,
      sucursalId,
      sucursal_id: sucursalIdSnake,
    } = req.query;

    const tenant = tenantId || tenantIdSnake || null;
    const usuario = usuarioId || usuarioIdSnake || null;
    const sucursal = sucursalId || sucursalIdSnake || null;
    
    const query = `
      SELECT 
        p.pago_id,
        p.tenant_id,
        p.monto,
        p.metodo,
        p.fecha as fecha_pago,
        p.estado as estado_pago,
        dp.descripcion,
        dp.fecha_pago as fecha_confirmacion,
        dp.referencia_transaccion,
        r.reserva_id,
        r.fecha_inicio,
        r.fecha_fin,
        r.total as reserva_total,
        r.estado as estado_reserva,
        h.hotel_id,
        h.numero as habitacion_numero,
        h.tipo as habitacion_tipo,
        h.sucursal_id,
        h.precio_noche,
        hotel.nombre as hotel_nombre,
        hotel.direccion as hotel_direccion,
        hotel.telefono as hotel_telefono,
        hotel.email as hotel_email,
        u.nombre as huesped_nombre,
        u.email as huesped_email,
        t.nombre as tenant_nombre,
        (r.fecha_fin - r.fecha_inicio) as cantidad_noches
      FROM pago p
      LEFT JOIN detalle_pago dp ON p.pago_id = dp.pago_id
      JOIN reserva r ON p.reserva_id = r.reserva_id
      JOIN habitacion h ON r.habitacion_id = h.habitacion_id
      JOIN hotel ON h.hotel_id = hotel.hotel_id
      JOIN tenant t ON p.tenant_id = t.tenant_id
      LEFT JOIN huesped hu ON r.huesped_id = hu.huesped_id
      LEFT JOIN usuario u ON hu.email = u.email
      WHERE p.pago_id = $1
    `;
    
    const result = await pool.query(query, [pago_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    const data = result.rows[0];

    if (tenant && usuario) {
      const membership = await fetchMembership({ tenant, usuario });
      if (!membership) {
        return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
      }

      if (String(data.tenant_id) !== String(tenant)) {
        return res.status(403).json({ error: "No puede acceder a pagos de otro tenant" });
      }

      if (membership.rol === "recepcionista") {
        const recepcionistaSucursal = await fetchRecepcionistaSucursal({
          usuarioId: usuario,
          tenantId: tenant,
          hotelId: data.hotel_id,
        });

        if (!recepcionistaSucursal) {
          return res.status(403).json({ error: "El recepcionista no tiene una sucursal asignada" });
        }

        if (String(recepcionistaSucursal.sucursal_id) !== String(data.sucursal_id)) {
          return res.status(403).json({ error: "No puede ver pagos de otra sucursal" });
        }

        if (sucursal && String(sucursal) !== String(data.sucursal_id)) {
          return res.status(403).json({ error: "La sucursal indicada no coincide con la del pago" });
        }
      } else if (sucursal) {
        const sucursalRow = await ensureSucursalBelongs({
          sucursalId: sucursal,
          hotelId: data.hotel_id,
          tenantId: tenant,
        });

        if (!sucursalRow || String(sucursalRow.sucursal_id) !== String(data.sucursal_id)) {
          return res.status(403).json({ error: "No puede acceder a pagos de otra sucursal" });
        }
      }
    }

    // Generar número de boleta único
    const numero_boleta = `BOL-${Date.now()}-${pago_id.slice(0, 8)}`;
    
    // Estructura de la boleta
    const boleta = {
      numero_boleta,
      fecha_emision: new Date().toISOString(),
      hotel: {
        nombre: data.hotel_nombre,
        direccion: data.hotel_direccion,
        telefono: data.hotel_telefono,
        email: data.hotel_email
      },
      cliente: {
        nombre: data.huesped_nombre,
        email: data.huesped_email
      },
      reserva: {
        id: data.reserva_id,
        habitacion: `${data.habitacion_numero} (${data.habitacion_tipo})`,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        noches: parseInt(data.cantidad_noches) || 1,
        precio_noche: data.precio_noche
      },
      pago: {
        id: data.pago_id,
        monto: data.monto,
        metodo: data.metodo,
        fecha: data.fecha_pago,
        estado: data.estado_pago,
        referencia: data.referencia_transaccion
      },
      detalles_facturacion: [
        {
          descripcion: `Alojamiento ${data.cantidad_noches} ${parseInt(data.cantidad_noches) === 1 ? 'noche' : 'noches'} - Habitación ${data.habitacion_numero}`,
          cantidad: parseInt(data.cantidad_noches) || 1,
          precio_unitario: Math.round(data.precio_noche / 1.19),
          subtotal: Math.round(data.monto / 1.19)
        }
      ],
      subtotal: Math.round(data.monto / 1.19),
      iva: Math.round(data.monto - (data.monto / 1.19)),
      total: data.monto,
      observaciones: data.descripcion || null
    };

    res.json(boleta);
  } catch (error) {
    console.error("Error al generar boleta:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener todos los pagos con sus detalles
router.get("/", async (req, res) => {
  try {
    const {
      hotelId,
      estado_pago: estadoPago,
      metodo,
      tenantId,
      tenant_id: tenantIdSnake,
      usuarioId,
      usuario_id: usuarioIdSnake,
      sucursalId,
      sucursal_id: sucursalIdSnake,
    } = req.query;

    const tenant = tenantId || tenantIdSnake || null;
    const usuario = usuarioId || usuarioIdSnake || null;
    const sucursal = sucursalId || sucursalIdSnake || null;

    let query = `
      SELECT 
        p.*,
        dp.descripcion,
        dp.referencia_transaccion,
        r.reserva_id,
        r.fecha_inicio,
        r.fecha_fin,
        h.hotel_id,
        h.sucursal_id,
        h.numero as habitacion_numero,
        u.nombre as huesped_nombre,
        hotel.nombre as hotel_nombre
      FROM pago p
      LEFT JOIN detalle_pago dp ON p.pago_id = dp.pago_id
      JOIN reserva r ON p.reserva_id = r.reserva_id
      JOIN habitacion h ON r.habitacion_id = h.habitacion_id
      JOIN hotel ON h.hotel_id = hotel.hotel_id
      LEFT JOIN huesped hu ON r.huesped_id = hu.huesped_id
      LEFT JOIN usuario u ON hu.email = u.email
      WHERE 1=1
    `;

    const params = [];
    let idx = 1;

    let membership = null;
    if (tenant && usuario) {
      membership = await fetchMembership({ tenant, usuario });
      if (!membership) {
        return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
      }

      query += ` AND p.tenant_id = $${idx}`;
      params.push(tenant);
      idx += 1;
    } else if (tenant) {
      query += ` AND p.tenant_id = $${idx}`;
      params.push(tenant);
      idx += 1;
    }

    let hotelRow = null;
    if (hotelId) {
      if (tenant) {
        hotelRow = await ensureHotelBelongs({ tenant, hotel: hotelId });
        if (!hotelRow) {
          return res.status(404).json({ error: "Hotel no encontrado para el tenant" });
        }
      }

      query += ` AND hotel.hotel_id = $${idx}`;
      params.push(hotelId);
      idx += 1;
    }

    let sucursalFilter = null;

    if (membership?.rol === "recepcionista") {
      const recepcionistaSucursal = await fetchRecepcionistaSucursal({
        usuarioId: usuario,
        tenantId: tenant,
        hotelId: hotelRow?.hotel_id || hotelId || null,
      });

      if (!recepcionistaSucursal) {
        return res.status(403).json({ error: "El recepcionista no tiene una sucursal asignada" });
      }

      const validatedSucursal = sucursal
        ? await ensureSucursalBelongs({
            sucursalId: sucursal,
            hotelId: recepcionistaSucursal.hotel_id,
            tenantId: tenant,
          })
        : recepcionistaSucursal;

      if (!validatedSucursal) {
        return res.status(403).json({ error: "No puede acceder a otra sucursal" });
      }

      sucursalFilter = validatedSucursal.sucursal_id;

      if (!hotelId) {
        query += ` AND hotel.hotel_id = $${idx}`;
        params.push(recepcionistaSucursal.hotel_id);
        idx += 1;
      }
    } else if (sucursal && hotelId && tenant) {
      const sucursalRow = await ensureSucursalBelongs({
        sucursalId: sucursal,
        hotelId,
        tenantId: tenant,
      });

      if (!sucursalRow) {
        return res.status(400).json({ error: "La sucursal indicada no pertenece al hotel" });
      }

      sucursalFilter = sucursalRow.sucursal_id;
    } else if (sucursal) {
      sucursalFilter = sucursal;
    }

    if (sucursalFilter) {
      query += ` AND h.sucursal_id = $${idx}`;
      params.push(sucursalFilter);
      idx += 1;
    }

    if (estadoPago) {
      query += ` AND p.estado = $${idx}`;
      params.push(estadoPago);
      idx += 1;
    }

    if (metodo) {
      query += ` AND p.metodo = $${idx}`;
      params.push(metodo);
      idx += 1;
    }

    query += " ORDER BY p.fecha DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pagos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
