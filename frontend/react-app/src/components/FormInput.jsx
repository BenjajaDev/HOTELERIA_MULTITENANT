import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function FormInput({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder,
  required = false,
  error,
  ...props 
}) {
  const { isDarkMode } = useTheme();

  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label 
          style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: isDarkMode ? '#cbd5e1' : '#1f2937',
            marginBottom: '6px',
            display: 'block'
          }}
        >
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        {...props}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`,
          borderRadius: '8px',
          fontSize: '14px',
          transition: 'all 0.2s ease',
          backgroundColor: isDarkMode ? '#334155' : '#ffffff',
          color: isDarkMode ? '#e2e8f0' : '#1f2937',
          outline: 'none',
          ...props.style
        }}
        onFocus={(e) => {
          e.target.style.borderColor = isDarkMode ? '#60a5fa' : '#3b82f6';
          e.target.style.boxShadow = isDarkMode 
            ? '0 0 0 3px rgba(96, 165, 250, 0.2)' 
            : '0 0 0 3px rgba(59, 130, 246, 0.1)';
          if (props.onFocus) props.onFocus(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = isDarkMode ? '#475569' : '#e5e7eb';
          e.target.style.boxShadow = 'none';
          if (props.onBlur) props.onBlur(e);
        }}
      />
      {error && (
        <span style={{ 
          fontSize: '13px', 
          color: '#ef4444', 
          marginTop: '4px',
          display: 'block'
        }}>
          {error}
        </span>
      )}
    </div>
  );
}
