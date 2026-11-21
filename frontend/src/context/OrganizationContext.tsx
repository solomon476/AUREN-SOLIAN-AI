import React, { createContext, useContext, useState } from 'react';
import { Organization } from '../types';

interface OrganizationContextType {
  currentOrg: Organization;
  activeModule: string;
  setActiveModule: (module: string) => void;
}

const defaultOrg: Organization = {
  id: 'org-solian-corp',
  name: 'Solian Enterprise Group',
  code: 'SLN-HQ',
  tagline: 'Organizational Intelligence & High-Trust Autonomous Operations',
  tier: 'enterprise',
  totalMembers: 28,
};

const OrganizationContext = createContext<OrganizationContextType>({
  currentOrg: defaultOrg,
  activeModule: 'dashboard',
  setActiveModule: () => {},
});

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentOrg] = useState<Organization>(defaultOrg);
  const [activeModule, setActiveModule] = useState<string>('dashboard');

  return (
    <OrganizationContext.Provider value={{ currentOrg, activeModule, setActiveModule }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);

