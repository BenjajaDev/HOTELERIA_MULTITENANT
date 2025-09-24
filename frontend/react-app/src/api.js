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
  createHotel: (body) => request("/api/hoteles", { method: "POST", body: JSON.stringify(body) }),
  deleteHotel: (id) => request(`/api/hoteles/${id}`, { method: "DELETE" }),
  updateHotel: (id, body) => request(`/api/hoteles/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  getReservas: () => request("/api/reservas", { method: "GET" }),
  createReserva: (body) => request("/api/reservas", { method: "POST", body: JSON.stringify(body) }),

  // 🔹 Habitaciones por hotelId
  getHabitaciones: async (hotelId) => {
    const res = await fetch(`${BASE}/api/habitaciones/${hotelId}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // 🔹 Obtener habitaciones del hotel del usuario logueado
  getHabitacionesDelUsuario: async () => {
    const res = await fetch(`${BASE}/api/habitaciones/del-usuario`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  updateHabitacion: async (habitacionId, data) => {
    const res = await fetch(`${BASE}/api/habitaciones/${habitacionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
};