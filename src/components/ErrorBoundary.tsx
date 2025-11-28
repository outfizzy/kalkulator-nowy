import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
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
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full border border-red-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Wystąpił błąd</h2>
                                <p className="text-sm text-slate-500">Coś poszło nie tak</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-700 mb-4">
                            {this.state.error?.message || 'Nieznany błąd'}
                        </p>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-accent text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors font-medium"
                        >
                            Odśwież stronę
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
