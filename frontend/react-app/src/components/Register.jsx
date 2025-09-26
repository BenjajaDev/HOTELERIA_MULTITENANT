import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function Register({ onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [hoteles, setHoteles] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const loadHoteles = async () => {
      try {
        const data = await api.getHoteles();
        setHoteles(data);
      } catch (err) {
        setMsg(err.error || err.message || "No se pudieron cargar los hoteles");
      }
    };

    loadHoteles();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("...");

    if (!hotelId) {
      setMsg("Seleccione el hotel donde desea registrarse");
      return;
    }

    try {
      const res = await api.registerHuesped({ hotel_id: hotelId, email, password, nombre });
      // res contains usuario_id
      onRegister({ user_id: res.usuario_id, rol: "huesped" });
      setMsg(res.message || "Registro exitoso");
    } catch (err) {
      setMsg(err.error || err.message || JSON.stringify(err));
    }
  };

  return (
    <div className="card p-3">
      <h4>Registro (Huésped)</h4>
      <form onSubmit={submit}>
        <div className="mb-2">
          <label className="form-label">Nombre</label>
          <input className="form-control" value={nombre} onChange={e=>setNombre(e.target.value)} />
        </div>
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
        <button className="btn btn-success" type="submit">Registrarme</button>
        <div className="mt-2"><small className="text-muted">{msg}</small></div>
      </form>
    </div>
  );
}
