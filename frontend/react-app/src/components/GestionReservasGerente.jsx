import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const METODOS = [
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
];

export default function GestionReservasGerente({ user }) {
  const [habitaciones, setHabitaciones] = useState([]);
  const [huespedes, setHuespedes] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    habitacionId: "",
    huespedId: "",
    fechaInicio: "",
    fechaFin: "",
    metodoPago: "tarjeta",
    detalles: "",
  });
  const [creating, setCreating] = useState(false);
  const [resLoading, setResLoading] = useState(false);

  const hotelId = user?.hotel_id || null;
  const tenantId = user?.tenant_id || null;
  const usuarioId = user?.usuario_id || null;

  const loadHabitaciones = async () => {
    if (!hotelId) return;
    try {
      const data = await api.getHabitacionesDelUsuario({
        tenantId,
        usuarioId,
        hotelId,
      });
      setHabitaciones(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error("Error al cargar habitaciones:", err);
    }
  };

  const loadHuespedes = async () => {
    try {
      const data = await api.getHuespedes({ tenant_id: tenantId });
      setHuespedes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar huéspedes:", err);
    }
  };

  const loadReservas = async () => {
    if (!hotelId) return;
    try {
      setResLoading(true);
      const data = await api.getReservas({ hotelId });
      setReservas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar reservas:", err);
      setMsg(err.error || "Error al cargar reservas");
    } finally {
      setResLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        await Promise.all([loadHabitaciones(), loadHuespedes(), loadReservas()]);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!form.habitacionId && habitaciones.length > 0) {
      setForm(prev => ({ ...prev, habitacionId: habitaciones[0].habitacion_id }));
    }
  }, [habitaciones, form.habitacionId]);

  const reservasOrdenadas = useMemo(
    () => [...reservas].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [reservas]
  );

  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = reservasOrdenadas.length;
    const confirmadas = reservasOrdenadas.filter(r => r.estado === "confirmada").length;
    const pendientes = reservasOrdenadas.filter(r => r.estado === "pendiente").length;
    const canceladas = reservasOrdenadas.filter(r => r.estado === "cancelada").length;
    return { total, confirmadas, pendientes, canceladas };
  }, [reservasOrdenadas]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.habitacionId || !form.huespedId || !form.fechaInicio || !form.fechaFin) {
      setMsg("Completa todos los campos obligatorios");
      return;
    }

    setCreating(true);
    setMsg("Creando reserva...");
    try {
      const payload = {
        habitacion_id: form.habitacionId,
        huesped_id: form.huespedId,
        fecha_inicio: form.fechaInicio,
        fecha_fin: form.fechaFin,
        metodo_pago: form.metodoPago,
        detalles_pago: form.detalles ? { referencia: form.detalles } : undefined,
        tenant_id: tenantId,
      };

      await api.createReserva(payload);
      setMsg("Reserva creada ✅");
      setForm({
        habitacionId: form.habitacionId,
        huespedId: "",
        fechaInicio: "",
        fechaFin: "",
        metodoPago: form.metodoPago,
        detalles: "",
      });
      await loadReservas();
    } catch (err) {
      console.error("Error al crear reserva:", err);
      setMsg(err.error || "No se pudo crear la reserva");
    } finally {
      setCreating(false);
    }
  };

  const updateEstado = async (reservaId, changes) => {
    try {
      await api.updateReserva(reservaId, changes);
      await loadReservas();
      setMsg("Reserva actualizada ✅");
    } catch (err) {
      console.error("Error al actualizar reserva:", err);
      setMsg(err.error || "No se pudo actualizar");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visualmente-hidden">Cargando...</span>
        </div>
        <p className="mt-2">Preparando datos...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      {msg && (
        <div className="alert alert-info" style={{ marginBottom: "20px" }}>
          {msg}
        </div>
      )}

      {/* Grid de estadísticas */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="dashboard-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <svg width="40" height="40" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>Total Reservas</div>
              <div style={{ fontSize: "24px", fontWeight: "600", color: "#1e293b" }}>{stats.total}</div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <svg width="40" height="40" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>Confirmadas</div>
              <div style={{ fontSize: "24px", fontWeight: "600", color: "#10b981" }}>{stats.confirmadas}</div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <svg width="40" height="40" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>Pendientes</div>
              <div style={{ fontSize: "24px", fontWeight: "600", color: "#f59e0b" }}>{stats.pendientes}</div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <svg width="40" height="40" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>Canceladas</div>
              <div style={{ fontSize: "24px", fontWeight: "600", color: "#ef4444" }}>{stats.canceladas}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de creación */}
      <div className="dashboard-card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: 0 }}>
            Crear Reserva Manual
          </h3>
        </div>

        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                Habitación
              </label>
              <select
                className="form-control"
                value={form.habitacionId}
                onChange={e => setForm(prev => ({ ...prev, habitacionId: e.target.value }))}
                required
              >
                {habitaciones.length === 0 && <option value="">Sin habitaciones</option>}
                {habitaciones.map(h => (
                  <option key={h.habitacion_id} value={h.habitacion_id}>
                    Nº {h.numero} • {h.tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                Huésped
              </label>
              <select
                className="form-control"
                value={form.huespedId}
                onChange={e => setForm(prev => ({ ...prev, huespedId: e.target.value }))}
                required
              >
                <option value="">Selecciona huésped</option>
                {huespedes
                  .filter(h => h.tenant_id === tenantId)
                  .map(h => (
                    <option key={h.id} value={h.id}>
                      {h.nombre_completo || h.email || h.id}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                Fecha Ingreso
              </label>
              <input
                type="date"
                className="form-control"
                value={form.fechaInicio}
                onChange={e => setForm(prev => ({ ...prev, fechaInicio: e.target.value }))}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                Fecha Salida
              </label>
              <input
                type="date"
                className="form-control"
                value={form.fechaFin}
                onChange={e => setForm(prev => ({ ...prev, fechaFin: e.target.value }))}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                Método de Pago
              </label>
              <select
                className="form-control"
                value={form.metodoPago}
                onChange={e => setForm(prev => ({ ...prev, metodoPago: e.target.value }))}
              >
                {METODOS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
              Detalles (opcional)
            </label>
            <input
              className="form-control w-100"
              placeholder="Referencia, notas, etc."
              value={form.detalles}
              onChange={e => setForm(prev => ({ ...prev, detalles: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn-primary-custom" type="submit" disabled={creating}>
              {creating ? (
                <>
                  <span className="spinner-border spinner-border-sm" style={{ marginRight: "8px" }}></span>
                  Creando...
                </>
              ) : (
                <>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: "8px" }}>
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Reserva
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-secondary-custom"
              onClick={loadReservas}
              disabled={resLoading}
            >
              {resLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" style={{ marginRight: "8px" }}></span>
                  Actualizando...
                </>
              ) : (
                <>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: "8px" }}>
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refrescar
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de reservas */}
      <div className="dashboard-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: 0 }}>
            Reservas Recientes
          </h3>
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            {reservasOrdenadas.length} total
          </span>
        </div>

        {reservasOrdenadas.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" fill="none" stroke="#cbd5e1" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No hay reservas registradas</p>
          </div>
        ) : (
          <div className="items-list">
            {reservasOrdenadas.slice(0, 20).map(reserva => {
              const getEstadoBadge = (estado) => {
                switch(estado) {
                  case "confirmada": return "status-badge-success";
                  case "pendiente": return "status-badge-warning";
                  case "cancelada": return "status-badge-danger";
                  default: return "status-badge-secondary";
                }
              };

              const getPagoBadge = (pago) => {
                switch(pago) {
                  case "pagado": return "status-badge-success";
                  case "pendiente": return "status-badge-warning";
                  default: return "status-badge-secondary";
                }
              };

              return (
                <div key={reserva.reserva_id} className="item-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <svg width="20" height="20" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <strong style={{ fontSize: "15px", color: "#1e293b" }}>
                          Habitación {reserva.habitacion_numero}
                        </strong>
                      </div>

                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>
                        <strong>Huésped:</strong> {reserva.huesped_nombre || reserva.huesped_email || reserva.huesped_id}
                      </div>

                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>
                        <strong>Fechas:</strong> {reserva.fecha_inicio} → {reserva.fecha_fin}
                      </div>

                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <span className={getEstadoBadge(reserva.estado)}>
                          {reserva.estado || "sin estado"}
                        </span>
                        <span className={getPagoBadge(reserva.pago_estado)}>
                          Pago: {reserva.pago_estado || "sin pago"}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b" }}>
                        {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(reserva.total || 0)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      className="btn-sm btn-primary-custom"
                      disabled={reserva.estado === "confirmada" && reserva.pago_estado === "pagado"}
                      onClick={() => updateEstado(reserva.reserva_id, { estado: "confirmada", estado_pago: "pagado" })}
                      style={{ opacity: reserva.estado === "confirmada" && reserva.pago_estado === "pagado" ? 0.5 : 1 }}
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: "6px" }}>
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Confirmar y Pagar
                    </button>
                    <button
                      className="btn-sm btn-secondary-custom"
                      onClick={() => updateEstado(reserva.reserva_id, { estado: "pendiente", estado_pago: "pendiente" })}
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: "6px" }}>
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Marcar Pendiente
                    </button>
                    <button
                      className="btn-sm"
                      onClick={() => updateEstado(reserva.reserva_id, { estado: "cancelada" })}
                      style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: "500",
                        border: "1px solid #ef4444",
                        borderRadius: "8px",
                        backgroundColor: "white",
                        color: "#ef4444",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "inline-flex",
                        alignItems: "center"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#fef2f2";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "white";
                      }}
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: "6px" }}>
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

