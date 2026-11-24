import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileSettingsSection } from './ProfileSettingsSection';
import * as AuthContextModule from '../../context/AuthContext';

describe('ProfileSettingsSection Guest Isolation & Mobile UX', () => {
  it('renders visitor sign-in gate and denies upload controls for unauthenticated visitors', () => {
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

    render(<ProfileSettingsSection />);

    // 1. Visitor Mode banner
    expect(screen.getByText(/Visitor Mode/i)).toBeDefined();
    expect(screen.getByText(/Public Visitor Session/i)).toBeDefined();

    // 2. Clear guidance that corporate account is required
    expect(screen.getByText(/Personal profile picture management and staff directory personalization require an authenticated corporate account\./i)).toBeDefined();

    // 3. Sign in CTA button is present
    expect(screen.getByText(/Sign In to Corporate Account/i)).toBeDefined();

    // 4. File input and upload photo buttons must NOT be present for guest
    expect(screen.queryByText(/Upload Photo/i)).toBeNull();
    expect(screen.queryByTitle(/Upload new image/i)).toBeNull();
  });

  it('renders photo upload controls and avatar for authenticated corporate personnel', () => {
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

    render(<ProfileSettingsSection />);

    expect(screen.getAllByText(/Personal Profile Picture/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Solomon K\./i)).toBeDefined();
    expect(screen.getByText(/Upload Photo/i)).toBeDefined();
    expect(screen.getByTitle(/Upload new image/i)).toBeDefined();
  });
});
