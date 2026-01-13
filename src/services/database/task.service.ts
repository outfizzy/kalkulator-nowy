import { supabase } from '../../lib/supabase';
import type { Task, TaskStatus, TaskPriority, TaskType } from '../../types';

export const TaskService = {
    async getTasks(filters?: { leadId?: string; customerId?: string; status?: TaskStatus; userId?: string; allUsers?: boolean; deleted?: boolean }): Promise<Task[]> {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) throw new Error('Not authenticated');

        // Check role for "View All" permission
        let canViewAll = false;
        if (filters?.allUsers !== undefined) {
            canViewAll = filters.allUsers;
        } else {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).maybeSingle();
            if (profile && (profile.role === 'admin' || profile.role === 'manager')) {
                canViewAll = true;
            }
        }

        let query = supabase
            .from('tasks')
            .select('*')
            .order('due_date', { ascending: true });

        // Handle Soft Delete
        if (filters?.deleted) {
            query = query.not('deleted_at', 'is', null);
        } else {
            query = query.is('deleted_at', null); // Default: show active
        }

        if (filters?.leadId) query = query.eq('lead_id', filters.leadId);
        if (filters?.customerId) query = query.eq('customer_id', filters.customerId);

        if (canViewAll) {
            if (filters?.userId) query = query.eq('user_id', filters.userId);
        } else {
            if (filters?.userId) {
                query = query.eq('user_id', filters.userId);
            } else if (!filters?.leadId && !filters?.customerId) {
                query = query.eq('user_id', currentUser.id);
            }
        }

        if (filters?.status) query = query.eq('status', filters.status);

        const { data: tasks, error } = await query;

        if (error) {
            console.error('TaskService.getTasks: Error fetching tasks', error);
            throw error;
        }
        if (!tasks || tasks.length === 0) return [];

        const userIds = new Set<string>();
        const customerIds = new Set<string>();
        tasks.forEach(t => {
            if (t.user_id) userIds.add(t.user_id);
            if (t.customer_id) customerIds.add(t.customer_id);
        });

        const profileMap = new Map<string, { full_name: string }>();
        if (userIds.size > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', Array.from(userIds));
            profiles?.forEach(p => profileMap.set(p.id, p));
        }

        const customerMap = new Map<string, { company_name?: string, first_name?: string, last_name?: string }>();
        if (customerIds.size > 0) {
            const { data: customers } = await supabase
                .from('customers')
                .select('id, company_name, first_name, last_name')
                .in('id', Array.from(customerIds));
            customers?.forEach(c => customerMap.set(c.id, c));
        }

        return tasks.map(row => {
            const assignee = row.user_id ? profileMap.get(row.user_id) : undefined;
            const customer = row.customer_id ? customerMap.get(row.customer_id) : undefined;

            let customerName = undefined;
            if (customer) {
                customerName = customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
            }

            return {
                id: row.id,
                userId: row.user_id,
                leadId: row.lead_id,
                customerId: row.customer_id,
                title: row.title,
                description: row.description,
                dueDate: row.due_date,
                status: row.status as TaskStatus,
                priority: row.priority as TaskPriority,
                type: row.type as TaskType,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at),
                deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
                assignee: assignee ? {
                    firstName: (assignee.full_name || '').split(' ')[0] || '',
                    lastName: (assignee.full_name || '').split(' ').slice(1).join(' ') || ''
                } : undefined,
                customerName: customerName
            };
        });
    },

    async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Task> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const userIdToUse = (task.userId && task.userId.trim()) ? task.userId : user.id;

        const payload = {
            user_id: userIdToUse,
            lead_id: (task.leadId && task.leadId.trim()) ? task.leadId : null,
            customer_id: (task.customerId && task.customerId.trim()) ? task.customerId : null,
            title: task.title,
            description: task.description,
            due_date: task.dueDate,
            status: task.status,
            priority: task.priority,
            type: task.type
        };

        const { data, error } = await supabase.from('tasks').insert(payload).select().single();
        if (error) throw error;

        return {
            ...task,
            id: data.id,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            userId: data.user_id,
            leadId: data.lead_id,
            customerId: data.customer_id
        } as Task;
    },

    async updateTask(id: string, updates: Partial<Task>): Promise<void> {
        const dbUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.priority) dbUpdates.priority = updates.priority;
        if (updates.userId && updates.userId.trim()) dbUpdates.user_id = updates.userId;

        const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
        if (error) throw error;
    },

    async deleteTask(id: string): Promise<void> {
        // Soft Delete
        const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
    },

    async restoreTask(id: string): Promise<void> {
        // Restore
        const { error } = await supabase.from('tasks').update({ deleted_at: null }).eq('id', id);
        if (error) throw error;
    },

    // Admin only: Permanent delete
    async permanentDeleteTask(id: string): Promise<void> {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
    }
};
