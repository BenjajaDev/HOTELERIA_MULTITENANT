import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminDashboard from "./components/AdminDashboard";
import ReceptionistDashboard from "./components/ReceptionistDashboard";
import GuestDashboard from "./components/GuestDashboard";

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dh_user")); } catch { return null; }
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
            <Login onLogin={setUser} />
          </div>
          <div className="col-md-6">
            <Register onRegister={(u) => setUser(u)} />
          </div>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  return (
    <div className="container">
      <div className="d-flex justify-content-between align-items-center">
        <h2>Bienvenido: {user.rol.toUpperCase()}</h2>
        <div>
          <button className="btn btn-secondary me-2" onClick={logout}>Cerrar sesión</button>
        </div>
      </div>
      <div className="container-card">
        {user.rol === "admin" && <AdminDashboard user={user} />}
        {user.rol === "recepcionista" && <ReceptionistDashboard user={user} />}
        {user.rol === "huesped" && <GuestDashboard user={user} />}
      </div>
    </div>
  );
}

export default App;
