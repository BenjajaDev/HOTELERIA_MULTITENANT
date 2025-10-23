import express from "express";
import { Reserva, Habitacion, Hotel, Huesped, Pago, DetallePago, Usuario, Reembolso } from "../models/index.js";
import { fetchMembership, ensureHotelBelongs, ensureSucursalBelongs, fetchRecepcionistaSucursal } from "../models/helpers.js";
import { Op } from "sequelize";
import db from "../models/index.js";

const router = express.Router();

const METODOS_PERMITIDOS = ["tarjeta", "transferencia", "efectivo"];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

async function fetchReservaById(reservaId) {
  const reserva = await Reserva.findByPk(reservaId, {
    include: [
      {
        model: Habitacion,
        as: 'habitacion',
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
        attributes: ['nombre_completo', 'email']
      },
      {
        model: Pago,
        as: 'pagos',
        required: false,
        include: [
          {
            model: DetallePago,
            as: 'detalle',
            required: false
          },
          {
            model: Reembolso,
            as: 'reembolsos',
            required: false
          }
        ]
      },
      {
        model: Reembolso,
        as: 'reembolsos',
        required: false
      }
    ]
  });

  if (!reserva) return null;

  const plain = reserva.get({ plain: true });
  const startDate = new Date(plain.fecha_inicio);
  const endDate = new Date(plain.fecha_fin);
  const noches = Math.max(1, Math.ceil((endDate - startDate) / MS_PER_DAY));

  const pago = plain.pagos && plain.pagos.length > 0 ? plain.pagos[0] : null;
  const pagos = Array.isArray(plain.pagos)
    ? plain.pagos.map(p => ({
        pago_id: p.pago_id,
        monto: p.monto,
        metodo: p.metodo,
        estado: p.estado,
        fecha: p.fecha,
        detalle: p.detalle?.descripcion || null,
        reembolsos: Array.isArray(p.reembolsos)
          ? p.reembolsos.map(r => ({
              reembolso_id: r.reembolso_id,
              monto: r.monto,
              metodo: r.metodo,
              estado: r.estado,
              motivo: r.motivo,
              detalle: r.detalle,
              creado_en: r.creado_en,
              pago_id: r.pago_id
            }))
          : []
      }))
    : [];

  const reembolsosNivelReserva = Array.isArray(plain.reembolsos)
    ? plain.reembolsos.map(r => ({
        reembolso_id: r.reembolso_id,
        monto: r.monto,
        metodo: r.metodo,
        estado: r.estado,
        motivo: r.motivo,
        detalle: r.detalle,
        creado_en: r.creado_en,
        pago_id: r.pago_id
      }))
    : [];

  const reembolsos = reembolsosNivelReserva.length > 0
    ? reembolsosNivelReserva
    : pagos.flatMap(p => p.reembolsos || []);

  return {
    reserva_id: plain.reserva_id,
    tenant_id: plain.tenant_id,
    habitacion_id: plain.habitacion_id,
    huesped_id: plain.huesped_id,
    fecha_inicio: plain.fecha_inicio,
    fecha_fin: plain.fecha_fin,
    estado: plain.estado,
    total: plain.total,
    created_at: plain.created_at,
    habitacion_numero: plain.habitacion?.numero,
    sucursal_id: plain.habitacion?.sucursal_id,
    hotel_id: plain.habitacion?.hotel_id,
    habitacion_tenant_id: plain.habitacion?.tenant_id,
    hotel_nombre: plain.habitacion?.hotel?.nombre,
    huesped_nombre: plain.huesped?.nombre_completo,
    huesped_email: plain.huesped?.email,
    noches,
    pago_id: pago?.pago_id,
    pago_monto: pago?.monto,
    pago_metodo: pago?.metodo,
    pago_estado: pago?.estado,
    pago_fecha: pago?.fecha,
    pago_detalle: pago?.detalle?.descripcion || null,
    pagos,
    reembolsos
  };
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

const refundMoneyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP'
});

