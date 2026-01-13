import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ErrorReportService, ErrorReport } from '../../services/database/error-report.service';

const ErrorDetailModal: React.FC<{ report: ErrorReport; onClose: () => void }> = ({ report, onClose }) => {

    // Function to format error for AI Chat (User Request)
    const copyForAI = () => {
        const content = `
### Error Report
**Message**: ${report.error_message}
**URL**: ${report.url}
**User**: ${report.users?.full_name} (${report.users?.email})
**Browser**: ${report.user_agent}

### Stack Trace
\`\`\`
${report.error_stack}
\`\`\`

### Component Stack
\`\`\`
${report.component_stack}
\`\`\`
`;
        navigator.clipboard.writeText(content);
        toast.success('Skopiowano treść do schowka!');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-lg text-red-600 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Szczegóły Błędu
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Użytkownik</span>
                            <div className="font-medium text-slate-800">{report.users?.full_name}</div>
                            <div className="text-slate-500">{report.users?.email}</div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Kontekst</span>
                            <div className="truncate text-slate-800" title={report.url}>{report.url}</div>
                            <div className="text-slate-400 text-xs mt-1 truncate" title={report.user_agent}>{report.user_agent}</div>
                        </div>
                    </div>

                    {/* Error Message */}
                    <div>
                        <h4 className="font-bold text-slate-700 mb-2">Treść Błędu</h4>
                        <div className="bg-red-50 border border-red-100 p-3 rounded font-mono text-red-800 text-sm">
                            {report.error_message}
                        </div>
                    </div>

                    {/* Stack Trace */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-slate-700">Stack Trace</h4>
                            <button
                                onClick={copyForAI}
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                Kopiuj dla Technika (AI)
                            </button>
                        </div>
                        <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed">
                            {report.error_stack || 'Brak stack trace'}
                        </pre>
                    </div>

                    {/* Component Stack */}
                    {report.component_stack && (
                        <div>
                            <h4 className="font-bold text-slate-700 mb-2">Komponenty (React Tree)</h4>
                            <pre className="bg-slate-100 text-slate-600 p-4 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed border border-slate-200">
                                {report.component_stack}
                            </pre>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 font-medium">
                        Zamknij
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ErrorReportsPage: React.FC = () => {
    const [reports, setReports] = useState<ErrorReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);

    const loadReports = async () => {
        setLoading(true);
        try {
            const data = await ErrorReportService.getReports();
            setReports(data);
        } catch (e) {
            console.error(e);
            toast.error('Błąd ładowania raportów');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const handleUpdateStatus = async (e: React.MouseEvent, report: ErrorReport, status: 'resolved' | 'ignored') => {
        e.stopPropagation();
        try {
            await ErrorReportService.updateStatus(report.id, status);
            toast.success('Status zaktualizowany');
            loadReports();
        } catch (err) {
            toast.error('Błąd aktualizacji');
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Raporty Błędów</h1>
                    <p className="text-slate-500">Centrum diagnostyki i zgłoszeń od użytkowników</p>
                </div>
                <button onClick={loadReports} className="p-2 text-slate-400 hover:text-accent transition-colors bg-white border rounded-lg">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </header>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Ładowanie raportów...</div>
            ) : reports.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-slate-500">Hurra! Brak zgłoszonych błędów 🎉</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Błąd</th>
                                <th className="px-6 py-4">Użytkownik</th>
                                <th className="px-6 py-4 text-right">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reports.map(report => (
                                <tr
                                    key={report.id}
                                    onClick={() => setSelectedReport(report)}
                                    className="group hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${report.status === 'new' ? 'bg-red-100 text-red-700' :
                                                report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                                    report.status === 'analyzed' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-600'
                                            }`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {new Date(report.created_at).toLocaleString('pl-PL')}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-700 max-w-md truncate">
                                        {report.error_message}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <div className="flex flex-col">
                                            <span>{report.users?.full_name || 'Nieznany'}</span>
                                            <span className="text-xs text-slate-400">{report.users?.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {report.status === 'new' && (
                                            <button
                                                onClick={(e) => handleUpdateStatus(e, report, 'resolved')}
                                                className="text-xs bg-white border border-green-200 text-green-600 hover:bg-green-50 px-2 py-1 rounded transition-colors mr-2"
                                            >
                                                Oznacz jako naprawione
                                            </button>
                                        )}
                                        <span className="text-slate-400 group-hover:text-accent transition-colors">➔</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedReport && (
                <ErrorDetailModal
                    report={selectedReport}
                    onClose={() => setSelectedReport(null)}
                />
            )}
        </div>
    );
};
