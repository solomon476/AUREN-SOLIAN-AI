import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { OrganizationProvider } from '../context/OrganizationContext';
import { BrandLogo } from '../components/layout/BrandLogo';
import { Topbar } from '../components/layout/Topbar';
import { KnowledgeVaultView } from './knowledge/KnowledgeVaultView';
import { TeamsView } from './teams/TeamsView';
import { OrganizationSettingsView } from './settings/OrganizationSettingsView';
import { ClientsView } from './clients/ClientsView';
import { WorkflowsView } from './workflows/WorkflowsView';
import { DocumentsView } from './documents/DocumentsView';

describe('AUREN SOLIAN Company Foundation Components', () => {
  it('renders BrandLogo with wolf emblem and organizational intelligence text', () => {
    render(<BrandLogo showText={true} size="md" />);
    expect(screen.getByText(/AUREN/i)).toBeDefined();
    expect(screen.getByText(/SOLIAN/i)).toBeDefined();
    expect(screen.getByText(/Organizational Intelligence/i)).toBeDefined();
    const emblem = screen.getByAltText(/Solian Wolves Emblem/i);
    expect(emblem).toBeDefined();
  });

  it('renders Topbar with DEV SIMULATION badge and identity selector', async () => {
    render(
      <AuthProvider>
        <OrganizationProvider>
          <Topbar />
        </OrganizationProvider>
      </AuthProvider>
    );
    expect(screen.getByText(/DEV SIMULATION/i)).toBeDefined();
    expect(screen.getByText(/Dev Identity/i)).toBeDefined();
  });

  it('renders KnowledgeVaultView with institutional categories and semantic search', async () => {
    render(
      <AuthProvider>
        <OrganizationProvider>
          <KnowledgeVaultView />
        </OrganizationProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Institutional Knowledge Vault/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Semantic search across verified company SOPs/i)).toBeDefined();
    expect(screen.getByText('SOP')).toBeDefined();
    expect(screen.getByText('Compliance')).toBeDefined();
    expect(screen.getByText('Architecture')).toBeDefined();
  });

  it('renders TeamsView with Staff Directory, Departments & Teams, and Hierarchy tabs', async () => {
    render(
      <AuthProvider>
        <OrganizationProvider>
          <TeamsView />
        </OrganizationProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Organization Structure & Staff Directory/i)).toBeDefined();
    expect(screen.getByText(/Staff & Member Directory/i)).toBeDefined();
    expect(screen.getByText(/Departments & Teams/i)).toBeDefined();
    expect(screen.getByText(/Organizational Hierarchy Tree/i)).toBeDefined();
  });

  it('renders OrganizationSettingsView with enterprise profile and RBAC matrix', async () => {
    render(
      <AuthProvider>
        <OrganizationProvider>
          <OrganizationSettingsView />
        </OrganizationProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Organization Identity & Governance/i)).toBeDefined();
    expect(screen.getByText(/Enterprise Profile & Identity/i)).toBeDefined();
    expect(screen.getByText(/Role-Based Access Control \(RBAC\) Governance Matrix/i)).toBeDefined();
  });

  it('renders ClientsView with CRM accounts and creation capability', async () => {
    render(
      <AuthProvider>
        <OrganizationProvider>
          <ClientsView />
        </OrganizationProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Client Accounts & Enterprise CRM/i)).toBeDefined();
    expect(screen.getByText(/Add Enterprise Account/i)).toBeDefined();
  });

  it('renders WorkflowsView with decision triggers and pipeline deployment', async () => {
    render(
      <AuthProvider>
        <OrganizationProvider>
          <WorkflowsView />
        </OrganizationProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Automated Workflows & Decision Triggers/i)).toBeDefined();
    expect(screen.getByText(/New Automation Pipeline/i)).toBeDefined();
  });

  it('renders DocumentsView with encrypted repository and clearance badge', async () => {
    render(
      <AuthProvider>
        <OrganizationProvider>
          <DocumentsView />
        </OrganizationProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Corporate Document Repository/i)).toBeDefined();
    expect(screen.getByText(/Tier/i)).toBeDefined();
  });

  it('renders AuthModal with Sign In, Register and Recovery tabs when opened', async () => {
    const { AuthModal } = await import('../components/auth/AuthModal');
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={() => {}} />
      </AuthProvider>
    );

    expect(screen.getByText(/Solian Wolves Executive Access/i)).toBeDefined();
    expect(screen.getByText(/Corporate Email/i)).toBeDefined();
    expect(screen.getByText(/Authenticate Session/i)).toBeDefined();
    expect(screen.getByText(/Recovery/i)).toBeDefined();
  });
});


