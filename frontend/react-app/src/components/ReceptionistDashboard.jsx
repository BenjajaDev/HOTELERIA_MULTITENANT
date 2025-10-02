// frontend/components/ReceptionistDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import PagosManager from "./PagosManager";

export default function ReceptionistDashboard({ user }) {
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
    if (!user?.hotel_id) return;
    try {
      setReservasLoading(true);
      const data = await api.getReservas({ hotelId: user.hotel_id });
      setReservas(Array.isArray(data) ? data : []);
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    } finally {
      setReservasLoading(false);
    }
  }, [user]);

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

  return (
    <div>
      <h3>Panel de Recepcionista</h3>
      
      {/* Navegación por pestañas */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === "habitaciones" ? "active" : ""}`}
            onClick={() => setActiveTab("habitaciones")}
          >
            <i className="bi bi-door-open"></i> Habitaciones
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === "reservas" ? "active" : ""}`}
            onClick={() => setActiveTab("reservas")}
          >
            <i className="bi bi-calendar-check"></i> Reservas
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === "pagos" ? "active" : ""}`}
            onClick={() => setActiveTab("pagos")}
          >
            <i className="bi bi-credit-card"></i> Pagos
          </button>
        </li>
      </ul>

      {/* Contenido de las pestañas */}
      {activeTab === "pagos" && <PagosManager user={user} />}
      
      {activeTab === "habitaciones" && (
        <div>
          <h4>Gestión de Habitaciones</h4>
          {msg && <div className="alert alert-info">{msg}</div>}

          <div className="row g-3">
            <div className="col-lg-4">
              <div className="card p-3">
                <h5>Nueva habitación</h5>
                <form onSubmit={handleCreate}>
                  <div className="mb-2">
                    <label className="form-label">Número</label>
                    <input
                      className="form-control"
                      value={newRoom.numero}
                      onChange={(e) => setNewRoom({ ...newRoom, numero: e.target.value })}
                      required
                      min="1"
                      type="number"
                    />
                  </div>
                  <div className="mb-2">
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
                  <div className="mb-2">
                    <label className="form-label">Precio por noche</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={newRoom.precio_noche}
                      onChange={(e) => setNewRoom({ ...newRoom, precio_noche: e.target.value })}
                      required
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
                  <button className="btn btn-success" type="submit">Crear habitación</button>
                </form>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="card p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Habitaciones registradas</h5>
                  <button className="btn btn-sm btn-outline-secondary" type="button" onClick={loadHabitaciones} disabled={loading}>
                    {loading ? "Actualizando..." : "Actualizar"}
                  </button>
                </div>

                <ul className="list-group">
                  {habitaciones.length > 0 ? (
                    habitaciones.map(h => (
                      <li
                        key={h.habitacion_id}
                        className="list-group-item"
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <strong>Hab. {h.numero}</strong> — {h.tipo}
                            <div className="text-muted small">
                              Precio: {formatMoney(h.precio_noche)} • Hotel: {h.hotel_id}
                            </div>
                          </div>
                          <div className="d-flex align-items-center">
                            <span
                              className={`badge me-2 ${
                                h.estado === "disponible" ? "bg-success"
                                : h.estado === "ocupada" ? "bg-danger"
                                : h.estado === "limpieza" ? "bg-warning"
                                : "bg-secondary"
                              }`}
                            >
                              {h.estado}
                            </span>
                            <select
                              className="form-select form-select-sm me-2"
                              value={h.estado}
                              onChange={(e) => updateEstado(h, e.target.value)}
                            >
                              <option value="disponible">Disponible</option>
                              <option value="ocupada">Ocupada</option>
                              <option value="limpieza">Limpieza</option>
                            </select>
                            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(h)}>Editar</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(h)}>Eliminar</button>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="list-group-item text-muted">
                      No hay habitaciones registradas para este hotel.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {editing && (
            <div className="card p-3 mt-3">
              <h5>Editar habitación #{editing.numero}</h5>
              <form onSubmit={handleEditSubmit} className="row g-2">
                <div className="col-sm-3">
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
                <div className="col-sm-3">
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
                <div className="col-sm-3">
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
                <div className="col-sm-3">
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
                <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                  <button type="button" className="btn btn-light" onClick={() => setEditing(null)}>Cancelar</button>
                  <button className="btn btn-primary" type="submit">Guardar cambios</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === "reservas" && (
        <div>
          <h4>Reservas del hotel</h4>
          {msg && <div className="alert alert-info">{msg}</div>}
          <div className="card p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Reservas recientes</h5>
              <button
                className="btn btn-sm btn-outline-secondary"
                type="button"
                onClick={loadReservas}
                disabled={reservasLoading}
              >
                {reservasLoading ? "Actualizando..." : "Actualizar"}
              </button>
            </div>

            {reservasLoading && <div className="text-muted small">Cargando reservas...</div>}

            {!reservasLoading && reservasOrdenadas.length === 0 && (
              <div className="text-muted">Aún no hay reservas registradas.</div>
            )}

            {!reservasLoading && reservasOrdenadas.length > 0 && (
              <ul className="list-group">
                {reservasOrdenadas.map((r) => {
                  const esPendiente = r.estado === "pendiente";
                  const pagoLabel = r.pago_estado === "pagado"
                    ? "text-success"
                    : r.pago_estado === "pendiente"
                    ? "text-warning"
                    : "text-muted";
                  return (
                    <li key={r.reserva_id} className="list-group-item d-flex justify-content-between align-items-start">
                      <div>
                        <strong>{r.hotel_nombre || user?.hotel_nombre || "Hotel sin nombre"}</strong>
                        <div className="small text-muted">Habitación {r.habitacion_numero}</div>
                        <div className="small text-muted">{r.fecha_inicio} → {r.fecha_fin}</div>
                        <div className={`small ${pagoLabel}`}>
                          {r.pago_metodo || "sin método"} • {r.pago_estado || "sin estado"}
                        </div>
                        <div className={`small ${esPendiente ? "text-warning" : "text-muted"} text-capitalize`}>
                          Reserva: {r.estado || "sin estado"}
                        </div>
                        <button
                          className="btn btn-link btn-sm px-0"
                          onClick={() => setSelectedReserva(r)}
                        >
                          Ver detalles
                        </button>
                      </div>
                      <div className="text-end">
                        <div className="fw-semibold">{formatMoney(r.total)}</div>
                        {esPendiente ? (
                          <button
                            className="btn btn-sm btn-success mt-1"
                            onClick={() => confirmReserva(r)}
                            disabled={confirmingId === r.reserva_id}
                          >
                            {confirmingId === r.reserva_id ? "Confirmando..." : "Marcar como pagada"}
                          </button>
                        ) : (
                          <span className="badge bg-success mt-2">Confirmada</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {selectedReserva && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detalle de reserva</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedReserva(null)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Hotel:</strong> {selectedReserva.hotel_nombre || user?.hotel_nombre || "—"}</p>
                <p><strong>Habitación:</strong> {selectedReserva.habitacion_numero}</p>
                <p><strong>Huésped:</strong> {selectedReserva.huesped_nombre || "Sin nombre registrado"}</p>
                <p><strong>Email huésped:</strong> {selectedReserva.huesped_email || "—"}</p>
                <p><strong>Ingreso:</strong> {formatDate(selectedReserva.fecha_inicio)}</p>
                <p><strong>Salida:</strong> {formatDate(selectedReserva.fecha_fin)}</p>
                <p><strong>Estadía:</strong> {formatNights(selectedReserva)}</p>
                <p><strong>Total:</strong> {formatMoney(selectedReserva.total)}</p>
                <p><strong>Método de pago:</strong> {selectedReserva.pago_metodo || "—"}</p>
                <p><strong>Estado de pago:</strong> {selectedReserva.pago_estado || "—"}</p>
                <p><strong>Estado de la reserva:</strong> {selectedReserva.estado}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedReserva(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