function buildRefundDescription({ metodo, monto }) {
  const montoFormateado = refundMoneyFormatter.format(monto ?? 0);
  if (metodo === 'tarjeta') {
    return `Reembolso ficticio de ${montoFormateado} a la tarjeta utilizada. Se verá reflejado en 3 a 5 días hábiles.`;
  }
  if (metodo === 'transferencia') {
    return `Reembolso ficticio de ${montoFormateado} vía transferencia bancaria al titular registrado.`;
  }
  return `No se registró cargo previo. Reembolso ficticio no aplicable para pagos en efectivo.`;
}

router.get("/", async (req, res) => {
  const {
    hotelId,
    tenantId,
    tenant_id: tenantIdSnake,
    usuarioId,
    usuario_id: usuarioIdSnake,
    sucursalId,
    sucursal_id: sucursalIdSnake,
    estado,
    metodo_pago: metodoPago,
    estado_pago: estadoPago,
    huespedId,
    huesped_id: huespedIdSnake,
    filtrar_por_huesped: filtrarPorHuespedSnake,
    filtrarPorHuesped: filtrarPorHuespedCamel
  } = req.query;

  const tenant = tenantId || tenantIdSnake || null;
  const usuario = usuarioId || usuarioIdSnake || null;
  const sucursal = sucursalId || sucursalIdSnake || null;
  const explicitHuespedId = huespedId || huespedIdSnake || null;
  const forceFilterByHuesped = String(filtrarPorHuespedCamel ?? filtrarPorHuespedSnake ?? "false").toLowerCase() === "true";

  try {
    const habitacionWhere = {};
    const reservaWhere = {};
    const pagoWhere = {};

    let membership = null;
    if (tenant && usuario) {
      membership = await fetchMembership({ tenant, usuario });

      if (!membership) {
        return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
      }

      habitacionWhere.tenant_id = tenant;
    } else if (tenant) {
      habitacionWhere.tenant_id = tenant;
    }

    let hotelRow = null;
    if (hotelId) {
      if (tenant) {
        hotelRow = await ensureHotelBelongs({ tenant, hotel: hotelId });
        if (!hotelRow) {
          return res.status(404).json({ error: "Hotel no encontrado para el tenant" });
        }
      }

      habitacionWhere.hotel_id = hotelId;
    }

    let sucursalFilterValue = null;

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

      sucursalFilterValue = validatedSucursal.sucursal_id;

      if (!hotelId) {
        habitacionWhere.hotel_id = recepcionistaSucursal.hotel_id;
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

      sucursalFilterValue = sucursalRow.sucursal_id;
    } else if (sucursal) {
      sucursalFilterValue = sucursal;
    }

    if (sucursalFilterValue) {
      habitacionWhere.sucursal_id = sucursalFilterValue;
    }

    if (explicitHuespedId) {
      reservaWhere.huesped_id = explicitHuespedId;
    } else if (usuario && membership?.rol === 'huesped') {
      reservaWhere.huesped_id = usuario;
    } else if (usuario && forceFilterByHuesped) {
      reservaWhere.huesped_id = usuario;
    }

    if (estado) {
      reservaWhere.estado = estado;
    }
    if (metodoPago) {
      pagoWhere.metodo = metodoPago;
    }
    if (estadoPago) {
      pagoWhere.estado = estadoPago;
    }

    const reservas = await Reserva.findAll({
      where: reservaWhere,
      include: [
        {
          model: Habitacion,
          as: 'habitacion',
          where: habitacionWhere,
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
          attributes: ['nombre_completo', 'email']
        },
        {
          model: Pago,
          as: 'pagos',
          where: Object.keys(pagoWhere).length > 0 ? pagoWhere : undefined,
          required: false,
          include: [
            {
              model: DetallePago,
              as: 'detalle',
              required: false
            },
            {
              model: Reembolso,
              as: 'reembolsos',
              required: false
            }
          ]
        },
        {
          model: Reembolso,
          as: 'reembolsos',
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formattedReservas = reservas.map(r => {
      const plain = r.get({ plain: true });
      const startDate = new Date(plain.fecha_inicio);
      const endDate = new Date(plain.fecha_fin);
      const noches = Math.max(1, Math.ceil((endDate - startDate) / MS_PER_DAY));

      const pago = plain.pagos && plain.pagos.length > 0 ? plain.pagos[0] : null;
      const pagos = Array.isArray(plain.pagos)
        ? plain.pagos.map(p => ({
            pago_id: p.pago_id,
            monto: p.monto,
            metodo: p.metodo,
            estado: p.estado,
            fecha: p.fecha,
            detalle: p.detalle?.descripcion || null,
            reembolsos: Array.isArray(p.reembolsos)
              ? p.reembolsos.map(r => ({
                  reembolso_id: r.reembolso_id,
                  monto: r.monto,
                  metodo: r.metodo,
                  estado: r.estado,
                  motivo: r.motivo,
                  detalle: r.detalle,
                  creado_en: r.creado_en,
                  pago_id: r.pago_id
                }))
              : []
          }))
        : [];

      const reembolsosNivelReserva = Array.isArray(plain.reembolsos)
        ? plain.reembolsos.map(r => ({
            reembolso_id: r.reembolso_id,
            monto: r.monto,
            metodo: r.metodo,
            estado: r.estado,
            motivo: r.motivo,
            detalle: r.detalle,
            creado_en: r.creado_en,
            pago_id: r.pago_id
          }))
        : [];

      const reembolsos = reembolsosNivelReserva.length > 0
        ? reembolsosNivelReserva
        : pagos.flatMap(p => p.reembolsos || []);

      return {
        reserva_id: plain.reserva_id,
        tenant_id: plain.tenant_id,
        habitacion_id: plain.habitacion_id,
        huesped_id: plain.huesped_id,
        fecha_inicio: plain.fecha_inicio,
        fecha_fin: plain.fecha_fin,
        estado: plain.estado,
        total: plain.total,
        created_at: plain.created_at,
        habitacion_numero: plain.habitacion?.numero,
        sucursal_id: plain.habitacion?.sucursal_id,
        hotel_id: plain.habitacion?.hotel_id,
        habitacion_tenant_id: plain.habitacion?.tenant_id,
        hotel_nombre: plain.habitacion?.hotel?.nombre,
        huesped_nombre: plain.huesped?.nombre_completo,
        huesped_email: plain.huesped?.email,
        noches,
        pago_id: pago?.pago_id,
        pago_monto: pago?.monto,
        pago_metodo: pago?.metodo,
        pago_estado: pago?.estado,
        pago_fecha: pago?.fecha,
        pago_detalle: pago?.detalle?.descripcion || null,
        pagos,
        reembolsos
      };
    });

    res.json(formattedReservas);
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

  const transaction = await db.sequelize.transaction();
  try {
    const habitacion = await Habitacion.findByPk(habitacion_id, { transaction });

    if (!habitacion) {
      await transaction.rollback();
      return res.status(404).json({ error: "Habitación no encontrada" });
    }

    if (tenantIdFromBody && tenantIdFromBody !== habitacion.tenant_id) {
      await transaction.rollback();
      return res.status(400).json({ error: "La habitación no pertenece al tenant indicado" });
    }

    const huespedId = huesped_id;

    let huespedExistente = await Huesped.findOne({
      where: {
        huesped_id: huespedId,
        tenant_id: habitacion.tenant_id
      },
      transaction
    });

    if (!huespedExistente) {
      const usuario = await Usuario.findByPk(huespedId, { transaction });

      await Huesped.create({
        huesped_id: usuario?.usuario_id || huespedId,
        tenant_id: habitacion.tenant_id,
        nombre_completo: usuario?.nombre || usuario?.email || "Huésped",
        email: usuario?.email,
        telefono: null
      }, { 
        transaction,
        ignoreDuplicates: true 
      });
    }

    const overlap = await Reserva.findOne({
      where: {
        habitacion_id,
        estado: { [Op.ne]: 'cancelada' },
        [Op.not]: {
          [Op.or]: [
            { fecha_fin: { [Op.lte]: fecha_inicio } },
            { fecha_inicio: { [Op.gte]: fecha_fin } }
          ]
        }
      },
      transaction
    });

    if (overlap) {
      await transaction.rollback();
      return res
        .status(409)
        .json({ error: "La habitación ya está reservada en esas fechas" });
    }

    const total = nights * Number(habitacion.precio_noche);
    const estadoReserva = metodo === "efectivo" ? "pendiente" : "confirmada";
    const estadoPago = metodo === "efectivo" ? "pendiente" : "pagado";

    const reserva = await Reserva.create({
      tenant_id: habitacion.tenant_id,
      habitacion_id,
      huesped_id,
      fecha_inicio,
      fecha_fin,
      estado: estadoReserva,
      total
    }, { transaction });

    const pago = await Pago.create({
      tenant_id: habitacion.tenant_id,
      reserva_id: reserva.reserva_id,
      monto: total,
      metodo,
      estado: estadoPago
    }, { transaction });

    // Si el pago está confirmado (no es efectivo), marcar la habitación como ocupada
    if (estadoPago === "pagado") {
      await Habitacion.update(
        { estado: 'ocupada' },
        { 
          where: { habitacion_id },
          transaction 
        }
      );
    }

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

      await DetallePago.create({
        pago_id: pago.pago_id,
        descripcion,
        fecha_pago: estadoPago === "pagado" ? new Date() : null,
        hora_confirmacion: estadoPago === "pagado" ? new Date() : null,
        referencia_transaccion: referencia,
        comprobante_url: comprobante
      }, { transaction });
    }

    await transaction.commit();

    const creada = await fetchReservaById(reserva.reserva_id);
    res.status(201).json(creada);
  } catch (err) {
    await transaction.rollback();
    console.error("Error al crear reserva:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/cancelar", async (req, res) => {
  const { id } = req.params;
  const {
    tenant_id: tenantIdSnake,
    tenantId: tenantIdCamel,
    usuario_id: usuarioIdSnake,
    usuarioId: usuarioIdCamel,
    motivo,
    motivo_cancelacion: motivoAlt
  } = req.body || {};

  const tenantId = tenantIdCamel || tenantIdSnake;
  const usuarioId = usuarioIdCamel || usuarioIdSnake;
  const motivoFinal = motivo || motivoAlt || 'Cancelación solicitada por el huésped';

  if (!tenantId || !usuarioId) {
    return res.status(400).json({ error: "Debe indicar el tenant y el usuario que solicita la cancelación" });
  }

  try {
    const membership = await fetchMembership({ tenant: tenantId, usuario: usuarioId });

    if (!membership) {
      return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
    }

    const reserva = await Reserva.findOne({
      where: { reserva_id: id, tenant_id: tenantId },
      include: [
        {
          model: Pago,
          as: 'pagos',
          required: false,
          include: [
            {
              model: DetallePago,
              as: 'detalle',
              required: false
            },
            {
              model: Reembolso,
              as: 'reembolsos',
              required: false
            }
          ]
        }
      ]
    });

    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    if (membership.rol === 'huesped' && reserva.huesped_id !== usuarioId) {
      return res.status(403).json({ error: "No puedes cancelar reservas de otro huésped" });
    }

    if (reserva.estado === 'cancelada') {
      return res.status(400).json({ error: "La reserva ya se encuentra cancelada" });
    }

    const hoyIso = new Date().toISOString().slice(0, 10);
    const inicioIso = typeof reserva.fecha_inicio === 'string'
      ? reserva.fecha_inicio
      : reserva.fecha_inicio?.toISOString?.().slice(0, 10);

    if (membership.rol === 'huesped' && inicioIso && inicioIso <= hoyIso) {
      return res.status(400).json({ error: "No es posible cancelar una reserva que ya comenzó" });
    }

    const transaction = await db.sequelize.transaction();

    try {
      await reserva.update({ estado: 'cancelada' }, { transaction });

      // Liberar la habitación marcándola como disponible
      await Habitacion.update(
        { estado: 'disponible' },
        { 
          where: { habitacion_id: reserva.habitacion_id },
          transaction 
        }
      );

      const pagos = await Pago.findAll({
        where: { reserva_id: id },
        include: [
          { model: DetallePago, as: 'detalle', required: false },
          { model: Reembolso, as: 'reembolsos', required: false }
        ],
        transaction
      });

      const nuevosReembolsos = [];

      for (const pago of pagos) {
        if (Array.isArray(pago.reembolsos) && pago.reembolsos.length > 0) {
          nuevosReembolsos.push(...pago.reembolsos.map(r => r.get({ plain: true })));
          continue;
        }

        let estadoReembolso = 'procesado';
        let montoReembolso = pago.monto || 0;
        let detalleReembolso = buildRefundDescription({ metodo: pago.metodo, monto: pago.monto || 0 });

        if (pago.metodo === 'efectivo' && pago.estado !== 'pagado') {
          estadoReembolso = 'no_aplica';
          montoReembolso = 0;
        }

        const reembolso = await Reembolso.create({
          tenant_id: tenantId,
          reserva_id: reserva.reserva_id,
          pago_id: pago.pago_id,
          monto: montoReembolso,
          metodo: pago.metodo,
          estado: estadoReembolso,
          motivo: motivoFinal,
          detalle: detalleReembolso
        }, { transaction });

        nuevosReembolsos.push(reembolso.get({ plain: true }));

        if (pago.detalle) {
          const originalDescripcion = pago.detalle.descripcion || '';
          const marcaTiempo = new Date().toISOString();
          const nuevaDescripcion = `${originalDescripcion ? `${originalDescripcion}\n` : ''}Reembolso ficticio generado el ${marcaTiempo}`;
          await pago.detalle.update({ descripcion: nuevaDescripcion }, { transaction });
        }
      }

      await transaction.commit();

      const detalle = await fetchReservaById(id);
      return res.json({
        message: "Reserva cancelada y reembolso ficticio generado",
        reserva: detalle,
        reembolsos: nuevosReembolsos
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error al cancelar reserva:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha_inicio, fecha_fin, estado, total, estado_pago } = req.body;

  const transaction = await db.sequelize.transaction();
  try {
    const reserva = await Reserva.findByPk(id, { transaction });

    if (!reserva) {
      await transaction.rollback();
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    const updates = {};

    if (typeof fecha_inicio !== "undefined") {
      updates.fecha_inicio = fecha_inicio;
    }
    if (typeof fecha_fin !== "undefined") {
      updates.fecha_fin = fecha_fin;
    }
    if (typeof estado !== "undefined") {
      updates.estado = estado;
    }
    if (typeof total !== "undefined") {
      updates.total = total;
    }

    if (Object.keys(updates).length > 0) {
      await reserva.update(updates, { transaction });

      if (typeof total !== "undefined") {
        await Pago.update(
          { monto: total },
          { 
            where: { reserva_id: id },
            transaction 
          }
        );
      }
    }

    if (typeof estado_pago !== "undefined") {
      const pagoUpdates = {
        estado: estado_pago
      };

      if (estado_pago === "pagado") {
        pagoUpdates.fecha = new Date();
      }

      await Pago.update(
        pagoUpdates,
        { 
          where: { reserva_id: id },
          transaction 
        }
      );

      // Si el pago se marca como pagado, marcar la habitación como ocupada
      if (estado_pago === "pagado") {
        await Habitacion.update(
          { estado: 'ocupada' },
          { 
            where: { habitacion_id: reserva.habitacion_id },
            transaction 
          }
        );

        const pago = await Pago.findOne({
          where: { reserva_id: id },
          transaction
        });

        if (pago) {
          await DetallePago.update(
            {
              fecha_pago: db.sequelize.fn('COALESCE', db.sequelize.col('fecha_pago'), new Date()),
              hora_confirmacion: db.sequelize.fn('COALESCE', db.sequelize.col('hora_confirmacion'), new Date())
            },
            {
              where: { pago_id: pago.pago_id },
              transaction
            }
          );
        }
      }
    }

    await transaction.commit();

    const detalle = await fetchReservaById(id);
    if (!detalle) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }
    res.json(detalle);
  } catch (err) {
    await transaction.rollback();
    console.error("Error al actualizar reserva:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const reserva = await Reserva.findByPk(id);
    
    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    const reservaId = reserva.reserva_id;
    await reserva.destroy();

    res.json({ message: "Reserva eliminada", reserva_id: reservaId });
  } catch (err) {
    console.error("Error al eliminar reserva:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
