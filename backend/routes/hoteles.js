import express from "express";
import { Hotel, Tenant, Habitacion, Reserva, Pago } from "../models/index.js";
import { ensureRedisConnection } from "../models/redisClient.js";
import { Op } from "sequelize";

const router = express.Router();

const HOTEL_LIST_CACHE_KEY = "cache:hoteles:list";
const HOTEL_CACHE_PREFIX = "cache:hoteles:id:";
const HOTEL_CACHE_TTL_SECONDS = 60;

// GET /api/hoteles - Obtener todos los hoteles
router.get("/", async (req, res) => {
  try {
    const redis = await ensureRedisConnection();
    const cachedHotels = await redis.get(HOTEL_LIST_CACHE_KEY);

    if (cachedHotels) {
      return res.json(JSON.parse(cachedHotels));
    }

    const hotels = await Hotel.findAll({
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'nombre']
        }
      ],
      order: [['created_at', 'DESC']],
      raw: false
    });

    // Calcular ganancias para cada hotel
    const hotelsWithStats = await Promise.all(hotels.map(async (hotel) => {
      const habitaciones = await Habitacion.findAll({
        where: { hotel_id: hotel.hotel_id },
        attributes: ['habitacion_id']
      });

      const habitacionIds = habitaciones.map(h => h.habitacion_id);

      let total_ganancias = 0;
      let total_pendiente = 0;

      if (habitacionIds.length > 0) {
        const reservas = await Reserva.findAll({
          where: { habitacion_id: { [Op.in]: habitacionIds } },
          include: [
            {
              model: Pago,
              as: 'pagos',
              attributes: ['monto', 'estado']
            }
          ]
        });

        reservas.forEach(reserva => {
          reserva.pagos?.forEach(pago => {
            if (pago.estado === 'pagado') {
              total_ganancias += pago.monto || 0;
            } else if (pago.estado === 'pendiente') {
              total_pendiente += pago.monto || 0;
            }
          });
        });
      }

      return {
        ...hotel.toJSON(),
        tenant_nombre: hotel.tenant?.nombre,
        total_ganancias,
        total_pendiente
      };
    }));

    await redis.setEx(
      HOTEL_LIST_CACHE_KEY,
      HOTEL_CACHE_TTL_SECONDS,
      JSON.stringify(hotelsWithStats)
    );

    res.json(hotelsWithStats);
  } catch (err) {
    console.error("Error al obtener hoteles:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hoteles/:id - Obtener un hotel específico
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const redis = await ensureRedisConnection();
    const cacheKey = `${HOTEL_CACHE_PREFIX}${id}`;
    const cachedHotel = await redis.get(cacheKey);

    if (cachedHotel) {
      return res.json(JSON.parse(cachedHotel));
    }

    const hotel = await Hotel.findByPk(id, {
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'nombre']
        }
      ]
    });

    if (!hotel) {
      return res.status(404).json({ error: "Hotel no encontrado" });
    }

    // Calcular stats
    const habitaciones = await Habitacion.findAll({
      where: { hotel_id: hotel.hotel_id },
      attributes: ['habitacion_id']
    });

    const habitacionIds = habitaciones.map(h => h.habitacion_id);

    let total_ganancias = 0;
    let total_pendiente = 0;

    if (habitacionIds.length > 0) {
      const reservas = await Reserva.findAll({
        where: { habitacion_id: { [Op.in]: habitacionIds } },
        include: [
          {
            model: Pago,
            as: 'pagos',
            attributes: ['monto', 'estado']
          }
        ]
      });

      reservas.forEach(reserva => {
        reserva.pagos?.forEach(pago => {
          if (pago.estado === 'pagado') {
            total_ganancias += pago.monto || 0;
          } else if (pago.estado === 'pendiente') {
            total_pendiente += pago.monto || 0;
          }
        });
      });
    }

    const hotelWithStats = {
      ...hotel.toJSON(),
      tenant_nombre: hotel.tenant?.nombre,
      total_ganancias,
      total_pendiente
    };

    await redis.setEx(cacheKey, HOTEL_CACHE_TTL_SECONDS, JSON.stringify(hotelWithStats));
    res.json(hotelWithStats);
  } catch (err) {
    console.error("Error al obtener hotel:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hoteles - Crear un nuevo hotel
router.post("/", async (req, res) => {
  const { nombre, direccion, telefono, email } = req.body;

  try {
    // 1. Crear tenant con el nombre del hotel
    const tenant = await Tenant.create({
      nombre: nombre
    });

    // 2. Crear hotel asociado al tenant
    const hotel = await Hotel.create({
      tenant_id: tenant.tenant_id,
      nombre,
      direccion,
      telefono,
      email
    });

    // 3. Obtener el hotel completo con relaciones
    const created = await Hotel.findByPk(hotel.hotel_id, {
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'nombre']
        }
      ]
    });

    const hotelResponse = {
      ...created.toJSON(),
      tenant_nombre: created.tenant?.nombre,
      total_ganancias: 0,
      total_pendiente: 0
    };

    const redis = await ensureRedisConnection();
    await Promise.all([
      redis.del(HOTEL_LIST_CACHE_KEY),
      redis.setEx(
        `${HOTEL_CACHE_PREFIX}${hotel.hotel_id}`,
        HOTEL_CACHE_TTL_SECONDS,
        JSON.stringify(hotelResponse)
      ),
    ]);

    res.status(201).json(hotelResponse);
  } catch (err) {
    console.error("Error al crear hotel:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hoteles/:id - Actualizar un hotel
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, direccion, telefono, email } = req.body;

  try {
    const hotel = await Hotel.findByPk(id);

    if (!hotel) {
      return res.status(404).json({ error: "Hotel no encontrado" });
    }

    // Actualizar hotel
    await hotel.update({
      nombre,
      direccion,
      telefono,
      email
    });

    // Actualizar nombre del tenant si cambió el nombre del hotel
    if (nombre) {
      await Tenant.update(
        { nombre },
        { where: { tenant_id: hotel.tenant_id } }
      );
    }

    // Obtener hotel actualizado con stats
    const updated = await Hotel.findByPk(id, {
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'nombre']
        }
      ]
    });

    // Calcular stats
    const habitaciones = await Habitacion.findAll({
      where: { hotel_id: id },
      attributes: ['habitacion_id']
    });

    const habitacionIds = habitaciones.map(h => h.habitacion_id);

    let total_ganancias = 0;
    let total_pendiente = 0;

    if (habitacionIds.length > 0) {
      const reservas = await Reserva.findAll({
        where: { habitacion_id: { [Op.in]: habitacionIds } },
        include: [
          {
            model: Pago,
            as: 'pagos',
            attributes: ['monto', 'estado']
          }
        ]
      });

      reservas.forEach(reserva => {
        reserva.pagos?.forEach(pago => {
          if (pago.estado === 'pagado') {
            total_ganancias += pago.monto || 0;
          } else if (pago.estado === 'pendiente') {
            total_pendiente += pago.monto || 0;
          }
        });
      });
    }

    const hotelResponse = {
      ...updated.toJSON(),
      tenant_nombre: updated.tenant?.nombre,
      total_ganancias,
      total_pendiente
    };

    const redis = await ensureRedisConnection();
    await Promise.all([
      redis.del(HOTEL_LIST_CACHE_KEY),
      redis.setEx(
        `${HOTEL_CACHE_PREFIX}${id}`,
        HOTEL_CACHE_TTL_SECONDS,
        JSON.stringify(hotelResponse)
      ),
    ]);

    res.json(hotelResponse);
  } catch (err) {
    console.error("Error al actualizar hotel:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/hoteles/:id - Eliminar un hotel
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const hotel = await Hotel.findByPk(id);

    if (!hotel) {
      return res.status(404).json({ error: "Hotel no encontrado" });
    }

    const tenant_id = hotel.tenant_id;

    // Eliminar hotel (cascade eliminará habitaciones, reservas, etc.)
    await hotel.destroy();

    // Eliminar tenant asociado
    await Tenant.destroy({
      where: { tenant_id }
    });

    const redis = await ensureRedisConnection();
    await Promise.all([
      redis.del(HOTEL_LIST_CACHE_KEY),
      redis.del(`${HOTEL_CACHE_PREFIX}${id}`),
    ]);

    res.status(204).send();
  } catch (err) {
    console.error("Error al eliminar hotel:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
