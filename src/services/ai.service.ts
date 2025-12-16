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
            const { data, error } = await supabase.functions.invoke('ai-assistant', {
                body: { messages: messages.map(m => ({ role: m.role, content: m.content })) } // Strip IDs
            });

            if (error) {
                console.error('Invokation Error Raw:', error);

                // Attempt to extract detailed error message from response body
                try {
                    // Check if error has a response context we can read
                    // @ts-ignore - Supabase types might imply specific shape, but runtime has more
                    if (error.context && typeof error.context.json === 'function') {
                        const errorBody = await error.context.json();
                        if (errorBody && errorBody.error) {
                            throw new Error(errorBody.error);
                        }
                    }
                } catch (parseError) {
                    console.warn('Failed to parse error body:', parseError);
                }

                throw error;
            }

            return data; // Returns the assistant message object
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
            // Prepare context (System + History + New Message)
            const contextMessages: ChatMessage[] = previousMessages.map(m => ({
                role: m.role,
                content: m.content
            }));

            // Add the new message with image for the AI
            const newMessage: any = { role: 'user', content: content };
            if (image) {
                newMessage.content = [
                    { type: "text", text: content },
                    { type: "image_url", image_url: { url: image } }
                ];
            }

            // Inject Context if present (as a System note or just merged)
            // We'll append it to the current message or send as a separate system-like user note?
            // Best practice: Add a System message at the end or prepend context to user message.
            if (context) {
                const contextString = `\n\n[Context: User is viewing ${JSON.stringify(context)}]`;
                if (typeof newMessage.content === 'string') {
                    newMessage.content += contextString;
                } else {
                    newMessage.content.push({ type: "text", text: contextString });
                }
            }

            const messagesPayload = [...contextMessages, newMessage];

            const aiResponse = await this.sendMessage(messagesPayload); // sendMessage just invokes function

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
