// backend/routes/pagos.js
import express from "express";
import { 
  fetchMembership, 
  ensureHotelBelongs, 
  ensureSucursalBelongs, 
  fetchRecepcionistaSucursal 
} from "../models/helpers.js";
import { 
  Pago, 
  DetallePago, 
  Reserva, 
  Habitacion, 
  Hotel, 
  Tenant, 
  Huesped, 
  Usuario 
} from "../models/index.js";
import { Op } from "sequelize";
import db from "../models/index.js";

const router = express.Router();

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

    const pagoRecord = await Pago.findOne({
      where: { pago_id },
      include: [
        {
          model: DetallePago,
          as: 'detalle',
          required: false
        },
        {
          model: Reserva,
          as: 'reserva',
          include: [
            {
              model: Habitacion,
              as: 'habitacion',
              include: [
                {
                  model: Hotel,
                  as: 'hotel',
                  attributes: ['hotel_id', 'nombre', 'direccion', 'telefono', 'email']
                }
              ]
            },
            {
              model: Huesped,
              as: 'huesped',
              required: false
            }
          ]
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['nombre']
        }
      ]
    });

    if (!pagoRecord) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    const plain = pagoRecord.get({ plain: true });
    
    // Buscar usuario por email del huésped
    let huespedUsuario = null;
    if (plain.reserva?.huesped?.email) {
      huespedUsuario = await Usuario.findOne({
        where: { email: plain.reserva.huesped.email },
        attributes: ['nombre', 'email']
      });
    }

    const pago = {
      ...plain,
      reserva_id: plain.reserva?.reserva_id,
      fecha_inicio: plain.reserva?.fecha_inicio,
      fecha_fin: plain.reserva?.fecha_fin,
      reserva_total: plain.reserva?.total,
      hotel_id: plain.reserva?.habitacion?.hotel?.hotel_id,
      habitacion_numero: plain.reserva?.habitacion?.numero,
      habitacion_tipo: plain.reserva?.habitacion?.tipo,
      sucursal_id: plain.reserva?.habitacion?.sucursal_id,
      hotel_nombre: plain.reserva?.habitacion?.hotel?.nombre,
      hotel_direccion: plain.reserva?.habitacion?.hotel?.direccion,
      hotel_telefono: plain.reserva?.habitacion?.hotel?.telefono,
      hotel_email: plain.reserva?.habitacion?.hotel?.email,
  huesped_nombre: huespedUsuario?.nombre || plain.reserva?.huesped?.nombre_completo,
      huesped_email: plain.reserva?.huesped?.email,
      tenant_nombre: plain.tenant?.nombre
    };

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
    const pagoCheck = await Pago.findByPk(pago_id);

    if (!pagoCheck) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    const now = new Date();

    // Insertar o actualizar detalle de pago
    const [detalle, created] = await DetallePago.upsert({
      pago_id,
      descripcion,
      fecha_pago: now,
      hora_confirmacion: now,
      referencia_transaccion,
      comprobante_url
    }, {
      returning: true
    });

    // Actualizar estado del pago a 'pagado'
    await Pago.update(
      { estado: 'pagado' },
      { where: { pago_id } }
    );

    res.json(detalle);
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
    
    const pagoRecord = await Pago.findOne({
      where: { pago_id },
      include: [
        {
          model: DetallePago,
          as: 'detalle',
          required: false
        },
        {
          model: Reserva,
          as: 'reserva',
          include: [
            {
              model: Habitacion,
              as: 'habitacion',
              include: [
                {
                  model: Hotel,
                  as: 'hotel',
                  attributes: ['hotel_id', 'nombre', 'direccion', 'telefono', 'email']
                }
              ]
            },
            {
              model: Huesped,
              as: 'huesped',
              required: false
            }
          ]
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['nombre']
        }
      ]
    });
    
    if (!pagoRecord) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    const plain = pagoRecord.get({ plain: true });

    // Buscar usuario por email del huésped
    let huespedUsuario = null;
    if (plain.reserva?.huesped?.email) {
      huespedUsuario = await Usuario.findOne({
        where: { email: plain.reserva.huesped.email },
        attributes: ['nombre', 'email']
      });
    }

    // Calcular cantidad de noches
    const fechaInicio = new Date(plain.reserva.fecha_inicio);
    const fechaFin = new Date(plain.reserva.fecha_fin);
    const cantidadNoches = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24));

    const data = {
      pago_id: plain.pago_id,
      tenant_id: plain.tenant_id,
      monto: plain.monto,
      metodo: plain.metodo,
      fecha_pago: plain.fecha,
      estado_pago: plain.estado,
      descripcion: plain.detalle?.descripcion,
      fecha_confirmacion: plain.detalle?.fecha_pago,
      referencia_transaccion: plain.detalle?.referencia_transaccion,
      reserva_id: plain.reserva?.reserva_id,
      fecha_inicio: plain.reserva?.fecha_inicio,
      fecha_fin: plain.reserva?.fecha_fin,
      reserva_total: plain.reserva?.total,
      estado_reserva: plain.reserva?.estado,
      hotel_id: plain.reserva?.habitacion?.hotel?.hotel_id,
      habitacion_numero: plain.reserva?.habitacion?.numero,
      habitacion_tipo: plain.reserva?.habitacion?.tipo,
      sucursal_id: plain.reserva?.habitacion?.sucursal_id,
      precio_noche: plain.reserva?.habitacion?.precio_noche,
      hotel_nombre: plain.reserva?.habitacion?.hotel?.nombre,
      hotel_direccion: plain.reserva?.habitacion?.hotel?.direccion,
      hotel_telefono: plain.reserva?.habitacion?.hotel?.telefono,
      hotel_email: plain.reserva?.habitacion?.hotel?.email,
  huesped_nombre: huespedUsuario?.nombre || plain.reserva?.huesped?.nombre_completo,
      huesped_email: plain.reserva?.huesped?.email,
      tenant_nombre: plain.tenant?.nombre,
      cantidad_noches: cantidadNoches
    };

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

    const where = {};

    let membership = null;
    if (tenant && usuario) {
      membership = await fetchMembership({ tenant, usuario });
      if (!membership) {
        return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
      }

      where.tenant_id = tenant;
    } else if (tenant) {
      where.tenant_id = tenant;
    }

    let hotelRow = null;
    let hotelFilter = null;
    if (hotelId) {
      if (tenant) {
        hotelRow = await ensureHotelBelongs({ tenant, hotel: hotelId });
        if (!hotelRow) {
          return res.status(404).json({ error: "Hotel no encontrado para el tenant" });
        }
      }
      hotelFilter = hotelId;
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
        hotelFilter = recepcionistaSucursal.hotel_id;
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

    if (estadoPago) {
      where.estado = estadoPago;
    }

    if (metodo) {
      where.metodo = metodo;
    }

    const include = [
      {
        model: DetallePago,
        as: 'detalle',
        required: false,
        attributes: ['descripcion', 'referencia_transaccion']
      },
      {
        model: Reserva,
        as: 'reserva',
        attributes: ['reserva_id', 'fecha_inicio', 'fecha_fin'],
        include: [
          {
            model: Habitacion,
            as: 'habitacion',
            attributes: ['hotel_id', 'sucursal_id', 'numero'],
            where: {
              ...(hotelFilter && { hotel_id: hotelFilter }),
              ...(sucursalFilter && { sucursal_id: sucursalFilter })
            },
            include: [
              {
                model: Hotel,
                as: 'hotel',
                attributes: ['nombre']
              }
            ]
          },
          {
            model: Huesped,
            as: 'huesped',
            required: false,
            attributes: ['email', 'nombre_completo']
          }
        ]
      }
    ];

    const pagos = await Pago.findAll({
      where,
      include,
      order: [['fecha', 'DESC']]
    });

    // Obtener nombres de usuarios para huéspedes
    const emails = pagos
      .map(p => p.reserva?.huesped?.email)
      .filter(Boolean);

    let usuariosMap = {};
    if (emails.length > 0) {
      const usuarios = await Usuario.findAll({
        where: { email: { [Op.in]: emails } },
        attributes: ['email', 'nombre']
      });
      usuariosMap = usuarios.reduce((acc, u) => {
        acc[u.email] = u.nombre;
        return acc;
      }, {});
    }

    const formatted = pagos.map(p => {
      const plain = p.get({ plain: true });
      const huespedEmail = plain.reserva?.huesped?.email;
      const huespedNombre = huespedEmail 
        ? (usuariosMap[huespedEmail] || plain.reserva?.huesped?.nombre_completo)
        : plain.reserva?.huesped?.nombre_completo;

      return {
        ...plain,
        descripcion: plain.detalle?.descripcion,
        referencia_transaccion: plain.detalle?.referencia_transaccion,
        reserva_id: plain.reserva?.reserva_id,
        fecha_inicio: plain.reserva?.fecha_inicio,
        fecha_fin: plain.reserva?.fecha_fin,
        hotel_id: plain.reserva?.habitacion?.hotel_id,
        sucursal_id: plain.reserva?.habitacion?.sucursal_id,
        habitacion_numero: plain.reserva?.habitacion?.numero,
        huesped_nombre: huespedNombre,
        hotel_nombre: plain.reserva?.habitacion?.hotel?.nombre
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("Error al obtener pagos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
