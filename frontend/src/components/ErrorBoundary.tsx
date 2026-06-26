import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-sand-50">
          <div className="bg-white rounded-xl border border-sand-100 p-8 max-w-md text-center space-y-4">
            <h1 className="text-xl font-semibold text-red-600">Something went wrong</h1>
            <p className="text-slate-600 text-sm">{this.state.error?.message || "An unexpected error occurred."}</p>
            <button
              className="bg-sage-500 text-white px-4 py-2 rounded"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
