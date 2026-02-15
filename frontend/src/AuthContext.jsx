import React, { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [profilePic, setProfilePic] = useState(() => {
    const stored = localStorage.getItem('profilePic');
    return stored && String(stored).trim() ? stored : null;
  });

  const updateProfilePic = (newUrl) => {
    const next = newUrl && String(newUrl).trim() ? String(newUrl).trim() : null;
    setProfilePic(next);
    if (next) localStorage.setItem('profilePic', next);
    else localStorage.removeItem('profilePic');
  };

  const value = useMemo(() => ({ profilePic, updateProfilePic }), [profilePic]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
