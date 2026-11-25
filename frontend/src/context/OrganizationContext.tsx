import React, { createContext, useContext, useState, useEffect } from 'react';
import { Organization } from '../types';
import { SolianApiClient } from '../api/client';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  currentOrg: Organization;
  activeModule: string;
  setActiveModule: (module: string) => void;
  refreshOrg: () => Promise<void>;
  isMobileNavOpen: boolean;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
}

const defaultOrg: Organization = {
  id: 'org-solian-wolves',
  name: 'Solian Wolves',
  code: 'SLN-WLV',
  tagline: 'Organizational Intelligence & High-Trust Autonomous Operations',
  mission: 'To orchestrate enterprise operations with supreme discipline, intelligence, and autonomous precision.',
  tier: 'enterprise',
  totalMembers: 28,
};

const OrganizationContext = createContext<OrganizationContextType>({
  currentOrg: defaultOrg,
  activeModule: 'dashboard',
  setActiveModule: () => {},
  refreshOrg: async () => {},
  isMobileNavOpen: false,
  toggleMobileNav: () => {},
  closeMobileNav: () => {},
});

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization>(defaultOrg);
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  const refreshOrg = async () => {
    try {
      const org = await SolianApiClient.getOrganizationProfile();
      if (org) setCurrentOrg(org);
    } catch {}
  };

  useEffect(() => {
    refreshOrg();
  }, [user.userId, user.role]);

  const toggleMobileNav = () => setIsMobileNavOpen((prev) => !prev);
  const closeMobileNav = () => setIsMobileNavOpen(false);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        activeModule,
        setActiveModule,
        refreshOrg,
        isMobileNavOpen,
        toggleMobileNav,
        closeMobileNav,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);
