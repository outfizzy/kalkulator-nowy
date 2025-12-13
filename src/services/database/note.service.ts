import { supabase } from '../../lib/supabase';
import type { Note } from '../../types';

export const NoteService = {
    async getNotes(entityType: 'lead' | 'customer', entityId: string): Promise<Note[]> {
        const { data, error } = await supabase
            .from('notes')
            .select('*, user:user_id(id, first_name, last_name, email, avatar_url)')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            entityType: row.entity_type,
            entityId: row.entity_id,
            content: row.content,
            userId: row.user_id,
            attachments: row.attachments || [],
            createdAt: new Date(row.created_at),
            user: row.user ? {
                id: row.user.id,
                firstName: row.user.first_name,
                lastName: row.user.last_name,
                email: row.user.email,
                avatarUrl: row.user.avatar_url
            } : undefined
        }));
    },

    async createNote(note: Partial<Note>): Promise<Note> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('notes')
            .insert({
                entity_type: note.entityType,
                entity_id: note.entityId,
                content: note.content,
                user_id: user.id,
                attachments: note.attachments || []
            })
            .select('*, user:user_id(id, first_name, last_name, email, avatar_url)')
            .single();

        if (error) throw error;

        return {
            id: data.id,
            entityType: data.entity_type,
            entityId: data.entity_id,
            content: data.content,
            userId: data.user_id,
            attachments: data.attachments || [],
            createdAt: new Date(data.created_at),
            user: data.user ? {
                id: data.user.id,
                firstName: data.user.first_name,
                lastName: data.user.last_name,
                email: data.user.email,
                avatarUrl: data.user.avatar_url
            } : undefined
        };
    },

    async deleteNote(id: string): Promise<void> {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
