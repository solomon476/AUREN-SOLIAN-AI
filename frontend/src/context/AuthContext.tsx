import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { SolianApiClient } from '../api/client';
import { supabaseAuthService, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile;
  availableUsers: UserProfile[];
  switchUser: (user: UserProfile) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  setRole: (role: UserRole) => void;
  hasRole: (minRole: UserRole) => boolean;
  isAuthenticated: boolean;
  authMode: 'SUPABASE_JWT' | 'DEVELOPMENT_SIMULATION';
  isDevSimulation: boolean;
  isSupabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string | null }>;
  setCorporateSession: (accessToken: string) => Promise<void>;
}

const ROLE_LEVELS: Record<UserRole, number> = {
  owner: 50,
  admin: 40,
  manager: 30,
  member: 20,
  guest: 10,
};

const isProductionEnv = import.meta.env.PROD;

const defaultUser: UserProfile = {
  id: 'tm-1',
  userId: 'usr-1',
  email: 'ian.nyakundi@solianwolves.co',
  fullName: 'Ian Momanyi Nyakundi',
  title: 'Chief Executive Officer',
  role: 'owner',
  department: 'Executive Leadership & Governance',
  responsibilities: ['Corporate Strategy & Executive Governance', 'Capital Allocation & Operational Authority', 'Strategic Alliances'],
  reportsTo: null,
};

const verifiedLeadershipUsers: UserProfile[] = [
  defaultUser,
  {
    id: 'tm-2',
    userId: 'usr-2',
    email: 'hillary.isaiah@solianwolves.co',
    fullName: 'Hillary Onchwati Isaiah',
    title: 'Chief Operating Officer',
    role: 'admin',
    department: 'Operations & Delivery',
    responsibilities: ['Operations Leadership & Delivery', 'Organizational Cadences', 'Resource Coordination'],
    reportsTo: 'tm-1',
  },
  {
    id: 'tm-3',
    userId: 'usr-3',
    email: 'alice.moraa@solianwolves.co',
    fullName: 'Alice Moraa Nyakundi',
    title: 'Chief Financial Officer',
    role: 'admin',
    department: 'Finance & Corporate Treasury',
    responsibilities: ['Treasury Management', 'Cash Flow & Financial Intelligence', 'Corporate Budget Oversight'],
    reportsTo: 'tm-1',
  },
  {
    id: 'tm-4',
    userId: 'usr-4',
    email: 'noella.kaatho@solianwolves.co',
    fullName: 'Noella Maraka Kaatho',
    title: 'Executive Director / Finance & Administration',
    role: 'admin',
    department: 'Administration & Corporate Services',
    responsibilities: ['Statutory Documentation & Corporate Records', 'Administrative Governance', 'Facilities & Contracts'],
    reportsTo: 'tm-1',
  },
  {
    id: 'tm-5',
    userId: 'usr-5',
    email: 'solomon.omwenga@solianwolves.co',
    fullName: 'Solomon Nyangweso Omwenga',
    title: 'Chief Technology Officer',
    role: 'admin',
    department: 'Technology & AI Systems',
    responsibilities: ['AUREN SOLIAN Architecture & Security', 'AI Infrastructure & Model Governance', 'Cloud Systems & Engineering'],
    reportsTo: 'tm-1',
  },
];

const unauthenticatedUser: UserProfile = {
  id: 'guest',
  userId: 'usr-guest',
  email: '',
  fullName: 'Visitor',
  title: 'Public Access',
  role: 'guest',
  department: '',
  responsibilities: [],
  reportsTo: null,
};

