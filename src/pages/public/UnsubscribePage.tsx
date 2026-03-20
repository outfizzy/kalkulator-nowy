import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const UnsubscribePage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already'>('loading');
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            return;
        }
        handleUnsubscribe();
    }, [token]);

    const handleUnsubscribe = async () => {
        try {
            const { data, error } = await supabase.rpc('handle_unsubscribe', {
                p_token: token
            });

            if (error) throw error;

            const result = data as any;
            if (result?.success) {
                setEmail(result.email || '');
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch (err) {
            console.error('Unsubscribe error:', err);
            setStatus('error');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
            <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
                padding: '50px 40px',
                maxWidth: '480px',
                width: '100%',
                textAlign: 'center'
            }}>
                {/* Logo */}
                <div style={{ marginBottom: '30px' }}>
                    <img 
                        src="https://polendach24.de/wp-content/uploads/2024/12/0-logo-sonnenschutz24_strona-1-300x127.webp" 
                        alt="Sonnenschutz24" 
                        style={{ height: '50px', objectFit: 'contain' }}
                    />
                </div>

                {status === 'loading' && (
                    <>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>
                            Verarbeitung...
                        </h1>
                        <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6 }}>
                            Bitte warten Sie einen Moment.
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>
                            Erfolgreich abgemeldet
                        </h1>
                        <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, margin: '0 0 25px' }}>
                            {email && <span style={{ fontWeight: 600, color: '#334155' }}>{email}</span>}
                            <br />
                            Sie erhalten keine weiteren Marketing-E-Mails von uns.
                        </p>
                        <div style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '20px'
                        }}>
                            <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>
                                Wichtige E-Mails zu bestehenden Aufträgen und Serviceanfragen erhalten Sie weiterhin.
                            </p>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>
                            Link ungültig
                        </h1>
                        <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6 }}>
                            Dieser Abmeldelink ist ungültig oder bereits verwendet worden.
                            <br /><br />
                            Kontaktieren Sie uns direkt: <a href="mailto:buero@polendach24.de" style={{ color: '#2563eb' }}>buero@polendach24.de</a>
                        </p>
                    </>
                )}

                {/* Footer */}
                <div style={{ marginTop: '35px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
                    <a 
                        href="https://polendach24.de" 
                        style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'none' }}
                    >
                        polendach24.de
                    </a>
                </div>
            </div>
        </div>
    );
};

export default UnsubscribePage;
