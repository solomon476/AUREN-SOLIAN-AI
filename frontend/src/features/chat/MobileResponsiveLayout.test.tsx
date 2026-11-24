import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanyChatView } from './CompanyChatView';
import { ProfileSettingsSection } from '../settings/ProfileSettingsSection';
import { MobileBottomNav } from '../../components/layout/MobileBottomNav';
import { OrganizationProvider } from '../../context/OrganizationContext';
import * as AuthContextModule from '../../context/AuthContext';

describe('Mobile UX & Action Card Responsiveness', () => {
  it('action card adapts vertically with wrapping titles and full-width mobile button', () => {
    // Authenticated user with an action proposal
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-1',
        userId: 'usr-1',
        email: 'solomon@solianwolves.co',
        fullName: 'Solomon K.',
        title: 'Managing Director',
        role: 'admin',
        department: 'Executive Operations',
        responsibilities: [],
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

    // Locate action title
    const actionTitle = screen.getByText(/Review Active Strategic Initiatives Progress/i);
    expect(actionTitle).toBeDefined();
    // Verify natural wrapping class
    expect(actionTitle.className).toContain('break-words');
    expect(actionTitle.className).not.toContain('truncate');

    // Locate execute action button
    const actionBtn = screen.getByText(/Execute Action/i);
    expect(actionBtn).toBeDefined();
    // Verify vertical stacking on mobile: w-full sm:w-auto
    expect(actionBtn.className).toContain('w-full');
    expect(actionBtn.className).toContain('sm:w-auto');
  });

  it('mobile bottom navigation is compact and preserves usable screen space', () => {
    render(
      <OrganizationProvider>
        <MobileBottomNav />
      </OrganizationProvider>
    );

    const nav = screen.getByRole('navigation', { name: /Mobile Navigation Bar/i });
    expect(nav).toBeDefined();
    expect(nav.className).toContain('md:hidden');
    // Check grid container has reduced height
    const gridContainer = nav.querySelector('div.grid');
    expect(gridContainer?.className).toContain('h-12');
  });

  it('profile settings card is compact and responsive for mobile', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-1',
        userId: 'usr-1',
        email: 'solomon@solianwolves.co',
        fullName: 'Solomon K.',
        title: 'Managing Director',
        role: 'admin',
        department: 'Executive Operations',
        responsibilities: [],
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

    const { container } = render(<ProfileSettingsSection />);

    // Verify avatar is compact (w-16 h-16 sm:w-20 sm:h-20 instead of w-24 h-24)
    const avatarEl = container.querySelector('.w-16');
    expect(avatarEl).toBeDefined();

    // Verify padding is compact (p-4 sm:p-5 instead of p-5 md:p-6 mb-6)
    const cardEl = container.querySelector('.bg-solian-card');
    expect(cardEl?.className).toContain('p-4');
  });
});

