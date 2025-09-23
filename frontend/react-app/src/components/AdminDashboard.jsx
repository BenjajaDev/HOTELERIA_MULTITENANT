import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function AdminDashboard({ user }) {
  const [hoteles, setHoteles] = useState([]);
  const [form, setForm] = useState({ tenant_id: "", nombre: "", direccion: "", telefono: "", email: "" });
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const h = await api.getHoteles();
      setHoteles(h);
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("Creando...");
    try {
      const created = await api.createHotel(form);
      setHoteles(prev => [created, ...prev]);
      setForm({ tenant_id: "", nombre: "", direccion: "", telefono: "", email: "" });
      setMsg("Creado ✅");
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
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
              <input className="form-control mb-2" placeholder="tenant_id (uuid)" value={form.tenant_id} onChange={e=>setForm({...form, tenant_id:e.target.value})} />
              <input className="form-control mb-2" placeholder="Nombre" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} />
              <input className="form-control mb-2" placeholder="Dirección" value={form.direccion} onChange={e=>setForm({...form, direccion:e.target.value})} />
              <input className="form-control mb-2" placeholder="Teléfono" value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})} />
              <input className="form-control mb-2" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
              <button className="btn btn-primary" type="submit">Crear</button>
            </form>
            <div className="mt-2 text-muted">{msg}</div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="card p-3">
            <h5>Hoteles</h5>
            {hoteles.length === 0 ? <p className="text-muted">No hay hoteles</p> : (
              <ul className="list-group">
                {hoteles.map(h => (
                  <li key={h.hotel_id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{h.nombre}</strong><br/>
                      <small className="text-muted">{h.direccion} • {h.email}</small>
                      <div><small className="text-muted">tenant_id: {h.tenant_id}</small></div>
                    </div>
                    <div>
                      <button className="btn btn-danger btn-sm" onClick={()=>del(h.hotel_id)}>Eliminar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}