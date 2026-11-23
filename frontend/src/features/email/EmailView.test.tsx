import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import { OrganizationProvider } from '../../context/OrganizationContext';
import { EmailView } from './EmailView';
import { SolianApiClient } from '../../api/client';

describe('EmailView Component', () => {
  it('renders EmailView with folders and honest provider status', async () => {
    vi.spyOn(SolianApiClient, 'getEmailStatus').mockResolvedValue({
      provider_type: 'none',
      is_connected: false,
      account_email: null,
      sender_name: 'Solian Wolves',
      status_message: 'No external email provider configured.',
      supported_features: ['drafts', 'ai_assistance'],
      required_configs: ['SMTP: SMTP_HOST'],
    });

    vi.spyOn(SolianApiClient, 'getEmailMessages').mockResolvedValue({
      folder: 'inbox',
      messages: [],
      total: 0,
      pageSize: 20,
      page: 1,
      providerStatus: {
        provider_type: 'none',
        is_connected: false,
        status_message: 'No external email provider configured.',
        supported_features: [],
        required_configs: [],
      },
    });

    render(
      <AuthProvider>
        <OrganizationProvider>
          <EmailView />
        </OrganizationProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Email & Communications/i)).toBeDefined();
    expect(screen.getByText('Inbox')).toBeDefined();
    expect(screen.getByText('Sent')).toBeDefined();
    expect(screen.getByText('Drafts')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/No Provider \(Draft Mode\)/i)).toBeDefined();
    });
  });

  it('switches to drafts folder when clicked', async () => {
    vi.spyOn(SolianApiClient, 'getEmailDrafts').mockResolvedValue([
      {
        id: 'drf-1',
        user_id: 'usr-1',
        organization_id: 'org-solian-wolves',
        to_addresses: ['test@example.com'],
        subject: 'Draft Strategy Review',
        body: 'Please review our draft strategy.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    render(
      <AuthProvider>
        <OrganizationProvider>
          <EmailView />
        </OrganizationProvider>
      </AuthProvider>
    );

    const draftsButton = screen.getByText('Drafts');
    fireEvent.click(draftsButton);

    await waitFor(() => {
      expect(screen.getByText('Draft Strategy Review')).toBeDefined();
    });
  });

  it('opens compose modal when Compose button is clicked', async () => {
    render(
      <AuthProvider>
        <OrganizationProvider>
          <EmailView />
        </OrganizationProvider>
      </AuthProvider>
    );

    const composeBtn = screen.getByRole('button', { name: /compose/i });
    fireEvent.click(composeBtn);

    expect(screen.getByText(/New Company Communication/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/recipients@example.com/i)).toBeDefined();
  });
});
