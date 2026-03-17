
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

import { supabase } from '../../lib/supabase';

interface VoiceConfirmationButtonProps {
    leadId: string | undefined;
    customerName: string;
    phoneNumber: string;
    installationDate: string | Date; // Date object or ISO string
    installationId: string;
    customerId: string;
    onSuccess?: () => void;
}

export const VoiceConfirmationButton: React.FC<VoiceConfirmationButtonProps> = ({
    leadId,
    customerName,
    phoneNumber,
    installationDate,
    installationId,
    customerId,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    React.useEffect(() => {
        const channel = supabase
            .channel(`voice-btn-${installationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'installations',
                    filter: `id=eq.${installationId}`
                },
                (payload) => {
                    if (payload.new.status === 'scheduled') {
                        setConfirmed(true);
                        setLoading(false);
                        if (onSuccess) onSuccess();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [installationId, onSuccess]);

    const handleCall = async () => {
        if (!phoneNumber) {
            toast.error('Brak numeru telefonu');
            return;
        }

        if (!confirm(`Czy na pewno chcesz, aby AI zadzwoniło do klienta ${customerName} w celu potwierdzenia montażu?`)) {
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Inicjowanie połączenia AI...');

        try {
            const { data, error } = await supabase.functions.invoke('vapi-make-call', {
                body: {
                    phoneNumber,
                    customerName,
                    installationDate: installationDate instanceof Date ? installationDate.toISOString() : new Date(installationDate).toISOString(),
                    // Pass leadId if available, or just standard metadata
                    leadId,
                    installationId,
                    customerId
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(`Server: ${data.error} ${data.details ? JSON.stringify(data.details) : ''}`);

            toast.success('AI dzwoni do klienta! 🤖📞', { id: toastId });

        } catch (error: any) {
            console.error('Voice Call Error:', error);
            toast.error(`Błąd: ${error.message || 'Nie udało się połączyć'}`, { id: toastId });
            setLoading(false);
        }
    };

    if (confirmed) {
        return (
            <button
                disabled
                className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm bg-green-100 text-green-700 cursor-default border border-green-200"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Potwierdzono (AI)
            </button>
        );
    }

    return (
        <button
            onClick={handleCall}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm
                ${loading
                    ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                }`}
            title="Asystent AI zadzwoni do klienta i potwierdzi termin"
        >
            {loading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            )}
            {loading ? 'Dzwonię...' : 'Potwierdź (AI)'}
        </button>
    );
};
