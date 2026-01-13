import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { ErrorReportService } from '../services/database/error-report.service';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    isReporting: boolean;
    reportSent: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
        isReporting: false,
        reportSent: false
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleSendReport = async () => {
        if (!this.state.error) return;

        this.setState({ isReporting: true });
        try {
            await ErrorReportService.createReport(
                this.state.error,
                this.state.errorInfo?.componentStack
            );
            this.setState({ reportSent: true });
            toast.success('Raport został wysłany. Dziękujemy!');
        } catch (e) {
            console.error(e);
            toast.error('Nie udało się wysłać raportu.');
        } finally {
            this.setState({ isReporting: false });
        }
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
                    <div className="bg-white rounded-xl shadow-xl p-8 max-w-lg w-full border border-slate-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Wystąpił nieoczekiwany błąd</h2>
                                <p className="text-sm text-slate-500 mt-1">Przepraszamy za utrudnienia.</p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
                            <p className="text-sm text-red-800 font-mono break-words">
                                {this.state.error?.message || 'Nieznany błąd'}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {!this.state.reportSent ? (
                                <button
                                    onClick={this.handleSendReport}
                                    disabled={this.state.isReporting}
                                    className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg hover:bg-slate-900 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    {this.state.isReporting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Wysyłanie raportu...
                                        </>
                                    ) : (
                                        'Wyślij Raport do Administratora'
                                    )}
                                </button>
                            ) : (
                                <div className="w-full bg-green-50 text-green-700 px-4 py-3 rounded-lg border border-green-100 text-center font-medium">
                                    ✓ Raport wysłany pomyślnie
                                </div>
                            )}

                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-white text-slate-700 border border-slate-300 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Odśwież stronę
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
