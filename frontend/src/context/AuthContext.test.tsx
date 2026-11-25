import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { SolianApiClient } from '../api/client';

const AuthProbe: React.FC = () => {
  const { user, isAuthenticated, authMode, signIn, signOut } = useAuth();
  const [lastError, setLastError] = React.useState<string | null>(null);

  return (
    <div>
      <span data-testid="role">{user.role}</span>
      <span data-testid="name">{user.fullName}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="mode">{authMode}</span>
      <span data-testid="error">{lastError || ''}</span>
      <button
        onClick={async () => {
          const res = await signIn('ian.nyakundi@solianwolves.co', 'TestPass123!');
          setLastError(res.error || null);
        }}
      >
        SignIn
      </button>
      <button onClick={() => signOut()}>SignOut</button>
    </div>
  );
};

describe('AuthContext Session Lifecycle & Transitions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    SolianApiClient.setAuthToken(null);
  });

  it('clears expired/invalid stored token and reverts cleanly instead of leaving guest marked authenticated', async () => {
    localStorage.setItem('solian_corporate_session_token', 'expired.jwt.token');
    vi.spyOn(SolianApiClient, 'getCurrentUserProfile').mockRejectedValue(
      new Error('Authentication token has expired.')
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(localStorage.getItem('solian_corporate_session_token')).toBeNull();
      expect(SolianApiClient.getAuthToken()).toBeNull();
    });
  });

  it('transitions from current user to verified owner on corporate signIn, persists token, and clears on signOut', async () => {
    vi.spyOn(SolianApiClient, 'getAvailableUsers').mockResolvedValue([]);
    vi.spyOn(SolianApiClient, 'corporateLogin').mockResolvedValue({
      success: true,
      accessToken: 'valid.owner.jwt',
    });
    vi.spyOn(SolianApiClient, 'getCurrentUserProfile').mockResolvedValue({
      id: 'tm-1',
      userId: 'usr-1',
      email: 'ian.nyakundi@solianwolves.co',
      fullName: 'Ian Momanyi Nyakundi',
      title: 'Chief Executive Officer',
      role: 'owner',
      department: 'Executive Leadership & Governance',
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('SignIn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('role').textContent).toBe('owner');
      expect(screen.getByTestId('name').textContent).toBe('Ian Momanyi Nyakundi');
      expect(screen.getByTestId('authed').textContent).toBe('true');
      expect(screen.getByTestId('mode').textContent).toBe('SUPABASE_JWT');
      expect(localStorage.getItem('solian_corporate_session_token')).toBe('valid.owner.jwt');
    });

    await act(async () => {
      screen.getByText('SignOut').click();
    });

    await waitFor(() => {
      expect(localStorage.getItem('solian_corporate_session_token')).toBeNull();
      expect(SolianApiClient.getAuthToken()).toBeNull();
    });
  });
});

