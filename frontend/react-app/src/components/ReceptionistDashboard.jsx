// frontend/components/ReceptionistDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import PagosManager from "./PagosManager";
import DashboardLayout from "./DashboardLayout";
import { useTheme } from "../contexts/ThemeContext";
import "./DashboardContent.css";

export default function ReceptionistDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("habitaciones");
  const [habitaciones, setHabitaciones] = useState([]);
  const [msg, setMsg] = useState("");
  const [newRoom, setNewRoom] = useState({ numero: "", tipo: "simple", precio_noche: "", estado: "disponible" });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reservas, setReservas] = useState([]);
  const [reservasLoading, setReservasLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const { isDarkMode } = useTheme();

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }),
    []
  );

  const habitacionContext = useMemo(() => ({
    tenantId: user?.tenant_id,
    usuarioId: user?.usuario_id,
    hotelId: user?.hotel_id,
    sucursalId: user?.sucursal_id,
  }), [user]);

  const formatMoney = (value) => currencyFormatter.format(value || 0);
  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };
  const formatNights = (reserva) => {
    if (!reserva?.fecha_inicio || !reserva?.fecha_fin) return "—";
    const inicio = new Date(reserva.fecha_inicio);
    const fin = new Date(reserva.fecha_fin);
    const diff = Math.max(1, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)));
    return `${diff} ${diff === 1 ? "noche" : "noches"}`;
  };

  // 🔹 Ya no necesitamos un hotelId fijo; el backend nos devolverá las habitaciones del hotel del usuario
  const loadHabitaciones = useCallback(async () => {
    if (!habitacionContext.tenantId || !habitacionContext.usuarioId || !habitacionContext.hotelId) {
      setHabitaciones([]);
      setMsg("El usuario no tiene hotel asignado");
      return;
    }

    if (!habitacionContext.sucursalId) {
      setHabitaciones([]);
      setMsg("El usuario no tiene una sucursal asignada");
      return;
    }

    try {
      setLoading(true);
      setMsg("");
      const h = await api.getHabitacionesDelUsuario(habitacionContext);

      if (Array.isArray(h)) {
        setHabitaciones(h);
      } else if (h?.data && Array.isArray(h.data)) {
        setHabitaciones(h.data);
      } else {
        setHabitaciones([]);
      }
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [habitacionContext]);

  const loadReservas = useCallback(async () => {
    if (!habitacionContext.hotelId || !habitacionContext.tenantId || !habitacionContext.usuarioId) {
      setReservas([]);
      setMsg("El usuario no tiene hotel asignado");
      return;
    }

    if (!habitacionContext.sucursalId) {
      setReservas([]);
      setMsg("El usuario no tiene una sucursal asignada");
      return;
    }

    try {
      setReservasLoading(true);
      setMsg("");
      const data = await api.getReservas({
        hotelId: habitacionContext.hotelId,
        tenantId: habitacionContext.tenantId,
        usuarioId: habitacionContext.usuarioId,
        sucursalId: habitacionContext.sucursalId,
      });
      setReservas(Array.isArray(data) ? data : []);
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    } finally {
      setReservasLoading(false);
    }
  }, [habitacionContext]);

  useEffect(() => {
    loadHabitaciones();
    loadReservas();
  }, [loadHabitaciones, loadReservas]);

  const updateEstado = async (habit, newEstado) => {
    try {
      if (!habitacionContext.sucursalId) {
        setMsg("El usuario no tiene una sucursal asignada");
        return;
      }

      const updated = await api.updateHabitacion(habit.habitacion_id, {
        ...habitacionContext,
        estado: newEstado,
      });
      setHabitaciones(prev =>
        prev.map(x => x.habitacion_id === updated.habitacion_id ? updated : x)
      );
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg("Creando habitación...");
    try {
      if (!habitacionContext.sucursalId) {
        setMsg("El usuario no tiene una sucursal asignada");
        return;
      }

      await api.createHabitacion({
        ...habitacionContext,
        numero: newRoom.numero,
        tipo: newRoom.tipo,
        precio_noche: newRoom.precio_noche,
        estado: newRoom.estado,
      });
      setNewRoom({ numero: "", tipo: "simple", precio_noche: "", estado: "disponible" });
      await loadHabitaciones();
      setMsg("Habitación creada ✅");
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  const startEdit = (habit) => {
    setEditing({
      habitacion_id: habit.habitacion_id,
      numero: habit.numero,
      tipo: habit.tipo,
      precio_noche: habit.precio_noche,
      estado: habit.estado,
    });
  };

  const handleEditChange = (field, value) => {
    setEditing((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setMsg("Actualizando habitación...");
    try {
      if (!habitacionContext.sucursalId) {
        setMsg("El usuario no tiene una sucursal asignada");
        return;
      }

      const updated = await api.updateHabitacion(editing.habitacion_id, {
        ...habitacionContext,
        numero: editing.numero,
        tipo: editing.tipo,
        precio_noche: editing.precio_noche,
        estado: editing.estado,
      });
      setHabitaciones(prev => prev.map(h => h.habitacion_id === updated.habitacion_id ? updated : h));
      setEditing(null);
      setMsg("Habitación actualizada ✅");
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  const handleDelete = async (habitacion) => {
    if (!window.confirm("¿Eliminar habitación?")) return;
    setMsg("Eliminando habitación...");
    try {
      if (!habitacionContext.sucursalId) {
        setMsg("El usuario no tiene una sucursal asignada");
        return;
      }

      await api.deleteHabitacion(habitacion.habitacion_id, {
        ...habitacionContext,
      });
      setHabitaciones(prev => prev.filter(h => h.habitacion_id !== habitacion.habitacion_id));
      if (editing?.habitacion_id === habitacion.habitacion_id) {
        setEditing(null);
      }
      setMsg("Habitación eliminada ✅");
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  const confirmReserva = async (reserva) => {
    if (!window.confirm("¿Confirmar el pago de esta reserva?")) return;
    try {
      setConfirmingId(reserva.reserva_id);
      setMsg("Confirmando reserva...");
      const updated = await api.updateReserva(reserva.reserva_id, {
        estado: "confirmada",
        estado_pago: "pagado",
      });
      setReservas(prev => prev.map(r => (r.reserva_id === updated.reserva_id ? updated : r)));
      setMsg("Reserva confirmada ✅");
      await loadReservas();
      await loadHabitaciones();
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    } finally {
      setConfirmingId(null);
    }
  };

  const reservasOrdenadas = useMemo(
    () => [...reservas].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [reservas]
  );

  const pendientes = reservasOrdenadas.filter(r => r.estado === "pendiente");
  const otrasReservas = reservasOrdenadas.filter(r => r.estado !== "pendiente");

  const menuItems = [
    {
      id: 'habitaciones',
      label: 'Habitaciones',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"/><path d="M9 3v18M3 9h18M3 15h6M15 9h6" stroke-width="2"/></svg>'
    },
    {
      id: 'reservas',
      label: 'Reservas',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/></svg>'
    },
    {
      id: 'pagos',
      label: 'Pagos',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke-width="2"/><line x1="1" y1="10" x2="23" y2="10" stroke-width="2"/></svg>'
    }
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
        {activeTab === "pagos" && <PagosManager user={user} />}
      
        {activeTab === "habitaciones" && (
          <div>
            {msg && <div className="alert alert-success mb-3">{msg}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: editing ? '1fr 1fr' : '1fr 2fr', gap: '24px', alignItems: 'start' }}>
              {/* Formulario Nueva Habitación */}
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <h3 className="dashboard-card-title">Nueva Habitación</h3>
                </div>
                <form onSubmit={handleCreate}>
                  <div className="mb-3">
                    <label className="form-label">Número</label>
                    <input
                      className="form-control"
                      value={newRoom.numero}
                      onChange={(e) => setNewRoom({ ...newRoom, numero: e.target.value })}
                      required
                      min="1"
                      type="number"
                      placeholder="Ej: 101"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={newRoom.tipo}
                      onChange={(e) => setNewRoom({ ...newRoom, tipo: e.target.value })}
                      required
                    >
                      <option value="simple">Simple</option>
                      <option value="doble">Doble</option>
                      <option value="suite">Suite</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Precio por noche</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={newRoom.precio_noche}
                      onChange={(e) => setNewRoom({ ...newRoom, precio_noche: e.target.value })}
                      required
                      placeholder="Ej: 50000"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Estado</label>
                    <select
                      className="form-select"
                      value={newRoom.estado}
                      onChange={(e) => setNewRoom({ ...newRoom, estado: e.target.value })}
                    >
                      <option value="disponible">Disponible</option>
                      <option value="ocupada">Ocupada</option>
                      <option value="limpieza">Limpieza</option>
                    </select>
                  </div>
                  <button className="btn-primary-custom w-100" type="submit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                      <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Crear Habitación
                  </button>
                </form>
              </div>

              {/* Lista de Habitaciones */}
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <div>
                    <h3 className="dashboard-card-title">Habitaciones Registradas</h3>
                    <p className="dashboard-card-subtitle">Gestiona las habitaciones de tu sucursal</p>
                  </div>
                  <button className="btn-primary-custom" type="button" onClick={loadHabitaciones} disabled={loading}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                      <path d="M1 4v6h6M23 20v-6h-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {loading ? "Actualizando..." : "Actualizar"}
                  </button>
                </div>

                {habitaciones.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
                        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
                        <path d="M9 3v18M3 9h18M3 15h6M15 9h6" strokeWidth="2"/>
                      </svg>
                    </div>
                    <p className="empty-state-text">No hay habitaciones registradas</p>
                  </div>
                ) : (
                  <div className="items-list">
                    {habitaciones.map(h => (
                      <div key={h.habitacion_id} className="item-card">
                        <div className="item-header">
                          <div className="item-info">
                            <div className="item-title">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20" style={{ marginRight: '8px' }}>
                                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
                                <path d="M9 3v18M3 9h18M3 15h6M15 9h6" strokeWidth="2"/>
                              </svg>
                              Habitación {h.numero}
                            </div>
                            <div className="item-subtitle">
                              Tipo: <strong>{h.tipo}</strong> • {formatMoney(h.precio_noche)}/noche
                            </div>
                          </div>
                          <div className="item-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span
                              className={`status-badge ${
                                h.estado === "disponible" ? "status-success"
                                : h.estado === "ocupada" ? "status-danger"
                                : h.estado === "limpieza" ? "status-warning"
                                : "status-secondary"
                              }`}
                            >
                              {h.estado}
                            </span>
                            <select
                              className="form-select form-select-sm"
                              style={{ width: "auto", minWidth: "130px" }}
                              value={h.estado}
                              onChange={(e) => updateEstado(h, e.target.value)}
                            >
                              <option value="disponible">Disponible</option>
                              <option value="ocupada">Ocupada</option>
                              <option value="limpieza">Limpieza</option>
                            </select>
                            <button className="btn-secondary-custom btn-icon" onClick={() => startEdit(h)} title="Editar">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            <button className="btn-danger-custom btn-icon" onClick={() => handleDelete(h)} title="Eliminar">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                <polyline points="3 6 5 6 21 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {editing && (
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <h3 className="dashboard-card-title">Editar Habitación #{editing.numero}</h3>
                </div>
                <form onSubmit={handleEditSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Número</label>
                    <input
                      className="form-control"
                      type="number"
                      min="1"
                      value={editing.numero}
                      onChange={(e) => handleEditChange("numero", e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={editing.tipo}
                      onChange={(e) => handleEditChange("tipo", e.target.value)}
                      required
                    >
                      <option value="simple">Simple</option>
                      <option value="doble">Doble</option>
                      <option value="suite">Suite</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Precio/noche</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={editing.precio_noche}
                      onChange={(e) => handleEditChange("precio_noche", e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Estado</label>
                    <select
                      className="form-select"
                      value={editing.estado}
                      onChange={(e) => handleEditChange("estado", e.target.value)}
                    >
                      <option value="disponible">Disponible</option>
                      <option value="ocupada">Ocupada</option>
                      <option value="limpieza">Limpieza</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn-secondary-custom" style={{ flex: 1 }} onClick={() => setEditing(null)}>
                      Cancelar
                    </button>
                    <button className="btn-primary-custom" style={{ flex: 1 }} type="submit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                        <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === "reservas" && (
          <div>
            {msg && <div className="alert alert-success mb-3">{msg}</div>}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <h3 className="dashboard-card-title">Reservas Recientes</h3>
                  <p className="dashboard-card-subtitle">Gestiona y confirma las reservas de los huéspedes</p>
                </div>
                <button
                  className="btn-primary-custom"
                  type="button"
                  onClick={loadReservas}
                  disabled={reservasLoading}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                    <path d="M1 4v6h6M23 20v-6h-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {reservasLoading ? "Actualizando..." : "Actualizar"}
                </button>
              </div>

            {reservasLoading && (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            )}

            {!reservasLoading && reservasOrdenadas.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
                    <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                  </svg>
                </div>
                <p className="empty-state-text">Aún no hay reservas registradas</p>
              </div>
            )}            {!reservasLoading && reservasOrdenadas.length > 0 && (
              <div className="items-list">
                {reservasOrdenadas.map((r) => {
                  const esPendiente = r.estado === "pendiente";
                  return (
                    <div key={r.reserva_id} className="item-card">
                      <div className="item-header">
                        <div className="item-info">
                          <div className="item-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20" style={{ marginRight: '8px' }}>
                              <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/>
                              <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                              <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                              <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                            </svg>
                            {r.hotel_nombre || user?.hotel_nombre || "Hotel sin nombre"}
                          </div>
                          <div className="item-subtitle">
                            <strong>Habitación {r.habitacion_numero}</strong> • {formatDate(r.fecha_inicio)} → {formatDate(r.fecha_fin)}
                          </div>
                          <div className="mt-2" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`status-badge ${
                              r.pago_estado === "pagado" ? "status-success" :
                              r.pago_estado === "pendiente" ? "status-warning" :
                              "status-secondary"
                            }`}>
                              {r.pago_metodo || "sin método"} • {r.pago_estado || "sin estado"}
                            </span>
                            <span className={`status-badge ${
                              r.estado === "confirmada" ? "status-success" :
                              r.estado === "pendiente" ? "status-warning" :
                              r.estado === "cancelada" ? "status-danger" :
                              "status-secondary"
                            }`}>
                              Reserva: {r.estado || "sin estado"}
                            </span>
                          </div>
                          <button
                            className="btn-secondary-custom btn-sm mt-2"
                            onClick={() => setSelectedReserva(r)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                              <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Ver Detalles
                          </button>
                        </div>
                        <div className="item-actions" style={{ textAlign: 'right' }}>
                          <div className="fw-bold fs-4 mb-3" style={{ color: '#2563eb' }}>{formatMoney(r.total)}</div>
                          {esPendiente ? (
                            <button
                              className="btn-primary-custom"
                              onClick={() => confirmReserva(r)}
                              disabled={confirmingId === r.reserva_id}
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              {confirmingId === r.reserva_id ? (
                                <>
                                  <span className="spinner-border spinner-border-sm"></span>
                                  Confirmando...
                                </>
                              ) : (
                                <>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                    <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Marcar como Pagada
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="status-badge status-success" style={{ fontSize: '14px', padding: '8px 16px' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" style={{ marginRight: '6px' }}>
                                <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Confirmada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        )}

        {selectedReserva && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content" style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
              color: isDarkMode ? '#e2e8f0' : '#212529'
            }}>
              <div className="modal-header border-0 pb-0" style={{
                borderBottom: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`
              }}>
                <h5 className="modal-title fw-bold" style={{ color: isDarkMode ? '#f1f5f9' : '#212529' }}>
                  <i className="bi bi-info-circle me-2"></i>
                  Detalle de reserva
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setSelectedReserva(null)}
                  style={{
                    filter: isDarkMode ? 'invert(1)' : 'none'
                  }}
                ></button>
              </div>
              <div className="modal-body" style={{
                backgroundColor: isDarkMode ? '#1e293b' : '#ffffff'
              }}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="detail-item">
                      <label className="detail-label">Hotel</label>
                      <div className="detail-value">{selectedReserva.hotel_nombre || user?.hotel_nombre || "—"}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="detail-item">
                      <label className="detail-label">Habitación</label>
                      <div className="detail-value">#{selectedReserva.habitacion_numero}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="detail-item">
                      <label className="detail-label">Huésped</label>
                      <div className="detail-value">{selectedReserva.huesped_nombre || "Sin nombre registrado"}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="detail-item">
                      <label className="detail-label">Email huésped</label>
                      <div className="detail-value">{selectedReserva.huesped_email || "—"}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="detail-item">
                      <label className="detail-label">Fecha de ingreso</label>
                      <div className="detail-value">{formatDate(selectedReserva.fecha_inicio)}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="detail-item">
                      <label className="detail-label">Fecha de salida</label>
                      <div className="detail-value">{formatDate(selectedReserva.fecha_fin)}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="detail-item">
                      <label className="detail-label">Duración de estadía</label>
                      <div className="detail-value">{formatNights(selectedReserva)}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="detail-item">
                      <label className="detail-label">Total</label>
                      <div className="detail-value fw-bold text-success">{formatMoney(selectedReserva.total)}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="detail-item">
                      <label className="detail-label">Método de pago</label>
                      <div className="detail-value text-capitalize">{selectedReserva.pago_metodo || "—"}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="detail-item">
                      <label className="detail-label">Estado de pago</label>
                      <div className="detail-value">
                        <span className={`status-badge ${
                          selectedReserva.pago_estado === "pagado" ? "status-success" :
                          selectedReserva.pago_estado === "pendiente" ? "status-warning" :
                          "status-secondary"
                        }`}>
                          {selectedReserva.pago_estado || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="detail-item">
                      <label className="detail-label">Estado de la reserva</label>
                      <div className="detail-value">
                        <span className={`status-badge ${
                          selectedReserva.estado === "confirmada" ? "status-success" :
                          selectedReserva.estado === "pendiente" ? "status-warning" :
                          selectedReserva.estado === "cancelada" ? "status-danger" :
                          "status-secondary"
                        }`}>
                          {selectedReserva.estado}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div 
                className="modal-footer border-0"
                style={{
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8f9fa',
                  borderTop: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`
                }}
              >
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedReserva(null)}
                  style={{
                    backgroundColor: isDarkMode ? '#475569' : '#6c757d',
                    borderColor: isDarkMode ? '#475569' : '#6c757d',
                    color: '#ffffff'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
    </DashboardLayout>
  );
}
