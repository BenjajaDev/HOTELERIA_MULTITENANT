import React, { useState } from "react";
import { api } from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("...");
    try {
      const res = await api.login({ email, password });
      // retorna { message, user_id, rol }
      onLogin({ user_id: res.user_id, rol: res.rol });
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
        <div className="d-flex justify-content-between align-items-center">
          <button className="btn btn-primary" type="submit">Entrar</button>
          <small className="text-muted">{msg}</small>
        </div>
      </form>
    </div>
  );
}