import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanyChatView } from './CompanyChatView';
import { OrganizationProvider } from '../../context/OrganizationContext';
import * as AuthContextModule from '../../context/AuthContext';

describe('CompanyChatView Security & Guest Isolation', () => {
  it('renders visitor mode welcome without internal SOPs, memory sources, or action proposals for guests', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'guest',
        userId: 'usr-guest',
        email: '',
        fullName: 'Visitor',
        title: 'Public Access',
        role: 'guest',
        department: '',
        responsibilities: [],
        reportsTo: null,
      },
      availableUsers: [],
      switchUser: vi.fn(),
      updateUserProfile: vi.fn(),
      setRole: vi.fn(),
      hasRole: vi.fn().mockReturnValue(false),
      isAuthenticated: false,
      authMode: 'DEVELOPMENT_SIMULATION',
      isDevSimulation: true,
      isSupabaseConfigured: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      setCorporateSession: vi.fn(),
    });

    render(
      <OrganizationProvider>
        <CompanyChatView />
      </OrganizationProvider>
    );

    // 1. Visitor Mode badge and greeting must be visible
    expect(screen.getAllByText(/Visitor Mode/i).length).toBeGreaterThanOrEqual(1);

    // 2. Greeting must NOT leak internal institutional SOPs, policies, or matrices
    const textContent = document.body.textContent || '';
    expect(textContent).not.toContain('SOP-401');
    expect(textContent).not.toContain('POL-202');
    expect(textContent).not.toContain('Institutional Memory');
    expect(textContent).not.toContain('Active Strategic Initiatives Matrix');

    // 3. No action proposals or execute action button for visitors
    expect(screen.queryByText(/EXECUTE ACTION/i)).toBeNull();
    expect(screen.queryByText(/Execute Action/i)).toBeNull();

    // 4. Guest quick prompts must be public-oriented
    expect(screen.getByText(/What is Solian Wolves\?/i)).toBeDefined();
    expect(screen.queryByText(/Review SOP-401/i)).toBeNull();

    // 5. Chat input placeholder must indicate public access
    const inputEl = screen.getByPlaceholderText(/Ask AUREN SOLIAN a public question\.\.\./i);
    expect(inputEl).toBeDefined();
  });

  it('renders corporate intelligence greeting, context chips, and action proposals for authenticated personnel', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-1',
        userId: 'usr-1',
        email: 'solomon@solianwolves.co',
        fullName: 'Solomon K.',
        title: 'Managing Director',
        role: 'admin',
        department: 'Executive Operations',
        responsibilities: ['Strategic Direction'],
        reportsTo: null,
      },
      availableUsers: [],
      switchUser: vi.fn(),
      updateUserProfile: vi.fn(),
      setRole: vi.fn(),
      hasRole: vi.fn().mockReturnValue(true),
      isAuthenticated: true,
      authMode: 'SUPABASE_JWT',
      isDevSimulation: false,
      isSupabaseConfigured: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      setCorporateSession: vi.fn(),
    });

    render(
      <OrganizationProvider>
        <CompanyChatView />
      </OrganizationProvider>
    );

    // 1. Authenticated greeting with employee name
    expect(screen.getByText(/Good day, Solomon K\./i)).toBeDefined();

    // 2. Memory context sources are rendered
    expect(screen.getByText(/Memory:/i)).toBeDefined();

    // 3. Action proposal with responsive Execute Action button is rendered
    expect(screen.getByText(/Review Active Strategic Initiatives Progress/i)).toBeDefined();
    expect(screen.getByText(/Execute Action/i)).toBeDefined();
  });
});
