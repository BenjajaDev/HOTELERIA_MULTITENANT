import React from 'react';
import './LogoutModal.css';

export default function LogoutModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay" onClick={onCancel}>
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-modal-header">
          <h3>Cerrar sesión</h3>
        </div>
        
        <div className="logout-modal-body">
          <p>¿Estás seguro que quieres cerrar sesión?</p>
        </div>
        
        <div className="logout-modal-footer">
          <button className="btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn-confirm" onClick={onConfirm}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}