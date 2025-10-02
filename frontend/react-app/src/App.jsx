import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminDashboard from "./components/AdminDashboard";
import ReceptionistDashboard from "./components/ReceptionistDashboard";
import GuestDashboard from "./components/GuestDashboard";
import GerenteDashboard from "./components/GerenteDashboard";

const normalizeUser = (user) => {
  if (!user) return null;
  const usuarioId = user.usuario_id || user.user_id || user.id || null;
  const rol = user.rol || user.role || "";
  return {
    ...user,
    usuario_id: usuarioId,
    user_id: user.user_id || usuarioId,
    rol,
  };
};

function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("dh_user"));
      return normalizeUser(stored);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem("dh_user", JSON.stringify(user));
    else localStorage.removeItem("dh_user");
  }, [user]);

  const logout = () => setUser(null);

  if (!user) {
    return (
      <div className="container">
        <h1 className="mb-4">DockHotel Manager</h1>
        <div className="row">
          <div className="col-md-6">
            <Login onLogin={(data) => setUser(normalizeUser(data))} />
          </div>
          <div className="col-md-6">
            <Register />
          </div>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  const nameLabel = user.nombre || user.email || "Usuario";
  const hotelLabel = user.hotel_nombre || user.tenant_nombre || "Hotel no asignado";
  const roleLabel = user.rol ? user.rol.toUpperCase() : "SIN ROL";
  const sucursalLabel = user.sucursal_nombre || null;

  const metaParts = [roleLabel];
  if (user.rol === "admin") {
    metaParts.push("Hoteles disponibles");
  } else {
    metaParts.push(hotelLabel);
    if (user.rol === "recepcionista" && sucursalLabel) {
      metaParts.push(`Sucursal ${sucursalLabel}`);
    }
  }

  return (
    <div className="container">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h2>Bienvenido: {nameLabel}</h2>
          <small className="text-muted">{metaParts.join(" • ")}</small>
        </div>
        <div>
          <button className="btn btn-secondary me-2" onClick={logout}>Cerrar sesión</button>
        </div>
      </div>
      <div className="container-card">
        {user.rol === "admin" && <AdminDashboard user={user} />}
        {user.rol === "recepcionista" && <ReceptionistDashboard user={user} />}
        {user.rol === "gerente" && <GerenteDashboard user={user} />}
        {user.rol === "huesped" && <GuestDashboard user={user} />}
      </div>
    </div>
  );
}

export default App;
