import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { supabase } from '../lib/supabase'; // Use shared client to avoid multiple GoTrueClient instances

interface AuthContextType {
    currentUser: User | null;
    login: (email: string, password?: string, captchaToken?: string) => Promise<{ error: any }>;
    verifyOtp: (email: string, token: string) => Promise<{ error: any }>;
    register: (data: { email: string; password?: string; firstName: string; lastName: string; phone: string; role: UserRole }) => Promise<{ error: any }>;
    logout: () => Promise<void>;
    isAdmin: () => boolean;
    hasPermission: (moduleKey: string) => boolean;
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
    const [permissions, setPermissions] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Safety timeout to prevent infinite loading (White Screen)
        const safetyTimer = setTimeout(() => {
            setLoading(prev => {
                if (prev) console.warn('Auth initialization timed out, forcing render.');
                return false;
            });
        }, 3000);

        const hasEnv = !!(import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL);
        if (!hasEnv) {
            console.warn('Supabase not configured (AuthContext). Bypassing auth check.');
            setLoading(false);
            return () => clearTimeout(safetyTimer);
        }

        try {
            // Check active session
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) {
                    fetchProfile(session.user.id, session.user.email!);
                } else {
                    setLoading(false);
                }
            }).catch(err => {
                console.warn('Auth session check failed:', err);
                setLoading(false);
            });

            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                if (session?.user) {
                    fetchProfile(session.user.id, session.user.email!);
                } else {
                    setCurrentUser(null);
                    setPermissions(new Set());
                    setLoading(false);
                }
            });

            return () => {
                subscription.unsubscribe();
                clearTimeout(safetyTimer);
            };
        } catch (e) {
            console.error('Critical Auth Init Error:', e);
            setLoading(false);
            clearTimeout(safetyTimer);
        }
    }, []);

    const fetchPermissions = async (role: string) => {
        // Basic role-based permissions (no DB dependency for now)
        const rolePermissions = new Set<string>();

        if (role === 'admin') {
            rolePermissions.add('*'); // Admin has all permissions
        } else if (role === 'manager') {
            rolePermissions.add('dashboard');
            rolePermissions.add('offers');
            rolePermissions.add('customers');
            rolePermissions.add('leads');
        } else if (role === 'sales_rep') {
            rolePermissions.add('dashboard');
            rolePermissions.add('offers');
            rolePermissions.add('leads');
        }

        setPermissions(rolePermissions);
    };

    const fetchProfile = async (userId: string, email: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            if (data) {
                console.log('Fetched profile data:', data);
                const rawRole = data.role as string | null;

                const normalizedRole = ((): UserRole => {
                    if (rawRole === 'admin' || rawRole === 'sales_rep' || rawRole === 'manager' || rawRole === 'partner' || rawRole === 'installer' || rawRole === 'b2b_partner' || rawRole === 'b2b_manager') {
                        return rawRole;
                    }
                    return 'sales_rep';
                })();

                const profile: User = {
                    id: data.id,
                    username: email.split('@')[0],
                    firstName: data.full_name?.split(' ')[0] || '',
                    lastName: data.full_name?.split(' ').slice(1).join(' ') || '',
                    email: email,
                    role: normalizedRole,
                    createdAt: new Date(data.created_at),
                    phone: data.phone,
                    monthlyTarget: data.monthly_target,
                    status: data.status as 'pending' | 'active' | 'blocked',
                    companyName: data.company_name || undefined,
                    nip: data.nip || undefined,
                    partnerMargin: typeof data.partner_margin === 'number' ? data.partner_margin : undefined,
                    emailConfig: data.email_config || undefined
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
                // Load permissions for this role
                await fetchPermissions(normalizedRole);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setCurrentUser(null);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password?: string, captchaToken?: string): Promise<{ error: any }> => {
        if (!password) {
            return { error: { message: 'Hasło jest wymagane' } };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
            options: {
                captchaToken
            }
        });

        // Wait for profile to be fetched before returning
        if (data?.user && !error) {
            try {
                await fetchProfile(data.user.id, data.user.email!);
            } catch (profileError) {
                return { error: profileError };
            }
        }

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
        setPermissions(new Set());
    };

    const isAdmin = (): boolean => {
        return currentUser?.role === 'admin';
    };

    const hasPermission = (moduleKey: string): boolean => {
        // Super Admin Override (optional, but good for safety if DB fails)
        if (currentUser?.role === 'admin') return true;

        // If permissions haven't loaded yet?
        // Check local set
        return permissions.has(moduleKey);
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
                    full_name: `${firstName} ${lastName} `,
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ currentUser, login, verifyOtp, register, logout, isAdmin, hasPermission, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
