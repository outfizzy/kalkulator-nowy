import { supabase } from '../../lib/supabase';
import type { Note } from '../../types';

export const NoteService = {
    async getNotes(entityType: 'lead' | 'customer', entityId: string): Promise<Note[]> {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Manual join for profiles
        const userIds = Array.from(new Set(data.map(r => r.user_id).filter(Boolean)));
        const profileMap = new Map<string, any>();

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, avatar_url')
                .in('id', userIds);

            profiles?.forEach(p => profileMap.set(p.id, p));
        }

        return data.map(row => {
            const user = profileMap.get(row.user_id);
            return {
                id: row.id,
                entityType: row.entity_type,
                entityId: row.entity_id,
                content: row.content,
                userId: row.user_id,
                attachments: row.attachments || [],
                createdAt: new Date(row.created_at),
                user: user ? {
                    id: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    avatarUrl: user.avatar_url
                } : undefined
            };
        });
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
            .select()
            .single();

        if (error) throw error;

        // Fetch user profile for return
        let userProfile;
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, avatar_url')
            .eq('id', user.id)
            .single();

        if (profile) userProfile = profile;

        return {
            id: data.id,
            entityType: data.entity_type,
            entityId: data.entity_id,
            content: data.content,
            userId: data.user_id,
            attachments: data.attachments || [],
            createdAt: new Date(data.created_at),
            user: userProfile ? {
                id: userProfile.id,
                firstName: userProfile.first_name,
                lastName: userProfile.last_name,
                email: userProfile.email,
                avatarUrl: userProfile.avatar_url
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
