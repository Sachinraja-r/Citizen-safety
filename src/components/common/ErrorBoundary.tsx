import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = '/app';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] flex items-center justify-center p-6 text-center animate-fade-in">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-[#2D1B24]">
                {this.props.fallbackTitle || 'Telemetry View Notice'}
              </h2>
              <p className="text-xs text-[#7A6570] leading-relaxed">
                {this.state.error?.message || 'An unexpected display issue occurred while rendering this view.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReload}
                leftIcon={<RefreshCw className="w-4 h-4" />}
                className="flex-1"
              >
                Reload View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleGoHome}
                leftIcon={<Home className="w-4 h-4" />}
                className="flex-1"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
