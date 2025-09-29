const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    try { 
      return Promise.reject(JSON.parse(text)); 
    } catch { 
      return Promise.reject({ error: text || res.statusText }); 
    }
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  login: (body) => request("/api/usuarios/login", { method: "POST", body: JSON.stringify(body) }),
  registerHuesped: (body) => request("/api/usuarios/register-huesped", { method: "POST", body: JSON.stringify(body) }),
  getCurrentUser: () => request("/api/usuarios/me", { method: "GET" }),
  getHoteles: () => request("/api/hoteles", { method: "GET" }),
  getHotel: (id) => request(`/api/hoteles/${id}`, { method: "GET" }),
  createHotel: (body) => request("/api/hoteles", { method: "POST", body: JSON.stringify(body) }),
  deleteHotel: (id) => request(`/api/hoteles/${id}`, { method: "DELETE" }),
  updateHotel: (id, body) => request(`/api/hoteles/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  getReservas: (params = {}) => {
    const search = new URLSearchParams();
    if (params.hotelId) search.set("hotelId", params.hotelId);
    if (params.tenantId) search.set("tenantId", params.tenantId);
    if (params.estado) search.set("estado", params.estado);
    if (params.metodoPago) search.set("metodo_pago", params.metodoPago);
    if (params.estadoPago) search.set("estado_pago", params.estadoPago);
    const suffix = search.toString();
    return request(`/api/reservas${suffix ? `?${suffix}` : ""}`, { method: "GET" });
  },
  createReserva: (body) => request("/api/reservas", { method: "POST", body: JSON.stringify(body) }),
  updateReserva: (id, body) => request(`/api/reservas/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  // 🔹 Habitaciones por hotelId
  getHabitaciones: async (hotelId, params = {}) => {
    if (!hotelId) throw new Error("hotelId requerido");
    const search = new URLSearchParams();
    if (params.fechaInicio) search.set("fecha_inicio", params.fechaInicio);
    if (params.fechaFin) search.set("fecha_fin", params.fechaFin);
    const qs = search.toString();
    const res = await fetch(`${BASE}/api/habitaciones/${hotelId}${qs ? `?${qs}` : ""}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // 🔹 Obtener habitaciones del hotel del usuario logueado
  getHabitacionesDelUsuario: async ({ tenantId, usuarioId, hotelId }) => {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (usuarioId) params.set("usuarioId", usuarioId);
    if (hotelId) params.set("hotelId", hotelId);
    const res = await fetch(`${BASE}/api/habitaciones/del-usuario?${params.toString()}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  createHabitacion: async (payload) => {
    const res = await fetch(`${BASE}/api/habitaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  updateHabitacion: async (habitacionId, payload) => {
    const res = await fetch(`${BASE}/api/habitaciones/${habitacionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  deleteHabitacion: async (habitacionId, payload) => {
    const res = await fetch(`${BASE}/api/habitaciones/${habitacionId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // 🔹 API de Pagos
  getPagos: (params = {}) => {
    const search = new URLSearchParams();
    if (params.hotelId) search.set("hotelId", params.hotelId);
    if (params.estado_pago) search.set("estado_pago", params.estado_pago);
    if (params.metodo) search.set("metodo", params.metodo);
    const suffix = search.toString();
    return request(`/api/pagos${suffix ? `?${suffix}` : ""}`, { method: "GET" });
  },

  getDetallePago: (pagoId) => request(`/api/pagos/${pagoId}/detalle`, { method: "GET" }),

  createDetallePago: (pagoId, body) => request(`/api/pagos/${pagoId}/detalle`, { 
    method: "POST", 
    body: JSON.stringify(body) 
  }),

  getBoleta: (pagoId) => request(`/api/pagos/${pagoId}/boleta`, { method: "GET" }),
};
