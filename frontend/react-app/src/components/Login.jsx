import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [hoteles, setHoteles] = useState([]);
  const [hotelId, setHotelId] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getHoteles();
        setHoteles(data);
      } catch (err) {
        setMsg(err.error || err.message || "No se pudieron cargar los hoteles");
      }
    };
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("...");
    const selectedHotel = hoteles.find(h => h.hotel_id === hotelId);

    if (!selectedHotel) {
      setMsg("Seleccione el hotel al que pertenece");
      return;
    }

    try {
      const res = await api.login({
        email,
        password,
        tenantId: selectedHotel.tenant_id,
        hotelId: selectedHotel.hotel_id,
      });

      if (res?.user) {
        onLogin(res.user);
        setMsg(res.message || "");
      } else {
        setMsg(res?.message || "Respuesta inesperada del servidor");
      }
    } catch (err) {
      setMsg(err.error || err.message || JSON.stringify(err));
    }
  };

  return (
    <div className="card p-3">
      <h4>Iniciar sesión</h4>
      <form onSubmit={submit}>
        <div className="mb-2">
          <label className="form-label">Email</label>
          <input className="form-control" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div className="mb-2">
          <label className="form-label">Contraseña</label>
          <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <div className="mb-2">
          <label className="form-label">Hotel</label>
          <select className="form-select" value={hotelId} onChange={e => setHotelId(e.target.value)}>
            <option value="">Seleccione un hotel</option>
            {hoteles.map(hotel => (
              <option key={hotel.hotel_id} value={hotel.hotel_id}>
                {hotel.nombre} ({hotel.tenant_nombre || hotel.tenant_id})
              </option>
            ))}
          </select>
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <button className="btn btn-primary" type="submit">Entrar</button>
          <small className="text-muted">{msg}</small>
        </div>
      </form>
    </div>
  );
}
