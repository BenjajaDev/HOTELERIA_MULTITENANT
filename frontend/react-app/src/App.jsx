import React, { useState, useEffect, useCallback } from "react";
import AuthPage from "./components/AuthPage";
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

  const handleGuestProfileUpdate = useCallback((updates) => {
    if (!updates) return;
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      return normalizeUser(merged);
    });
  }, []);

  if (!user) {
    return <AuthPage onLogin={(data) => setUser(normalizeUser(data))} />;
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
    if (user.rol === "gerente" && sucursalLabel) {
      metaParts.push(`Sucursal ${sucursalLabel}`);
    }
    if (user.rol === "huesped" && sucursalLabel) {
      metaParts.push(`Sucursal ${sucursalLabel}`);
    }
  }

  return (
    <>
      {user.rol === "admin" && <AdminDashboard user={user} onLogout={logout} />}
      {user.rol === "recepcionista" && <ReceptionistDashboard user={user} onLogout={logout} />}
      {user.rol === "gerente" && <GerenteDashboard user={user} onLogout={logout} />}
      {user.rol === "huesped" && (
        <GuestDashboard
          user={user}
          onLogout={logout}
          onProfileUpdate={handleGuestProfileUpdate}
        />
      )}
    </>
  );
}

export default App;
