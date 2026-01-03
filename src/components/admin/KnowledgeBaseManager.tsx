import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface KnowledgeDoc {
    id: string;
    filename: string;
    file_path: string;
    status: 'pending' | 'processing' | 'processed' | 'error';
    error_message?: string;
    created_at: string;
}

export const KnowledgeBaseManager: React.FC = () => {
    const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchDocs();
    }, []);

    const fetchDocs = async () => {
        const { data, error } = await supabase
            .from('knowledge_docs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching docs:', error);
            toast.error('Błąd pobierania dokumentów');
        } else {
            setDocs(data || []);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            setUploading(true);
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `docs/${fileName}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('knowledge-base')
                .upload(filePath, file);

            if (uploadError) {
                // Determine if bucket missing
                if (uploadError.message.includes('Bucket not found')) {
                    toast.error('Błąd: Bucket "knowledge-base" nie istnieje. Utwórz go w Supabase Dashboard lub poczekaj na administratora.');
                }
                throw uploadError;
            }

            // 2. Create DB Entry
            const { data: docData, error: dbError } = await supabase
                .from('knowledge_docs')
                .insert({
                    filename: file.name,
                    file_path: filePath,
                    file_size: file.size,
                    content_type: file.type,
                    status: 'pending'
                })
                .select()
                .single();

            if (dbError) throw dbError;

            toast.success('Plik wgrany. Rozpoczynam przetwarzanie AI...');
            fetchDocs();

            // 3. Trigger Edge Function
            const { error: funcError } = await supabase.functions.invoke('process-knowledge-pdf', {
                body: { doc_id: docData.id }
            });

            if (funcError) {
                toast.error('Błąd uruchamiania AI: ' + funcError.message);
            } else {
                toast.success('AI przetwarza dokument w tle...');
            }

        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error('Błąd wgrywania: ' + error.message);
        } finally {
            setUploading(false);
            // Refresh after a delay to see status change
            setTimeout(fetchDocs, 2000);
        }
    };

    const handleDelete = async (id: string, path: string) => {
        if (!confirm('Czy na pewno chcesz usunąć ten dokument i jego wiedzę?')) return;

        try {
            // Cleanup storage
            await supabase.storage.from('knowledge-base').remove([path]);
            // Table cleanup handles chunks cascade
            await supabase.from('knowledge_docs').delete().eq('id', id);

            toast.success('Dokument usunięty');
            fetchDocs();
        } catch (e: any) {
            toast.error('Błąd usuwania: ' + e.message);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Baza Wiedzy Technicznej (AI)</h1>
                    <p className="text-slate-500">Wgraj instrukcje i karty katalogowe, aby AI mogło z nich korzystać.</p>
                </div>
                <button onClick={fetchDocs} className="p-2 hover:bg-slate-100 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-slate-600" />
                </button>
            </div>

            {/* Upload Area */}
            <div className="mb-8">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-slate-400" />
                        <p className="mb-2 text-sm text-slate-500">
                            <span className="font-semibold">Kliknij, aby wgrać PDF</span>
                        </p>
                        <p className="text-xs text-slate-500">PDF (MAX. 10MB)</p>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="application/pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                </label>
                {uploading && <p className="text-center text-blue-600 mt-2">Wgrywanie i analiza...</p>}
            </div>

            {/* Docs List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dokument</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status AI</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {docs.map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <FileText className="w-5 h-5 text-slate-400 mr-3" />
                                        <span className="text-sm font-medium text-slate-900">{doc.filename}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        {doc.status === 'processed' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Gotowy
                                            </span>
                                        )}
                                        {doc.status === 'processing' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Przetwarzanie
                                            </span>
                                        )}
                                        {doc.status === 'pending' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                Oczekuje
                                            </span>
                                        )}
                                        {doc.status === 'error' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={doc.error_message}>
                                                <AlertCircle className="w-3 h-3 mr-1" /> Błąd
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {new Date(doc.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(doc.id, doc.file_path)}
                                        className="text-red-600 hover:text-red-900 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {docs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                    Brak dokumentów. Wgraj pierwszy plik PDF.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
