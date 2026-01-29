import { useCallback } from 'react';

type Priority = 'urgent' | 'ready' | 'pending' | 'future';

export const usePriorityLogic = () => {
    const calculatePriority = useCallback((deliveryDate?: string | null): Priority => {
        if (!deliveryDate) return 'pending';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const delivery = new Date(deliveryDate);
        delivery.setHours(0, 0, 0, 0);

        const diffTime = delivery.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 🔴 Urgent: Delivered or delivering today/past
        if (diffDays <= 0) return 'urgent';

        // 🟡 Ready: Delivery within 3 days
        if (diffDays <= 3) return 'ready';

        // 🔵 Pending: Delivery 4-7 days
        if (diffDays <= 7) return 'pending';

        // ⚪ Future: Delivery 7+ days
        return 'future';
    }, []);

    const getPriorityLabel = useCallback((priority: Priority): string => {
        const labels: Record<Priority, string> = {
            urgent: 'Pilne',
            ready: 'Gotowe',
            pending: 'Oczekujące',
            future: 'Przyszłe'
        };
        return labels[priority];
    }, []);

    const getPriorityColor = useCallback((priority: Priority): string => {
        const colors: Record<Priority, string> = {
            urgent: 'bg-red-100 text-red-700 border-red-300',
            ready: 'bg-yellow-100 text-yellow-700 border-yellow-300',
            pending: 'bg-blue-100 text-blue-700 border-blue-300',
            future: 'bg-slate-100 text-slate-700 border-slate-300'
        };
        return colors[priority];
    }, []);

    return {
        calculatePriority,
        getPriorityLabel,
        getPriorityColor
    };
};
