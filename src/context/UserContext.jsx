import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedProfile = localStorage.getItem('profile');
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        // fail silently
      }
    }
    setIsLoading(false);
  }, []);

  const login = (selectedProfile) => {
    setProfile(selectedProfile);
    localStorage.setItem('profile', JSON.stringify(selectedProfile));
  };

  const logout = () => {
    setProfile(null);
    localStorage.removeItem('profile');
  };

  return (
    <UserContext.Provider value={{ profile, isLoading, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
