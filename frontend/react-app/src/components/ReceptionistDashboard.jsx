// frontend/components/ReceptionistDashboard.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function ReceptionistDashboard() {
  const [habitaciones, setHabitaciones] = useState([]);
  const [msg, setMsg] = useState("");

  // 🔹 Ya no necesitamos un hotelId fijo; el backend nos devolverá las habitaciones del hotel del usuario
  useEffect(() => {
    const load = async () => {
      try {
        const h = await api.getHabitacionesDelUsuario(); // <-- nuevo endpoint
        console.log("👉 Respuesta habitaciones:", h);

        if (Array.isArray(h)) {
          setHabitaciones(h);
        } else if (h?.data && Array.isArray(h.data)) {
          setHabitaciones(h.data);
        } else {
          setHabitaciones([]);
        }
      } catch (err) {
        setMsg(err.error || JSON.stringify(err));
      }
    };
    load();
  }, []);

  const updateEstado = async (habit, newEstado) => {
    try {
      const updated = await api.updateHabitacion(habit.habitacion_id, { estado: newEstado });
      setHabitaciones(prev =>
        prev.map(x => x.habitacion_id === updated.habitacion_id ? updated : x)
      );
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
          {habitaciones.length > 0 ? (
            habitaciones.map(h => (
              <li
                key={h.habitacion_id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <strong>{h.numero} — {h.tipo}</strong><br />
                  <small className="text-muted">Hotel: {h.hotel_id}</small>
                </div>
                <div>
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
                    className="form-select form-select-sm d-inline-block w-auto"
                    value={h.estado}
                    onChange={(e) => updateEstado(h, e.target.value)}
                  >
                    <option value="disponible">Disponible</option>
                    <option value="ocupada">Ocupada</option>
                    <option value="limpieza">Limpieza</option>
                  </select>
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
  );
}
