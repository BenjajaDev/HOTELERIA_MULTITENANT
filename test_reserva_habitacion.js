// Script de prueba para verificar la funcionalidad de reservas y habitaciones
const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// IDs de ejemplo del sistema
const TENANT_ID = "8e49098e-da6d-4a18-becf-fd0f75671be4";
const USUARIO_ID = "3f80a3a7-963e-4fd2-bb1a-b9648e2ba531";
const HABITACION_ID = "3d792e5a-5fc0-4ab8-be51-5893f1789f3a";

async function testReservaFlow() {
  console.log('🧪 Iniciando pruebas de flujo de reservas y habitaciones...\n');

  try {
    // 1. Verificar estado inicial de la habitación
    console.log('1️⃣ Verificando estado inicial de la habitación...');
    const habitacionResponse = await axios.get(`${BASE_URL}/habitaciones`, {
      params: {
        tenantId: TENANT_ID,
        usuarioId: USUARIO_ID
      }
    });
    
    const habitacion = habitacionResponse.data.find(h => h.habitacion_id === HABITACION_ID);
    console.log(`   Estado inicial de habitación ${habitacion?.numero}: ${habitacion?.estado}\n`);

    // 2. Crear reserva con pago de tarjeta (debe marcar habitación como ocupada automáticamente)
    console.log('2️⃣ Creando reserva con pago de tarjeta...');
    const reservaData = {
      tenant_id: TENANT_ID,
      habitacion_id: HABITACION_ID,
      huesped_id: USUARIO_ID,
      fecha_inicio: "2025-10-25",
      fecha_fin: "2025-10-26",
      metodo_pago: "tarjeta",
      detalles_pago: {
        numero: "4532123456789012",
        cvv: "123",
        expiry: "12/25"
      }
    };

    const reservaResponse = await axios.post(`${BASE_URL}/reservas`, reservaData);
    const reserva = reservaResponse.data;
    console.log(`   Reserva creada: ${reserva.reserva_id}`);
    console.log(`   Estado de reserva: ${reserva.estado}`);
    console.log(`   Estado de pago: ${reserva.pago_estado}\n`);

    // 3. Verificar que la habitación ahora esté ocupada
    console.log('3️⃣ Verificando que la habitación esté marcada como ocupada...');
    const habitacionResponse2 = await axios.get(`${BASE_URL}/habitaciones`, {
      params: {
        tenantId: TENANT_ID,
        usuarioId: USUARIO_ID
      }
    });
    
    const habitacionOcupada = habitacionResponse2.data.find(h => h.habitacion_id === HABITACION_ID);
    console.log(`   Estado de habitación ${habitacionOcupada?.numero}: ${habitacionOcupada?.estado}\n`);

    // 4. Cancelar la reserva (debe liberar la habitación)
    console.log('4️⃣ Cancelando la reserva...');
    const cancelacionData = {
      tenant_id: TENANT_ID,
      usuario_id: USUARIO_ID,
      motivo: "Prueba de cancelación"
    };

    const cancelacionResponse = await axios.post(`${BASE_URL}/reservas/${reserva.reserva_id}/cancelar`, cancelacionData);
    console.log(`   Reserva cancelada exitosamente`);
    console.log(`   Estado de reserva: ${cancelacionResponse.data.reserva.estado}\n`);

    // 5. Verificar que la habitación vuelva a estar disponible
    console.log('5️⃣ Verificando que la habitación esté disponible nuevamente...');
    const habitacionResponse3 = await axios.get(`${BASE_URL}/habitaciones`, {
      params: {
        tenantId: TENANT_ID,
        usuarioId: USUARIO_ID
      }
    });
    
    const habitacionDisponible = habitacionResponse3.data.find(h => h.habitacion_id === HABITACION_ID);
    console.log(`   Estado final de habitación ${habitacionDisponible?.numero}: ${habitacionDisponible?.estado}\n`);

    // 6. Probar con reserva en efectivo (no debe ocupar la habitación inicialmente)
    console.log('6️⃣ Probando reserva con pago en efectivo...');
    const reservaEfectivoData = {
      tenant_id: TENANT_ID,
      habitacion_id: HABITACION_ID,
      huesped_id: USUARIO_ID,
      fecha_inicio: "2025-10-27",
      fecha_fin: "2025-10-28",
      metodo_pago: "efectivo"
    };

    const reservaEfectivoResponse = await axios.post(`${BASE_URL}/reservas`, reservaEfectivoData);
    const reservaEfectivo = reservaEfectivoResponse.data;
    console.log(`   Reserva en efectivo creada: ${reservaEfectivo.reserva_id}`);
    console.log(`   Estado de reserva: ${reservaEfectivo.estado}`);
    console.log(`   Estado de pago: ${reservaEfectivo.pago_estado}\n`);

    // 7. Verificar que la habitación siga disponible con pago pendiente
    console.log('7️⃣ Verificando que la habitación siga disponible con pago pendiente...');
    const habitacionResponse4 = await axios.get(`${BASE_URL}/habitaciones`, {
      params: {
        tenantId: TENANT_ID,
        usuarioId: USUARIO_ID
      }
    });
    
    const habitacionPendiente = habitacionResponse4.data.find(h => h.habitacion_id === HABITACION_ID);
    console.log(`   Estado de habitación ${habitacionPendiente?.numero}: ${habitacionPendiente?.estado}\n`);

    console.log('✅ Todas las pruebas completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.response?.data || error.message);
  }
}

// Ejecutar las pruebas
testReservaFlow();