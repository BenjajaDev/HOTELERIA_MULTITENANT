import React, { useMemo, useState } from "react";
import GestionSucursales from "./GestionSucursales";
import GestionRecepcionistas from "./GestionRecepcionistas";
import GestionHuespedes from "./GestionHuespedes";
import GestionReservasGerente from "./GestionReservasGerente";
import DashboardLayout from "./DashboardLayout";
import "./DashboardContent.css";

export default function GerenteDashboard({ user, onLogout }) {
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

  const menuItems = [
    {
      id: 'sucursales',
      label: 'Sucursales',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke-width="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke-width="2"/></svg>'
    },
    {
      id: 'recepcionistas',
      label: 'Recepcionistas',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      id: 'huespedes',
      label: 'Huéspedes',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      id: 'reservas',
      label: 'Reservas',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/></svg>'
    }
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
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
    </DashboardLayout>
  );
}

