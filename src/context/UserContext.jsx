import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [profile,    setProfile]    = useState(null);
  const [isLoading,  setIsLoading]  = useState(true);
  // clay (admin) can switch between 'uli' and 'code'; default to 'uli'
  const [activeChat, setActiveChat] = useState('uli');

  useEffect(() => {
    const savedProfile    = localStorage.getItem('profile');
    const savedActiveChat = localStorage.getItem('activeChat');
    if (savedProfile) {
      try { setProfile(JSON.parse(savedProfile)); } catch (e) { /* ignore */ }
    }
    if (savedActiveChat) {
      setActiveChat(savedActiveChat);
    }
    setIsLoading(false);
  }, []);

  const login = (selectedProfile) => {
    setProfile(selectedProfile);
    localStorage.setItem('profile', JSON.stringify(selectedProfile));
    // non-admin accounts always talk to clay
    if (!selectedProfile.isAdmin) {
      setActiveChat('clay');
      localStorage.setItem('activeChat', 'clay');
    }
  };

  const logout = () => {
    setProfile(null);
    localStorage.removeItem('profile');
  };

  const switchActiveChat = (targetId) => {
    setActiveChat(targetId);
    localStorage.setItem('activeChat', targetId);
  };

  return (
    <UserContext.Provider value={{ profile, isLoading, login, logout, activeChat, switchActiveChat }}>
      {children}
    </UserContext.Provider>
  );
};
