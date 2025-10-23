import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function Button({ 
  children, 
  variant = 'primary', // primary, secondary, danger
  type = 'button',
  onClick,
  disabled = false,
  icon,
  ...props 
}) {
  const { isDarkMode } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const getStyles = () => {
    const baseStyles = {
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      border: 'none',
      opacity: disabled ? 0.5 : 1
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
          color: '#ffffff',
          boxShadow: isHovered && !disabled 
            ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
            : 'none',
          transform: isHovered && !disabled ? 'translateY(-1px)' : 'none'
        };
      
      case 'secondary':
        return {
          ...baseStyles,
          backgroundColor: isDarkMode ? '#334155' : '#f3f4f6',
          color: isDarkMode ? '#cbd5e1' : '#6b7280',
          border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
          ...(isHovered && !disabled && {
            backgroundColor: isDarkMode ? '#475569' : '#e5e7eb',
            color: isDarkMode ? '#e2e8f0' : '#1f2937'
          })
        };
      
      case 'danger':
        return {
          ...baseStyles,
          backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2',
          color: isDarkMode ? '#fca5a5' : '#ef4444',
          border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5'}`,
          ...(isHovered && !disabled && {
            backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fecaca',
            color: '#ef4444'
          })
        };
      
      default:
        return baseStyles;
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={getStyles()}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
