import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/components/i18n-provider';

describe('I18nProvider', () => {
  it('renders loading state initially', () => {
    render(
      <I18nProvider>
        <div data-testid="child" />
      </I18nProvider>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
