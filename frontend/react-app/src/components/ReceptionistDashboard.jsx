import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function ReceptionistDashboard() {
  const [habitaciones, setHabitaciones] = useState([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const h = await api.getHabitaciones();
      setHabitaciones(h);
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  useEffect(() => { load(); }, []);

  const toggleEstado = async (habit) => {
    const newEstado = habit.estado === "disponible" ? "ocupada" : "disponible";
    try {
      const updated = await api.updateHabitacion(habit.habitacion_id, { ...habit, estado: newEstado });
      setHabitaciones(prev => prev.map(x => x.habitacion_id === updated.habitacion_id ? updated : x));
    } catch (err) {
      alert(err.error || JSON.stringify(err));
    }
  };

  return (
    <div>
      <h3>Gestión de Habitaciones</h3>
      <div className="card p-3">
        <p className="text-muted">Lista de habitaciones (cambiar estado)</p>
        {msg && <div className="alert alert-danger">{msg}</div>}
        <ul className="list-group">
          {habitaciones.map(h => (
            <li key={h.habitacion_id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{h.numero} — {h.tipo}</strong><br />
                <small className="text-muted">Hotel: {h.hotel_id}</small>
              </div>
              <div>
                <span className={`badge me-2 ${h.estado === "disponible" ? "bg-success" : "bg-warning"}`}>{h.estado}</span>
                <button className="btn btn-sm btn-outline-primary" onClick={()=>toggleEstado(h)}>Toggle</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}