import { supabase } from '../../lib/supabase';
import type { Task, TaskStatus, TaskPriority, TaskType } from '../../types';

export const TaskService = {
    async getTasks(filters?: { leadId?: string; customerId?: string; status?: TaskStatus }): Promise<Task[]> {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) throw new Error('Not authenticated');

        let query = supabase
            .from('tasks')
            .select(`
    *,
    assignee: profiles(
        full_name
    )
            `)
            .order('due_date', { ascending: true }); // Soonest first

        if (filters?.leadId) {
            query = query.eq('lead_id', filters.leadId);
        }
        if (filters?.customerId) {
            query = query.eq('customer_id', filters.customerId);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(row => ({
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
            assignee: row.assignee ? {
                firstName: (row.assignee.full_name || '').split(' ')[0] || '',
                lastName: (row.assignee.full_name || '').split(' ').slice(1).join(' ') || ''
            } : undefined
        }));
    },

    async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                user_id: task.userId || user.id, // Assign to self if not specified
                lead_id: task.leadId,
                customer_id: task.customerId,
                title: task.title,
                description: task.description,
                due_date: task.dueDate,
                status: task.status,
                priority: task.priority,
                type: task.type
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...task,
            id: data.id,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            userId: data.user_id
        } as Task;
    },

    async updateTask(id: string, updates: Partial<Task>): Promise<void> {
        const dbUpdates: any = {
            updated_at: new Date().toISOString()
        };
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.dueDate) dbUpdates.due_date = updates.dueDate;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.priority) dbUpdates.priority = updates.priority;
        if (updates.userId) dbUpdates.user_id = updates.userId;

        const { error } = await supabase
            .from('tasks')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteTask(id: string): Promise<void> {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
