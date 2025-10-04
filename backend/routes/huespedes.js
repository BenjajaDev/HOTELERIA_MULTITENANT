import express from 'express';
import { Huesped, Usuario, Tenant, TenantUsuario, Reserva, Habitacion, Hotel, Pago, Sucursal } from '../models/index.js';
import { Op } from 'sequelize';
import db from '../models/index.js';

const router = express.Router();

async function ensureTenantPermission({ usuarioId }, tenantId, allowedRoles = ["admin", "gerente"]) {
  if (!usuarioId) {
    return null;
  }

  const membership = await TenantUsuario.findOne({
    where: {
      usuario_id: usuarioId,
      tenant_id: tenantId
    },
    attributes: ['rol']
  });

  if (!membership) {
    const err = new Error("No autorizado para gestionar huéspedes en este hotel");
    err.status = 403;
    throw err;
  }

  const rol = membership.rol;
  if (!allowedRoles.includes(rol)) {
    const err = new Error("El rol no tiene permisos suficientes");
    err.status = 403;
    throw err;
  }

  return rol;
}

// GET /api/huespedes - Obtener todos los huéspedes (solo admin)
router.get('/', async (req, res) => {
  try {
    // Obtener huéspedes de la tabla huesped con sus estadísticas
    const huespedes = await Huesped.findAll({
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['nombre']
        },
        {
          model: Sucursal,
          as: 'sucursal',
          required: false,
          attributes: ['nombre', 'hotel_id']
        },
        {
          model: Reserva,
          as: 'reservas',
          required: false,
          attributes: ['reserva_id', 'estado', 'total']
        }
      ]
    });

    const huespedResults = huespedes.map(h => {
      const plain = h.get({ plain: true });
      const totalReservas = plain.reservas?.length || 0;
      const reservasConfirmadas = plain.reservas?.filter(r => r.estado === 'confirmada').length || 0;
      const reservasPendientes = plain.reservas?.filter(r => r.estado === 'pendiente').length || 0;
      const totalGastado = plain.reservas
        ?.filter(r => r.estado === 'confirmada')
        .reduce((sum, r) => sum + parseFloat(r.total || 0), 0) || 0;

      return {
        id: plain.huesped_id,
        tenant_id: plain.tenant_id,
        sucursal_id: plain.sucursal_id,
        sucursal_nombre: plain.sucursal?.nombre || null,
        hotel_id: plain.sucursal?.hotel_id || null,
        nombre_completo: plain.nombre_completo,
        email: plain.email,
        telefono: plain.telefono,
        documento: plain.documento,
        created_at: plain.created_at,
        tenant_nombre: plain.tenant?.nombre || null,
        total_reservas: totalReservas,
        reservas_confirmadas: reservasConfirmadas,
        reservas_pendientes: reservasPendientes,
        total_gastado: totalGastado,
        source: 'huesped_table'
      };
    });

    // Obtener IDs de huéspedes que ya están en la tabla huesped
    const huespedIds = huespedes.map(h => h.huesped_id);

    // Obtener usuarios con rol de huésped que NO están en tabla huesped
    const usuarios = await Usuario.findAll({
      include: [
        {
          model: TenantUsuario,
          as: 'tenant_usuarios',
          required: true,
          where: { rol: 'huesped' },
          include: [
            {
              model: Tenant,
              as: 'tenant',
              attributes: ['nombre']
            }
          ]
        }
      ],
      where: huespedIds.length > 0 ? {
        usuario_id: { [Op.notIn]: huespedIds }
      } : {}
    });

    const usuarioResults = usuarios.map(u => {
      const plain = u.get({ plain: true });
      const tenantUsuario = plain.tenant_usuarios?.[0] || {};

      return {
        id: plain.usuario_id,
        tenant_id: tenantUsuario.tenant_id || null,
        sucursal_id: null,
        sucursal_nombre: null,
        hotel_id: null,
        nombre_completo: plain.nombre,
        email: plain.email,
        telefono: null,
        documento: null,
        created_at: plain.created_at,
        tenant_nombre: tenantUsuario.tenant?.nombre || null,
        total_reservas: 0,
        reservas_confirmadas: 0,
        reservas_pendientes: 0,
        total_gastado: 0,
        source: 'usuario_table'
      };
    });

    // Combinar y ordenar por fecha de creación
    const combinedResults = [...huespedResults, ...usuarioResults]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(combinedResults);
  } catch (error) {
    console.error('Error al obtener huéspedes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/huespedes - Crear huésped (admin o gerente del hotel)
router.post('/', async (req, res) => {
  const {
    nombre_completo,
    email,
    telefono,
    documento,
    hotel_id: hotelIdSnake,
    hotelId: hotelIdCamel,
    tenant_id: tenantIdSnake,
    tenantId: tenantIdCamel,
    usuario_id: usuarioIdSnake,
    usuarioId: usuarioIdCamel,
  } = req.body;

  if (!nombre_completo || !nombre_completo.trim()) {
    return res.status(400).json({ error: 'El nombre completo es obligatorio' });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'El email es obligatorio' });
  }

  const emailLower = email.trim().toLowerCase();
  const telefonoNormalizado = telefono ? String(telefono).trim() : null;
  const documentoNormalizado = documento ? String(documento).trim() : null;

  const usuarioId = usuarioIdCamel || usuarioIdSnake || null;
  const providedTenantId = tenantIdCamel || tenantIdSnake || null;
  const hotelId = hotelIdCamel || hotelIdSnake || null;

  let targetTenantId = providedTenantId;

  try {
    if (!targetTenantId && hotelId) {
      const hotel = await Hotel.findByPk(hotelId, {
        attributes: ['tenant_id']
      });

      if (!hotel) {
        return res.status(404).json({ error: 'Hotel no encontrado' });
      }

      targetTenantId = hotel.tenant_id;
    }

    if (!targetTenantId) {
      return res.status(400).json({ error: 'Debe indicar el tenant o el hotel asociado' });
    }

    await ensureTenantPermission({ usuarioId }, targetTenantId);

    const emailHuesped = await Huesped.findOne({
      where: {
        tenant_id: targetTenantId,
        email: db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('email')),
          emailLower
        )
      }
    });

    if (emailHuesped) {
      return res.status(409).json({ error: 'Ya existe un huésped con ese email en el hotel' });
    }

    const emailUsuario = await Usuario.findOne({
      where: {
        email: db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('email')),
          emailLower
        )
      }
    });

    if (emailUsuario) {
      return res.status(409).json({ error: 'El email ya está en uso por otro usuario' });
    }

    const nuevoHuesped = await Huesped.create({
      tenant_id: targetTenantId,
      nombre_completo: nombre_completo.trim(),
      email: emailLower,
      telefono: telefonoNormalizado || null,
      documento: documentoNormalizado || null
    });

    res.status(201).json(nuevoHuesped);
  } catch (error) {
    console.error('Error al crear huésped:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Error interno del servidor' });
  }
});

