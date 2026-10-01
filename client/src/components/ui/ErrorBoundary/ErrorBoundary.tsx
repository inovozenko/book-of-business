import {Component, type ReactNode} from 'react';

export interface ErrorBoundaryProps {
  /** Shown instead of the children once they throw while rendering. */
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/**
 * Keeps a rendering error in one part of the page from blanking the whole page.
 * React logs the error itself; remount the boundary to try the children again.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {failed: false};

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {failed: true};
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
