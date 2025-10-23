import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Modal.css';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md', // sm, md, lg, xl
  footer 
}) {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg',
    xl: 'modal-xl'
  };

  return (
    <div 
      className="modal-overlay-component" 
      onClick={onClose}
      style={{
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)'
      }}
    >
      <div 
        className={`modal-dialog-component ${sizeClasses[size]}`}
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="modal-content-component"
          style={{
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            border: isDarkMode ? '1px solid #334155' : '1px solid #e5e7eb'
          }}
        >
          {/* Header */}
          <div 
            className="modal-header-component"
            style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
              borderBottom: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`
            }}
          >
            <h3 
              className="modal-title-component"
              style={{
                color: isDarkMode ? '#f1f5f9' : '#1f2937'
              }}
            >
              {title}
            </h3>
            <button 
              className="modal-close-component"
              onClick={onClose}
              style={{
                color: isDarkMode ? '#94a3b8' : '#6b7280'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24">
                <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div 
            className="modal-body-component"
            style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
              color: isDarkMode ? '#cbd5e1' : '#1f2937'
            }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div 
              className="modal-footer-component"
              style={{
                backgroundColor: isDarkMode ? '#1e293b' : '#f8f9fa',
                borderTop: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
