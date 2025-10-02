import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import GestionHuespedes from "./GestionHuespedes";
import GestionSucursales from "./GestionSucursales";
import GestionRecepcionistas from "./GestionRecepcionistas";
import GestionGerentes from "./GestionGerentes";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("hoteles");
  const [hoteles, setHoteles] = useState([]);
  const [form, setForm] = useState({ nombre: "", direccion: "", telefono: "", email: "" });
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: "", direccion: "", telefono: "", email: "" });
  const [editMsg, setEditMsg] = useState("");
  const [reservas, setReservas] = useState([]);
  const [reservasMsg, setReservasMsg] = useState("");
  const [selectedReserva, setSelectedReserva] = useState(null);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }),
    []
  );

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

  const load = async () => {
    try {
      const h = await api.getHoteles();
      setHoteles(h);
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  const loadReservas = async () => {
    try {
      const data = await api.getReservas();
      setReservas(data);
      setReservasMsg("");
    } catch (err) {
      setReservasMsg(err.error || JSON.stringify(err));
    }
  };

  useEffect(() => {
    load();
    loadReservas();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("Creando...");
    try {
      const created = await api.createHotel(form);
      setHoteles(prev => [created, ...prev]);
      setForm({ nombre: "", direccion: "", telefono: "", email: "" });
      setMsg("Creado ✅");
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  const startEdit = (hotel) => {
    setEditingId(hotel.hotel_id);
    setEditForm({
      nombre: hotel.nombre || "",
      direccion: hotel.direccion || "",
      telefono: hotel.telefono || "",
      email: hotel.email || "",
    });
    setEditMsg("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ nombre: "", direccion: "", telefono: "", email: "" });
    setEditMsg("");
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    setEditMsg("Actualizando...");
    try {
      const updated = await api.updateHotel(editingId, editForm);
      setHoteles(prev => prev.map(h => (h.hotel_id === editingId ? { ...h, ...updated } : h)));
      setMsg("Hotel actualizado ✅");
      cancelEdit();
    } catch (err) {
      setEditMsg(err.error || JSON.stringify(err));
    }
  };

  const del = async (id) => {
    if (!confirm("Eliminar hotel?")) return;
    try {
      await api.deleteHotel(id);
      setHoteles(prev => prev.filter(h => h.hotel_id !== id));
    } catch (err) {
      alert(err.error || JSON.stringify(err));
    }
  };

  return (
    <div>
      <h3>Panel de Administración</h3>

      {/* Navegación por pestañas */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "hoteles" ? "active" : ""}`}
            onClick={() => setActiveTab("hoteles")}
          >
            <i className="bi bi-building"></i> Hoteles
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "sucursales" ? "active" : ""}`}
            onClick={() => setActiveTab("sucursales")}
          >
            <i className="bi bi-diagram-3"></i> Sucursales
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "gerentes" ? "active" : ""}`}
            onClick={() => setActiveTab("gerentes")}
          >
            <i className="bi bi-person-gear"></i> Gerentes
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "recepcionistas" ? "active" : ""}`}
            onClick={() => setActiveTab("recepcionistas")}
          >
            <i className="bi bi-person-badge"></i> Recepcionistas
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "huespedes" ? "active" : ""}`}
            onClick={() => setActiveTab("huespedes")}
          >
            <i className="bi bi-people"></i> Huéspedes
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
      </ul>

      {/* Contenido de las pestañas */}
      {activeTab === "huespedes" && <GestionHuespedes />}

      {activeTab === "sucursales" && (
        <GestionSucursales hoteles={hoteles} onHotelRefresh={load} />
      )}

      {activeTab === "gerentes" && (
        <GestionGerentes hoteles={hoteles} />
      )}

      {activeTab === "recepcionistas" && (
        <GestionRecepcionistas hoteles={hoteles} />
      )}

      {activeTab === "hoteles" && (
        <div>
          <h4>Administración de Hoteles</h4>
          <div className="row">
            <div className="col-md-5">
              <div className="card p-3">
                <h5>Crear Hotel</h5>
                <form onSubmit={submit}>
                  <input
                    className="form-control mb-2"
                    placeholder="Nombre"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                  />
                  <input
                    className="form-control mb-2"
                    placeholder="Dirección"
                    value={form.direccion}
                    onChange={e => setForm({ ...form, direccion: e.target.value })}
                  />
                  <input
                    className="form-control mb-2"
                    placeholder="Teléfono"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                  />
                  <input
                    className="form-control mb-2"
                    placeholder="Email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                  <button className="btn btn-primary" type="submit">Crear</button>
                </form>
                <div className="mt-2 text-muted">{msg}</div>
              </div>
            </div>

            {editingId && (
              <div className="col-md-5">
                <div className="card p-3">
                  <h5>Editar Hotel</h5>
                  <form onSubmit={submitEdit}>
                    <input
                      className="form-control mb-2"
                      placeholder="Nombre"
                      value={editForm.nombre}
                      onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                    />
                    <input
                      className="form-control mb-2"
                      placeholder="Dirección"
                      value={editForm.direccion}
                      onChange={e => setEditForm({ ...editForm, direccion: e.target.value })}
                    />
                    <input
                      className="form-control mb-2"
                      placeholder="Teléfono"
                      value={editForm.telefono}
                      onChange={e => setEditForm({ ...editForm, telefono: e.target.value })}
                    />
                    <input
                      className="form-control mb-2"
                      placeholder="Email"
                      value={editForm.email}
                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    />
                    <div className="d-flex gap-2">
                      <button className="btn btn-primary" type="submit">Guardar</button>
                      <button className="btn btn-outline-secondary" type="button" onClick={cancelEdit}>Cancelar</button>
                    </div>
                  </form>
                  <div className="mt-2 text-muted">{editMsg}</div>
                </div>
              </div>
            )}

            <div className="col-md-7">
              <div className="card p-3">
                <h5>Hoteles</h5>
                {hoteles.length === 0 ? (
                  <p className="text-muted">No hay hoteles</p>
                ) : (
                  <ul className="list-group">
                    {hoteles.map(h => (
                      <li key={h.hotel_id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{h.nombre}</strong><br />
                          <small className="text-muted">{h.direccion} • {h.email}</small>
                          <div>
                            <small className="text-muted">
                              Tenant: {h.tenant_nombre || h.tenant_id}
                            </small>
                          </div>
                          <div className="small mt-1">
                            <div className="text-success">Ganancias confirmadas: {formatMoney(h.total_ganancias)}</div>
                            <div className="text-warning">Ingresos pendientes: {formatMoney(h.total_pendiente)}</div>
                          </div>
                        </div>
                        <div>
                          <button
                            className="btn btn-secondary btn-sm me-2"
                            onClick={() => startEdit(h)}
                          >
                            Editar
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => del(h.hotel_id)}>Eliminar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "reservas" && (
        <div>
          <h4>Reservas del sistema</h4>
          <div className="card p-3">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Reservas recientes</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={loadReservas}>
                Refrescar
              </button>
            </div>
            {reservasMsg && <div className="text-danger small mt-2">{reservasMsg}</div>}
            {!reservasMsg && reservas.length === 0 && (
              <p className="text-muted mt-2">Aún no hay reservas registradas.</p>
            )}
            {!reservasMsg && reservas.length > 0 && (
              <ul className="list-group mt-2">
                {reservas.slice(0, 8).map(r => {
                  const pagoClass = r.pago_estado === "pagado" ? "text-success" : r.pago_estado === "pendiente" ? "text-warning" : "text-muted";
                  const reservaClass = r.estado === "confirmada" ? "text-success" : r.estado === "pendiente" ? "text-warning" : "text-muted";
                  return (
                    <li key={r.reserva_id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>{r.hotel_nombre}</strong>
                          <div className="small text-muted">Habitación {r.habitacion_numero}</div>
                          <div className="small text-muted">{r.fecha_inicio} → {r.fecha_fin}</div>
                        </div>
                        <div className="text-end small">
                          <div>{formatMoney(r.total)}</div>
                          <div className={`${pagoClass} text-capitalize`}>
                            {r.pago_metodo || "sin método"} • {r.pago_estado || "sin estado"}
                          </div>
                          <div className={`${reservaClass} text-capitalize`}>Reserva: {r.estado}</div>
                        </div>
                      </div>
                      <div className="d-flex justify-content-end mt-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setSelectedReserva(r)}
                        >
                          Ver detalles
                        </button>
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
                <p><strong>Hotel:</strong> {selectedReserva.hotel_nombre}</p>
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