const AuthContext = createContext<AuthContextType>({
  user: isProductionEnv ? unauthenticatedUser : defaultUser,
  availableUsers: verifiedLeadershipUsers,
  switchUser: () => {},
  updateUserProfile: () => {},
  setRole: () => {},
  hasRole: () => false,
  isAuthenticated: !isProductionEnv,
  authMode: isProductionEnv ? 'SUPABASE_JWT' : 'DEVELOPMENT_SIMULATION',
  isDevSimulation: !isProductionEnv,
  isSupabaseConfigured: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
  setCorporateSession: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(isProductionEnv ? unauthenticatedUser : defaultUser);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>(verifiedLeadershipUsers);
  const [authMode, setAuthMode] = useState<'SUPABASE_JWT' | 'DEVELOPMENT_SIMULATION'>(
    isProductionEnv ? 'SUPABASE_JWT' : 'DEVELOPMENT_SIMULATION'
  );
  const [isDevSimulation, setIsDevSimulation] = useState<boolean>(!isProductionEnv);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!isProductionEnv);

  // Initialize Available Users & Session
  useEffect(() => {
    // 1. Fetch available dev personas for testing (only in development)
    if (!isProductionEnv) {
      SolianApiClient.getAvailableUsers().then((users) => {
        if (users && users.length > 0) {
          setAvailableUsers(users);
          const found = users.find((u) => u.userId === user.userId || u.id === user.id);
          if (found && isDevSimulation) {
            setUser(found);
            SolianApiClient.setCurrentUserId(found.userId);
          }
        }
      });
    }

    // 2. Check for active Supabase session (both dev and prod)
    if (isSupabaseConfigured) {
      supabaseAuthService.getSession().then((session) => {
        if (session?.access_token) {
          handleActiveSession(session.access_token);
        } else if (isProductionEnv) {
          handleSignedOut();
        }
      });

      const { unsubscribe } = supabaseAuthService.onAuthStateChange(async (event, session) => {
        if (session?.access_token) {
          await handleActiveSession(session.access_token);
        } else if (event === 'SIGNED_OUT') {
          handleSignedOut();
        }
      });

      return () => {
        unsubscribe();
      };
    } else if (isProductionEnv) {
      handleSignedOut();
    }
  }, []);

  const handleActiveSession = async (token: string) => {
    SolianApiClient.setAuthToken(token);
    try {
      const serverProfile = await SolianApiClient.getCurrentUserProfile();
      setUser(serverProfile);
      setAuthMode('SUPABASE_JWT');
      setIsDevSimulation(false);
      setIsAuthenticated(true);
    } catch {
      // If server profile fetch fails, user remains in containment
      setIsAuthenticated(true);
      setAuthMode('SUPABASE_JWT');
      setIsDevSimulation(false);
    }
  };

  const handleSignedOut = () => {
    SolianApiClient.setAuthToken(null);
    if (isProductionEnv) {
      setAuthMode('SUPABASE_JWT');
      setIsDevSimulation(false);
      setIsAuthenticated(false);
      setUser(unauthenticatedUser);
    } else {
      setAuthMode('DEVELOPMENT_SIMULATION');
      setIsDevSimulation(true);
      setIsAuthenticated(true);
      setUser(defaultUser);
      SolianApiClient.setCurrentUserId(defaultUser.userId);
    }
  };

  const signIn = async (email: string, password: string) => {
    const res = await supabaseAuthService.signIn(email, password);
    if (!res.error && res.session?.access_token) {
      await handleActiveSession(res.session.access_token);
    }
    return { error: res.error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const res = await supabaseAuthService.signUp(email, password, fullName);
    if (!res.error && res.session?.access_token) {
      await handleActiveSession(res.session.access_token);
    }
    return { error: res.error };
  };

  const signOut = async () => {
    await supabaseAuthService.signOut();
    handleSignedOut();
  };

  const resetPassword = async (email: string) => {
    return await supabaseAuthService.resetPassword(email);
  };

  const setCorporateSession = async (accessToken: string) => {
    await handleActiveSession(accessToken);
  };

  const switchUser = (selectedUser: UserProfile) => {
    // Strictly prohibited in production environments
    if (isDevSimulation && !isProductionEnv) {
      setUser(selectedUser);
      SolianApiClient.setCurrentUserId(selectedUser.userId);
    }
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...updates }));
    setAvailableUsers((prev) =>
      prev.map((u) => (u.userId === user.userId || u.id === user.id ? { ...u, ...updates } : u))
    );
  };

  const setRole = (role: UserRole) => {
    // Strictly prohibited in production environments
    if (isDevSimulation && !isProductionEnv) {
      setUser((prev) => ({ ...prev, role }));
    }
  };

  const hasRole = (minRole: UserRole): boolean => {
    const userLevel = ROLE_LEVELS[user.role] || 10;
    const requiredLevel = ROLE_LEVELS[minRole] || 10;
    return userLevel >= requiredLevel;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        availableUsers,
        switchUser,
        updateUserProfile,
        setRole,
        hasRole,
        isAuthenticated,
        authMode,
        isDevSimulation,
        isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        setCorporateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
