// NotificationContext.js
import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <NotificationContext.Provider value={{ notification, showNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

// Wrap LibraryDApp
const App = () => (
  <NotificationProvider>
    <LibraryDApp />
  </NotificationProvider>
);

// In AdminTab
const AdminTab = () => {
  const { showNotification } = useNotification();
  // Use showNotification
};