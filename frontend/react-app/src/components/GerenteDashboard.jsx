import React, { useMemo, useState } from "react";
import GestionSucursales from "./GestionSucursales";
import GestionRecepcionistas from "./GestionRecepcionistas";
import GestionHuespedes from "./GestionHuespedes";
import GestionReservasGerente from "./GestionReservasGerente";

export default function GerenteDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("sucursales");

  const hotelList = useMemo(() => {
    if (!user?.hotel_id) return [];
    return [{
      hotel_id: user.hotel_id,
      nombre: user.hotel_nombre || "Hotel asignado",
      tenant_id: user.tenant_id,
    }];
  }, [user]);

  const context = useMemo(() => ({
    usuarioId: user?.usuario_id,
    tenantId: user?.tenant_id,
    hotelId: user?.hotel_id,
  }), [user]);

  return (
    <div>
      <h3>Panel de Gerente</h3>
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "sucursales" ? "active" : ""}`}
            onClick={() => setActiveTab("sucursales")}
          >
            <i className="bi bi-diagram-3"></i> Sucursales
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "recepcionistas" ? "active" : ""}`}
            onClick={() => setActiveTab("recepcionistas")}
          >
            <i className="bi bi-person-badge"></i> Recepcionistas
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "huespedes" ? "active" : ""}`}
            onClick={() => setActiveTab("huespedes")}
          >
            <i className="bi bi-people"></i> Huéspedes
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "reservas" ? "active" : ""}`}
            onClick={() => setActiveTab("reservas")}
          >
            <i className="bi bi-calendar-check"></i> Reservas
          </button>
        </li>
      </ul>

      {activeTab === "sucursales" && (
        <GestionSucursales
          hoteles={hotelList}
          restrictHotelId={user?.hotel_id}
          userContext={context}
        />
      )}

      {activeTab === "recepcionistas" && (
        <GestionRecepcionistas
          hoteles={hotelList}
          restrictHotelId={user?.hotel_id}
          userContext={context}
        />
      )}

      {activeTab === "huespedes" && (
        <GestionHuespedes
          restrictTenantId={user?.tenant_id}
          allowCreate
          userContext={context}
        />
      )}

      {activeTab === "reservas" && (
        <GestionReservasGerente user={user} />
      )}
    </div>
  );
}

