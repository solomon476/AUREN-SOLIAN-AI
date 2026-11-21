import React, { createContext, useContext, useState } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile;
  setRole: (role: UserRole) => void;
  isAuthenticated: boolean;
}

const defaultUser: UserProfile = {
  id: 'usr-exec-001',
  email: 'solomon@solian.ai',
  fullName: 'Solomon K.',
  title: 'Managing Director & Enterprise Architect',
  role: 'admin',
  department: 'Executive Operations',
};

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  setRole: () => {},
  isAuthenticated: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(defaultUser);

  const setRole = (role: UserRole) => {
    setUser((prev) => ({ ...prev, role }));
  };

  return (
    <AuthContext.Provider value={{ user, setRole, isAuthenticated: true }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

