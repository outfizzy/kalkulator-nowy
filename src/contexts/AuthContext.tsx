import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { getCurrentUser, setCurrentUser as saveCurrentUser, clearCurrentUser, initializeDefaultUsers } from '../utils/storage';

interface AuthContextType {
    currentUser: User | null;
    login: (username: string, password: string) => boolean;
    logout: () => void;
    isAdmin: () => boolean;
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

    useEffect(() => {
        // Initialize default users if none exist
        initializeDefaultUsers();

        // Load current user from storage
        const user = getCurrentUser();
        setCurrentUser(user);
    }, []);

    const login = (username: string, password: string): boolean => {
        // Mock authentication - in production, this would call an API
        const users = initializeDefaultUsers();
        const user = users.find((u: User) => u.username === username);

        // Simple password check (in production, use proper auth)
        const validPasswords: Record<string, string> = {
            'admin': 'admin123',
            'jan.kowalski': 'pass123',
            'anna.nowak': 'pass123'
        };

        if (user && validPasswords[username] === password) {
            setCurrentUser(user);
            saveCurrentUser(user);
            return true;
        }

        return false;
    };

    const logout = () => {
        setCurrentUser(null);
        clearCurrentUser();
    };

    const isAdmin = (): boolean => {
        return currentUser?.role === 'admin';
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};
