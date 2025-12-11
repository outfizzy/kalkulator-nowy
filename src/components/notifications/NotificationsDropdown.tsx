import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseService } from '../../services/database';
import type { Notification as AppNotification } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export const NotificationsDropdown: React.FC = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (!currentUser) return;
        try {
            const [fetchedNotifications, count] = await Promise.all([
                DatabaseService.getNotifications(currentUser.id, 10),
                DatabaseService.getUnreadNotificationsCount(currentUser.id)
            ]);
            setNotifications(fetchedNotifications);
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000); // Poll every minute
            return () => clearInterval(interval);
        }
    }, [currentUser, fetchNotifications]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await DatabaseService.markNotificationAsRead(id);
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!currentUser) return;
        try {
            await DatabaseService.markAllNotificationsAsRead(currentUser.id);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.isRead) {
            await handleMarkAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Notifications"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <h3 className="text-sm font-semibold text-slate-700">Powiadomienia</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-primary hover:text-primary-dark font-medium"
                            >
                                Oznacz wszystkie
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                Brak powiadomień
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${notification.type === 'error' ? 'bg-red-500' :
                                                notification.type === 'warning' ? 'bg-yellow-500' :
                                                    notification.type === 'success' ? 'bg-green-500' :
                                                        !notification.isRead ? 'bg-primary' : 'bg-slate-300'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    {format(notification.createdAt, 'PP p', { locale: pl })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
