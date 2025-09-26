import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function GuestDashboard({ user }) {
  const [hoteles, setHoteles] = useState([]);
  const [habitaciones, setHabitaciones] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [form, setForm] = useState({ tenant_id: "", habitacion_id: "", fecha_inicio: "", fecha_fin: "", total: 0 });
  const [msg, setMsg] = useState("");

  const loadHoteles = async () => {
    try {
      const h = await api.getHoteles();
      setHoteles(h);
    } catch (err) { setMsg(err.error || JSON.stringify(err)); }
  };

  useEffect(() => { loadHoteles(); }, []);

  const selectHotel = async (hotel) => {
    setSelectedHotel(hotel);
    setForm({ ...form, tenant_id: hotel.tenant_id });
    // cargar habitaciones filtradas por hotel -> backend debe soportar query ?hotel_id=...
    try {
      const all = await api.getHabitaciones();
      const filtered = all.filter(x => x.hotel_id === hotel.hotel_id && x.estado === "disponible");
      setHabitaciones(filtered);
    } catch {
      setHabitaciones([]);
    }
  };

  const submitReserva = async (e) => {
    e.preventDefault();
    setMsg("Reservando...");
    try {
      const payload = {
        tenant_id: form.tenant_id,
        habitacion_id: form.habitacion_id,
        huesped_id: user.user_id, // asume que user.user_id es el huesped_id
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        estado: "pendiente",
        total: form.total || 0,
      };
      await api.createReserva(payload);
      setMsg("Reserva creada ✅");
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  return (
    <div>
      <h3>Reservar habitación</h3>
      <div className="row">
        <div className="col-md-5">
          <div className="card p-3">
            <h5>Hoteles</h5>
            <ul className="list-group">
              {hoteles.map(h => (
                <li key={h.hotel_id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{h.nombre}</strong><br/>
                    <small className="text-muted">{h.direccion}</small>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={()=>selectHotel(h)}>Ver habitaciones</button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-md-7">
          <div className="card p-3">
            <h5>{selectedHotel ? `Habitaciones en ${selectedHotel.nombre}` : "Seleccione un hotel"}</h5>
            <form onSubmit={submitReserva}>
              <div className="mb-2">
                <label>Habitación</label>
                <select className="form-select" value={form.habitacion_id} onChange={e=>setForm({...form, habitacion_id: e.target.value})}>
                  <option value="">-- elegir --</option>
                  {habitaciones.map(h => <option key={h.habitacion_id} value={h.habitacion_id}>{h.numero} — {h.tipo} — ${h.precio_noche}</option>)}
                </select>
              </div>
              <div className="mb-2">
                <label>Fecha inicio</label>
                <input type="date" className="form-control" value={form.fecha_inicio} onChange={e=>setForm({...form, fecha_inicio: e.target.value})} />
              </div>
              <div className="mb-2">
                <label>Fecha fin</label>
                <input type="date" className="form-control" value={form.fecha_fin} onChange={e=>setForm({...form, fecha_fin: e.target.value})} />
              </div>
              <div className="mb-2">
                <label>Total</label>
                <input type="number" className="form-control" value={form.total} onChange={e=>setForm({...form, total: Number(e.target.value)})} />
              </div>
              <button className="btn btn-success" type="submit">Reservar</button>
            </form>
            <div className="mt-2 text-muted">{msg}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
