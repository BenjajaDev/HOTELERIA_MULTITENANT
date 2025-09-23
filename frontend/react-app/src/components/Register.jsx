import React, { useState } from "react";
import { api } from "../api";

export default function Register({ onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [tenantId, setTenantId] = useState(""); // el admin/entidad que registra debe pasar tenant_id
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("...");
    try {
      const res = await api.registerHuesped({ tenant_id: tenantId, email, password, nombre });
      // res contains usuario_id
      onRegister({ user_id: res.usuario_id, rol: "huesped" });
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
          <label className="form-label">Tenant ID (hotel)</label>
          <input className="form-control" value={tenantId} onChange={e=>setTenantId(e.target.value)} placeholder="UUID del tenant (hotel)" />
          <small className="text-muted">Pega el tenant_id del hotel donde te registras</small>
        </div>
        <button className="btn btn-success" type="submit">Registrarme</button>
        <div className="mt-2"><small className="text-muted">{msg}</small></div>
      </form>
    </div>
  );
}
