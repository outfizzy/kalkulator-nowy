import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    currentUser: User | null;
    login: (email: string, password?: string) => Promise<{ error: any }>;
    verifyOtp: (email: string, token: string) => Promise<{ error: any }>;
    register: (data: { email: string; password?: string; firstName: string; lastName: string; phone: string; role: UserRole }) => Promise<{ error: any }>;
    logout: () => Promise<void>;
    isAdmin: () => boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email!);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email!);
            } else {
                setCurrentUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string, email: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            if (data) {
                const profile: User = {
                    id: data.id,
                    username: email.split('@')[0], // Fallback username
                    firstName: data.full_name?.split(' ')[0] || '',
                    lastName: data.full_name?.split(' ').slice(1).join(' ') || '',
                    email: email,
                    role: (['admin', 'sales_rep', 'manager', 'partner'].includes(data.role) ? data.role : 'sales_rep') as UserRole,
                    createdAt: new Date(data.created_at),
                    phone: data.phone,
                    monthlyTarget: data.monthly_target,
                    status: data.status as 'pending' | 'active' | 'blocked',
                    companyName: data.company_name || undefined,
                    nip: data.nip || undefined,
                    partnerMargin: typeof data.partner_margin === 'number' ? data.partner_margin : undefined
                };

                // Block non-active users
                if (profile.status === 'pending') {
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                    throw new Error('Twoje konto oczekuje na zatwierdzenie przez administratora');
                }

                if (profile.status === 'blocked') {
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                    throw new Error('Twoje konto zostało zablokowane. Skontaktuj się z administratorem');
                }

                setCurrentUser(profile);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setCurrentUser(null);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password?: string): Promise<{ error: any }> => {
        if (!password) {
            return { error: { message: 'Hasło jest wymagane' } };
        }

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        return { error };
    };

    const verifyOtp = async (email: string, token: string): Promise<{ error: any }> => {
        const { error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email'
        });
        return { error };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    const isAdmin = (): boolean => {
        return currentUser?.role === 'admin';
    };

    const register = async (data: { email: string; password?: string; firstName: string; lastName: string; phone: string; role: UserRole }): Promise<{ error: any }> => {
        const { email, password, firstName, lastName, phone, role } = data;

        if (!password) {
            return { error: { message: 'Hasło jest wymagane do rejestracji' } };
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: `${firstName} ${lastName}`,
                    firstName,
                    lastName,
                    phone,
                    role,
                    companyName: (data as any).companyName,
                    nip: (data as any).nip
                }
            }
        });

        return { error };
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, verifyOtp, register, logout, isAdmin, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
