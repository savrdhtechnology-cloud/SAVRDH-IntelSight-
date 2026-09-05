import React, { createContext, useContext, useState, type ReactNode } from 'react';

type NavigationContextValue = {
  navigate: (path: string) => void;
  openDemoModal: boolean;
  setOpenDemoModal: (open: boolean) => void;
};

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [openDemoModal, setOpenDemoModal] = useState(false);

  const navigate = (path: string) => {
    if (path === '/contact') {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', path);
  };

  return (
    <NavigationContext.Provider value={{ navigate, openDemoModal, setOpenDemoModal }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation must be used inside NavigationProvider');
  return context;
};
