import { supabase } from '../lib/supabase';

export interface ChatMessage {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    channel: 'company' | 'private';
    user_id: string;
    created_at: string;
    updated_at: string;
    // Joined fields (admin view)
    user_name?: string;
}

export const AIService = {
    // Session Management
    async createSession(title: string = 'Nowa rozmowa', channel: 'company' | 'private' = 'private') {
        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({
                title,
                channel,
                user_id: (await supabase.auth.getUser()).data.user?.id
            })
            .select()
            .single();

        if (error) throw error;
        return data as ChatSession;
    },

    async getSessions(channel?: 'company' | 'private') {
        let query = supabase
            .from('chat_sessions')
            .select('*')
            .order('updated_at', { ascending: false });

        if (channel) {
            query = query.eq('channel', channel);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as ChatSession[];
    },

    // Admin: get all sessions (optionally filtered by user & channel)
    async getAdminSessions(options?: { userId?: string; channel?: 'company' | 'private' }) {
        // We need to join with profiles to get user names
        let query = supabase
            .from('chat_sessions')
            .select('*, profiles!chat_sessions_user_id_fkey(full_name)')
            .order('updated_at', { ascending: false });

        if (options?.channel) {
            query = query.eq('channel', options.channel);
        }
        if (options?.userId) {
            query = query.eq('user_id', options.userId);
        }

        const { data, error } = await query;

        if (error) {
            // Fallback without join if FK doesn't exist
            let fallbackQuery = supabase
                .from('chat_sessions')
                .select('*')
                .order('updated_at', { ascending: false });
            if (options?.channel) fallbackQuery = fallbackQuery.eq('channel', options.channel);
            if (options?.userId) fallbackQuery = fallbackQuery.eq('user_id', options.userId);
            const { data: fbData, error: fbError } = await fallbackQuery;
            if (fbError) throw fbError;
            return (fbData || []) as ChatSession[];
        }

        return (data || []).map((s: any) => ({
            ...s,
            user_name: s.profiles?.full_name || 'Nieznany',
            profiles: undefined
        })) as ChatSession[];
    },

    // Get users who have chat sessions (for admin filter)
    async getChatUsers() {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('user_id')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Get unique user IDs
        const uniqueIds = [...new Set((data || []).map((s: any) => s.user_id))];
        if (uniqueIds.length === 0) return [];

        // Get profiles
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('id', uniqueIds);

        return (profiles || []).map((p: any) => ({
            id: p.id,
            name: p.full_name || 'Nieznany',
            role: p.role
        }));
    },

    async deleteSession(sessionId: string) {
        // Delete messages first
        await supabase.from('chat_messages').delete().eq('session_id', sessionId);
        const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId);
        if (error) throw error;
    },

    async getSessionMessages(sessionId: string) {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as ChatMessage[];
    },

    // Messaging
    async sendMessage(messages: ChatMessage[], context?: any) {
        try {
            const { data, error } = await supabase.functions.invoke('ai-assistant', {
                body: {
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    context
                }
            });

            if (error) {
                console.error('Invokation Error Raw:', error);
                try {
                    // @ts-ignore
                    if (error.context && typeof error.context.json === 'function') {
                        const errorBody = await error.context.json();
                        if (errorBody?.error) throw new Error(errorBody.error);
                    }
                } catch (parseError) {
                    console.warn('Failed to parse error body:', parseError);
                }
                throw error;
            }

            return data;
        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    },

    // Helper: Handle entire flow (Save User Msg -> Call AI -> Save AI Msg)
    async sendSessionMessage(sessionId: string, content: string, previousMessages: ChatMessage[], image?: string, context?: any) {
        try {
            // 1. Save User Message
            const savedContent = image ? `${content}\n\n[Obraz przesłany do analizy]` : content;

            const { error: userError } = await supabase
                .from('chat_messages')
                .insert({ session_id: sessionId, role: 'user', content: savedContent });

            if (userError) throw userError;

            // 2. Call AI
            const contextMessages: ChatMessage[] = previousMessages.map(m => ({
                role: m.role, content: m.content
            }));

            const newMessage: any = { role: 'user', content };
            if (image) {
                newMessage.content = [
                    { type: "text", text: content },
                    { type: "image_url", image_url: { url: image } }
                ];
            }

            const messagesPayload = [...contextMessages, newMessage];
            const aiResponse = await this.sendMessage(messagesPayload, context);

            // 3. Save AI Response
            if (aiResponse) {
                const { error: aiError } = await supabase
                    .from('chat_messages')
                    .insert({
                        session_id: sessionId,
                        role: 'assistant',
                        content: aiResponse.content
                    });

                if (aiError) throw aiError;

                // Update session timestamp + title if generic
                const session = await supabase
                    .from('chat_sessions')
                    .select('title')
                    .eq('id', sessionId)
                    .single();

                const updates: any = { updated_at: new Date().toISOString() };
                if (session.data?.title === 'Nowa rozmowa') {
                    updates.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
                }

                await supabase
                    .from('chat_sessions')
                    .update(updates)
                    .eq('id', sessionId);

                return aiResponse;
            }
        } catch (error) {
            console.error('Session Message Error:', error);
            throw error;
        }
    },

    async enrichPromptWithData(prompt: string): Promise<string> {
        try {
            const { AIProductDataService } = await import('./ai-product-data.service');
            const productContext = await AIProductDataService.generateProductContext();
            return `${prompt}\n\n---\nWAŻNE: Użyj poniższych RZECZYWISTYCH danych produktowych z bazy danych do odpowiedzi:\n\n${productContext}\n\nWszystkie ceny i wymiary podaj na podstawie powyższych danych.`;
        } catch (error) {
            console.error('Error enriching prompt with data:', error);
            return prompt;
        }
    }
};
