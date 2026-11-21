import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('AUREN SOLIAN Enterprise Frontend', () => {
  it('renders the AUREN SOLIAN brand name and executive hub', async () => {
    render(<App />);
    expect(screen.getAllByText(/AUREN/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SOLIAN/i).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Executive Command & Operations/i)).toBeDefined();
  });

  it('renders primary navigation items for company platform foundation', () => {
    render(<App />);
    expect(screen.getByText(/Company AI Assistant/i)).toBeDefined();
    expect(screen.getByText(/Knowledge Vault/i)).toBeDefined();
    expect(screen.getByText(/Staff & Team Directory/i)).toBeDefined();
    expect(screen.getByText(/Tasks & Operations/i)).toBeDefined();
  });
});
