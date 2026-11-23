import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar Component', () => {
  it('renders initials correctly from full name', () => {
    render(<UserAvatar name="Ian Momanyi Nyakundi" />);
    expect(screen.getByText('IN')).toBeDefined();
  });

  it('strips [DEMO] prefix before generating initials', () => {
    render(<UserAvatar name="[DEMO] Sarah Chen" />);
    expect(screen.getByText('SC')).toBeDefined();
  });

  it('renders single word name initials', () => {
    render(<UserAvatar name="Solian" />);
    expect(screen.getByText('SO')).toBeDefined();
  });

  it('renders image element when avatarUrl is provided', () => {
    render(
      <UserAvatar
        name="Ian Momanyi Nyakundi"
        avatarUrl="/api/v1/auth/avatar/avatar_usr-1.webp"
      />
    );
    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('alt')).toBe('Profile of Ian Momanyi Nyakundi');
  });

  it('falls back gracefully to initials when image loading errors', () => {
    render(
      <UserAvatar
        name="Hillary Onchwati"
        avatarUrl="/api/v1/auth/avatar/broken_image.webp"
      />
    );
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByText('HO')).toBeDefined();
  });

  it('renders default user icon when name and image are absent', () => {
    const { container } = render(<UserAvatar />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg).not.toBeNull();
  });
});
