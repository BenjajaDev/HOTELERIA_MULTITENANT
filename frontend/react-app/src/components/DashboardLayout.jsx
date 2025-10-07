import React, { useState } from 'react';
import './DashboardLayout.css';

export default function DashboardLayout({ 
  children, 
  user, 
  onLogout, 
  menuItems = [],
  activeTab,
  onTabChange 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Botón de colapso */}
        <button className="collapse-toggle" onClick={toggleCollapse}>
          <span className={`collapse-arrow ${isCollapsed ? 'collapsed' : ''}`}>
            ◀
          </span>
        </button>

        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9 22 9 12 15 12 15 22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {!isCollapsed && (
              <div className="logo-text">
                <h1>DockHotel</h1>
                <p>Manager</p>
              </div>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'nav-item-active' : ''}`}
              onClick={() => {
                onTabChange(item.id);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              title={isCollapsed ? item.label : ''}
            >
              <span className="nav-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.nombre?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <div className="user-details">
                <p className="user-name">{user?.nombre || user?.email || 'Usuario'}</p>
                <p className="user-role">{user?.rol?.toUpperCase() || 'Usuario'}</p>
              </div>
            )}
          </div>
          <button className="logout-button" onClick={onLogout} title={isCollapsed ? 'Cerrar sesión' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!isCollapsed && 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`dashboard-main ${isCollapsed ? 'main-collapsed' : ''}`}>
        {/* Top Bar */}
        <header className="dashboard-header">
          <button className="menu-toggle" onClick={toggleSidebar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="header-title">
            <h2>{menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}</h2>
            {user?.hotel_nombre && (
              <p className="header-subtitle">{user.hotel_nombre}</p>
            )}
          </div>

          <div className="header-actions">
            <div className="user-badge">
              <div className="user-badge-avatar">
                {user?.nombre?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="user-badge-info">
                <p className="user-badge-name">{user?.nombre || user?.email || 'Usuario'}</p>
                <p className="user-badge-role">{user?.rol?.toUpperCase() || 'Usuario'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="dashboard-content">
          {children}
        </main>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