// GET /api/huespedes/:id - Obtener un huésped específico con detalles de reservas
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primero buscar en la tabla huesped
    let huesped = await Huesped.findByPk(id, {
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['nombre']
        },
        {
          model: Sucursal,
          as: 'sucursal',
          required: false,
          attributes: ['nombre', 'hotel_id']
        }
      ]
    });
    
    let huespedData;
    let source = 'huesped_table';
    
    if (huesped) {
      const plain = huesped.get({ plain: true });
      huespedData = {
        id: plain.huesped_id,
        tenant_id: plain.tenant_id,
        sucursal_id: plain.sucursal_id,
        sucursal_nombre: plain.sucursal?.nombre || null,
        hotel_id: plain.sucursal?.hotel_id || null,
        nombre_completo: plain.nombre_completo,
        email: plain.email,
        telefono: plain.telefono,
        documento: plain.documento,
        created_at: plain.created_at,
        tenant_nombre: plain.tenant?.nombre || null,
        source
      };
    } else {
      // Si no se encuentra en huesped, buscar en usuarios con rol de huesped
      const usuario = await Usuario.findByPk(id, {
        include: [
          {
            model: TenantUsuario,
            as: 'tenant_usuarios',
            required: true,
            where: { rol: 'huesped' },
            include: [
              {
                model: Tenant,
                as: 'tenant',
                attributes: ['nombre']
              }
            ]
          }
        ]
      });
      
      if (!usuario) {
        return res.status(404).json({ error: 'Huésped no encontrado' });
      }
      
      const plain = usuario.get({ plain: true });
      const tenantUsuario = plain.tenant_usuarios?.[0] || {};
      
      huespedData = {
        id: plain.usuario_id,
        tenant_id: tenantUsuario.tenant_id || null,
        sucursal_id: null,
        sucursal_nombre: null,
        hotel_id: null,
        nombre_completo: plain.nombre,
        email: plain.email,
        telefono: null,
        documento: null,
        created_at: plain.created_at,
        tenant_nombre: tenantUsuario.tenant?.nombre || null,
        source: 'usuario_table'
      };
    }
    
    // Obtener reservas del huésped
    const reservas = await Reserva.findAll({
      where: { huesped_id: id },
      include: [
        {
          model: Habitacion,
          as: 'habitacion',
          attributes: ['numero', 'tipo'],
          include: [
            {
              model: Hotel,
              as: 'hotel',
              attributes: ['nombre']
            }
          ]
        },
        {
          model: Pago,
          as: 'pagos',
          required: false,
          attributes: ['metodo', 'estado']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    huespedData.reservas = reservas.map(r => {
      const plain = r.get({ plain: true });
      const pago = plain.pagos && plain.pagos.length > 0 ? plain.pagos[0] : null;
      
      return {
        reserva_id: plain.reserva_id,
        fecha_inicio: plain.fecha_inicio,
        fecha_fin: plain.fecha_fin,
        estado: plain.estado,
        total: plain.total,
        hotel_nombre: plain.habitacion?.hotel?.nombre || null,
        habitacion_numero: plain.habitacion?.numero || null,
        tipo: plain.habitacion?.tipo || null,
        pago_metodo: pago?.metodo || null,
        pago_estado: pago?.estado || null
      };
    });
    
    res.json(huespedData);
  } catch (error) {
    console.error('Error al obtener huésped:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/huespedes/:id - Eliminar un huésped (solo admin)
router.delete('/:id', async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const usuarioId = req.body?.usuarioId || req.body?.usuario_id || null;
    
    // Verificar si el huésped existe en la tabla huesped
    const checkHuesped = await Huesped.findByPk(id, { transaction });
    
    // Verificar si el usuario existe con rol de huésped
    const checkUsuario = await Usuario.findOne({
      where: { usuario_id: id },
      include: [
        {
          model: TenantUsuario,
          as: 'tenant_usuarios',
          where: { rol: 'huesped' },
          required: true
        }
      ],
      transaction
    });
    
    if (!checkHuesped && !checkUsuario) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Huésped no encontrado' });
    }

    let targetTenantId = checkHuesped?.tenant_id || null;

    if (!targetTenantId && checkUsuario) {
      const tenantUsuario = await TenantUsuario.findOne({
        where: { usuario_id: id },
        attributes: ['tenant_id'],
        transaction
      });
      targetTenantId = tenantUsuario?.tenant_id || null;
    }

    if (targetTenantId) {
      try {
        await ensureTenantPermission({ usuarioId }, targetTenantId);
      } catch (err) {
        await transaction.rollback();
        return res.status(err.status || 500).json({ error: err.message });
      }
    }
    
    // Verificar si tiene reservas activas o confirmadas
    const reservasActivas = await Reserva.count({
      where: {
        huesped_id: id,
        estado: { [Op.in]: ['confirmada', 'pendiente'] },
        fecha_fin: { [Op.gte]: new Date() }
      },
      transaction
    });
    
    if (reservasActivas > 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'No se puede eliminar el huésped porque tiene reservas activas o futuras' 
      });
    }
    
    // Si existe en la tabla huesped, eliminarlo
    if (checkHuesped) {
      await checkHuesped.destroy({ transaction });
    }
    
    // Si existe como usuario con rol de huésped, eliminar la relación tenant-usuario y el usuario
    if (checkUsuario) {
      // Eliminar relación tenant-usuario con rol huesped
      await TenantUsuario.destroy({
        where: {
          usuario_id: id,
          rol: 'huesped'
        },
        transaction
      });
      
      // Verificar si el usuario tiene otros roles
      const otherRoles = await TenantUsuario.count({
        where: { usuario_id: id },
        transaction
      });
      
      // Si no tiene otros roles, eliminar el usuario
      if (otherRoles === 0) {
        await Usuario.destroy({
          where: { usuario_id: id },
          transaction
        });
      }
    }
    
    await transaction.commit();
    res.status(204).send();
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error al eliminar huésped:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/huespedes/:id - Actualizar datos de un huésped
router.put('/:id', async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { nombre_completo, email, telefono, documento } = req.body;
    const usuarioId = req.body?.usuarioId || req.body?.usuario_id || null;

    if (!nombre_completo || !email) {
      return res.status(400).json({ error: 'Nombre completo y email son requeridos' });
    }

    const [huespedExist, usuarioExist] = await Promise.all([
      Huesped.findByPk(id, { 
        attributes: ['huesped_id', 'tenant_id'],
        transaction 
      }),
      Usuario.findByPk(id, { 
        attributes: ['usuario_id'],
        transaction 
      })
    ]);

    if (!huespedExist && !usuarioExist) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Huésped no encontrado' });
    }

    const targetTenantId = huespedExist?.tenant_id || null;

    if (targetTenantId) {
      try {
        await ensureTenantPermission({ usuarioId }, targetTenantId);
      } catch (err) {
        await transaction.rollback();
        return res.status(err.status || 500).json({ error: err.message });
      }
    }

    const emailHuespedExist = await Huesped.findOne({
      where: {
        email,
        huesped_id: { [Op.ne]: id }
      },
      transaction
    });

    if (emailHuespedExist) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Ya existe otro huésped con ese email' });
    }

    const emailUsuarioExist = await Usuario.findOne({
      where: {
        email,
        usuario_id: { [Op.ne]: id }
      },
      transaction
    });

    if (emailUsuarioExist) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Ya existe otro usuario con ese email' });
    }

    let updatedHuesped = null;

    if (huespedExist) {
      await huespedExist.update({
        nombre_completo,
        email,
        telefono: telefono ?? null,
        documento: documento ?? null
      }, { transaction });
      
      updatedHuesped = huespedExist.get({ plain: true });
    }

    if (usuarioExist) {
      await usuarioExist.update({
        nombre: nombre_completo,
        email
      }, { transaction });
    }

    await transaction.commit();

    if (updatedHuesped) {
      return res.json(updatedHuesped);
    }

    return res.json({
      huesped_id: id,
      tenant_id: huespedExist?.tenant_id || null,
      nombre_completo,
      email,
      telefono: telefono ?? null,
      documento: documento ?? null
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al actualizar huésped:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
