import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
          <div className="w-full max-w-lg p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
            <h2 className="text-xl font-bold text-rose-500 mb-2">Application Crash Intercepted</h2>
            <p className="text-sm text-slate-400 mb-6">
              A critical runtime error has occurred. Please reload the console or contact the engineering support desk.
            </p>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl mb-6 overflow-x-auto text-[11px] font-mono text-slate-300 max-h-40">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wider rounded-xl transition-all active:scale-[0.98]"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
