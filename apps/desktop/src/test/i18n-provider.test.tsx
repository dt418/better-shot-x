import { describe, expect, it } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { I18nProvider } from '@/components/i18n-provider';

describe('I18nProvider', () => {
  it('renders children after loading', async () => {
    await act(async () => {
      render(
        <I18nProvider>
          <div data-testid="child" />
        </I18nProvider>,
      );
    });
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
