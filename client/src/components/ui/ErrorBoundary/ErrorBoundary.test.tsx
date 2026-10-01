import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {render, screen} from '@testing-library/react';

import {ErrorBoundary} from './ErrorBoundary.tsx';

function Broken(): never {
  throw new Error('Render failed');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React reports caught render errors to the console; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders its children', () => {
    render(<ErrorBoundary fallback={<p>Fallback</p>}>Content</ErrorBoundary>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows the fallback when a child throws', () => {
    render(
      <ErrorBoundary fallback={<p>Fallback</p>}>
        <Broken />
      </ErrorBoundary>
    );
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });
});
