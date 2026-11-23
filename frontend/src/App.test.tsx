import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('AUREN SOLIAN Enterprise Frontend', () => {
  it('renders the AUREN SOLIAN brand name and company command center', async () => {
    render(<App />);
    expect(screen.getAllByText(/AUREN/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SOLIAN/i).length).toBeGreaterThan(0);
    const commandCenterElements = await screen.findAllByText(/Company Command Center/i);
    expect(commandCenterElements.length).toBeGreaterThan(0);
  });

  it('renders primary navigation items for Solian Wolves platform foundation', () => {
    render(<App />);
    expect(screen.getByText(/Company AI Assistant/i)).toBeDefined();
    expect(screen.getByText(/Knowledge Vault/i)).toBeDefined();
    expect(screen.getByText(/Staff & Team Directory/i)).toBeDefined();
    expect(screen.getByText(/Tasks & Operations/i)).toBeDefined();
  });
});
