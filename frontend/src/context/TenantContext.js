import React, { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get tenant from localStorage
    const storedTenant = localStorage.getItem('tenant');
    
    if (storedTenant) {
      try {
        const parsedTenant = JSON.parse(storedTenant);
        setTenant(parsedTenant);
      } catch (error) {
        console.error('Failed to parse stored tenant data:', error);
        localStorage.removeItem('tenant');
      }
    }
    
    setIsLoading(false);
  }, []);

  const updateTenant = (newTenant) => {
    setTenant(newTenant);
    if (newTenant) {
      localStorage.setItem('tenant', JSON.stringify(newTenant));
    } else {
      localStorage.removeItem('tenant');
    }
  };

  const value = {
    tenant,
    updateTenant,
    isLoading,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}