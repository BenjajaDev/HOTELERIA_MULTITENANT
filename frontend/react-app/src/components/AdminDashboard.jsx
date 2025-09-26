import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function AdminDashboard() {
  const [hoteles, setHoteles] = useState([]);
  const [form, setForm] = useState({ nombre: "", direccion: "", telefono: "", email: "" });
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: "", direccion: "", telefono: "", email: "" });
  const [editMsg, setEditMsg] = useState("");
  const [reservas, setReservas] = useState([]);
  const [reservasMsg, setReservasMsg] = useState("");

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }),
    []
  );

  const formatMoney = (value) => currencyFormatter.format(value || 0);

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
      <h3>Administración de Hoteles</h3>
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
                      <strong>{h.nombre}</strong><br/>
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
          <div className="card p-3 mt-3">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Reservas recientes</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={loadReservas}>
                Refrescar
              </button>
            </div>
            {reservasMsg && <div className="text-danger small mt-2">{reservasMsg}</div>}
            {!reservasMsg && reservas.length === 0 && (
              <p className="text-muted mt-2">Sin reservas registradas todavía</p>
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
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
