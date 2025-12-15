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
    created_at: string;
    updated_at: string;
}

export const AIService = {
    // Session Management
    async createSession(title: string = 'Nowa rozmowa') {
        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({
                title,
                user_id: (await supabase.auth.getUser()).data.user?.id
            })
            .select()
            .single();

        if (error) throw error;
        return data as ChatSession;
    },

    async getSessions() {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data as ChatSession[];
    },

    async deleteSession(sessionId: string) {
        const { error } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', sessionId);

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
    async sendMessage(messages: ChatMessage[]) {
        try {
            // 1. If session exists, ensure User message is saved (handled by caller or here?)
            // Let's assume caller saves the User message or we handle it if we want strict consistency.
            // For flexibility, let's keep this focused on the LLM call, but we can add a helper "sendMessageInSession".

            const { data, error } = await supabase.functions.invoke('ai-assistant', {
                body: { messages: messages.map(m => ({ role: m.role, content: m.content })) } // Strip IDs
            });

            if (error) throw error;
            return data; // Returns the assistant message object
        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    },

    // Helper: Handle entire flow (Save User Msg -> Call AI -> Save AI Msg)
    async sendSessionMessage(sessionId: string, content: string, previousMessages: ChatMessage[]) {
        try {
            // 1. Save User Message
            const { error: userError } = await supabase
                .from('chat_messages')
                .insert({ session_id: sessionId, role: 'user', content });

            if (userError) throw userError;

            // 2. Call AI
            // Prepare context (System + History + New Message)
            const contextMessages: ChatMessage[] = [
                ...previousMessages,
                { role: 'user', content }
            ];

            const aiResponse = await this.sendMessage(contextMessages);

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

                // Update session timestamp
                await supabase
                    .from('chat_sessions')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', sessionId);

                return aiResponse;
            }
        } catch (error) {
            console.error('Session Message Error:', error);
            throw error;
        }
    }
};
