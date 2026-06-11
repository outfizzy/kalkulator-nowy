import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════
// Chat Service — Max AI Chat Sessions & Messages
// ═══════════════════════════════════════════════

export interface ChatSession {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string | null;
  status: 'ai' | 'taken' | 'closed';
  taken_by: string | null;
  taken_at: string | null;
  customer_name: string | null;
  customer_data: Record<string, string>;
  page_url: string | null;
  last_message_at: string | null;
  last_viewed_at: string | null;
  message_count: number;
  metadata: Record<string, unknown>;
  // Joined
  last_message?: string;
  taken_by_name?: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  created_at: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string | null;
  image_url: string | null;
  image_type: 'upload' | 'visualization' | null;
  metadata: Record<string, unknown>;
}

// ─── Shared enrichment helper ───────────────────────────────────────

async function enrichSessions(sessions: ChatSession[]): Promise<void> {
  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length === 0) return;

  // Get last messages for each session
  const { data: messages } = await supabase
    .from('max_chat_messages')
    .select('session_id, content, role')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false });

  if (messages) {
    const lastMsgMap = new Map<string, string>();
    for (const msg of messages as { session_id: string; content: string; role: string }[]) {
      if (!lastMsgMap.has(msg.session_id) && msg.content) {
        const prefix = msg.role === 'user' ? '' : 'Max: ';
        lastMsgMap.set(msg.session_id, `${prefix}${msg.content.substring(0, 80)}`);
      }
    }
    for (const session of sessions) {
      session.last_message = lastMsgMap.get(session.id) || '';
    }
  }

  // Get taken_by names
  const takenByIds = sessions
    .filter((s) => s.taken_by)
    .map((s) => s.taken_by as string);

  if (takenByIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', takenByIds);

    if (profiles) {
      const nameMap = new Map<string, string>();
      for (const p of profiles as { id: string; full_name: string }[]) {
        nameMap.set(p.id, p.full_name);
      }
      for (const session of sessions) {
        if (session.taken_by) {
          session.taken_by_name = nameMap.get(session.taken_by) || '';
        }
      }
    }
  }
}

// ─── Get active chat sessions ───────────────────────────────────────

export async function getActiveSessions(): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('max_chat_sessions')
    .select('*')
    .in('status', ['ai', 'taken'])
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('[ChatService] getActiveSessions error:', error);
    return [];
  }

  const sessions = (data || []) as ChatSession[];
  await enrichSessions(sessions);
  return sessions;
}

// ─── Get all sessions (incl. closed) ────────────────────────────────

export async function getAllSessions(limit = 50): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('max_chat_sessions')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ChatService] getAllSessions error:', error);
    return [];
  }

  const sessions = (data || []) as ChatSession[];
  await enrichSessions(sessions);
  return sessions;
}

// ─── Get session messages ───────────────────────────────────────────

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('max_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ChatService] getSessionMessages error:', error);
    return [];
  }

  return (data || []) as ChatMessage[];
}

// ─── Get session by ID ──────────────────────────────────────────────

export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const { data, error } = await supabase
    .from('max_chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('[ChatService] getSession error:', error);
    return null;
  }

  return data as ChatSession;
}

// ─── Take over session ──────────────────────────────────────────────

export async function takeOverSession(
  sessionId: string,
  userId: string,
  userName: string
): Promise<boolean> {
  // 1. Update session
  const { error: sessionError } = await supabase
    .from('max_chat_sessions')
    .update({
      status: 'taken',
      taken_by: userId,
      taken_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (sessionError) {
    console.error('[ChatService] takeOverSession error:', sessionError);
    return false;
  }

  // 2. Insert system message
  const { error: msgError } = await supabase.from('max_chat_messages').insert({
    session_id: sessionId,
    role: 'system',
    content: `Ihr persoenlicher Berater ${userName} hat die Beratung uebernommen.`,
  });

  if (msgError) {
    console.error('[ChatService] takeOverSession system message error:', msgError);
  }

  // 3. Assign lead to this user
  const session = await getSession(sessionId);
  if (session?.lead_id) {
    await supabase
      .from('leads')
      .update({ assigned_to: userId })
      .eq('id', session.lead_id);
  }

  return true;
}

// ─── Send agent message ─────────────────────────────────────────────

export async function sendAgentMessage(
  sessionId: string,
  content: string,
  imageUrl?: string
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('max_chat_messages')
    .insert({
      session_id: sessionId,
      role: 'agent',
      content,
      image_url: imageUrl || null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[ChatService] sendAgentMessage error:', error);
    return null;
  }

  // Update session timestamp and increment message count
  await supabase
    .from('max_chat_sessions')
    .update({
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  // Increment message_count
  await supabase.rpc('increment_message_count', { p_session_id: sessionId }).then(({ error: rpcErr }) => {
    if (rpcErr) {
      // Fallback: manual increment if RPC doesn't exist
      console.warn('[ChatService] increment RPC unavailable, using manual increment:', rpcErr.message);
      supabase
        .from('max_chat_sessions')
        .select('message_count')
        .eq('id', sessionId)
        .single()
        .then(({ data: sess }) => {
          if (sess) {
            supabase
              .from('max_chat_sessions')
              .update({ message_count: (sess as { message_count: number }).message_count + 1 })
              .eq('id', sessionId)
              .then(() => {});
          }
        });
    }
  });

  return data as ChatMessage;
}

// ─── Close session ──────────────────────────────────────────────────

export async function closeSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('max_chat_sessions')
    .update({
      status: 'closed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('[ChatService] closeSession error:', error);
    return false;
  }

  // Insert system message
  await supabase.from('max_chat_messages').insert({
    session_id: sessionId,
    role: 'system',
    content: 'Die Beratung wurde beendet.',
  });

  return true;
}

// ─── Get active session count (for nav badge) ───────────────────────

export async function getActiveSessionCount(): Promise<number> {
  const { count, error } = await supabase
    .from('max_chat_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'ai');

  if (error) {
    console.error('[ChatService] getActiveSessionCount error:', error);
    return 0;
  }

  return count || 0;
}

// ─── Mark session as viewed ─────────────────────────────────────────

export async function markSessionViewed(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('max_chat_sessions')
    .update({ last_viewed_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    console.error('[ChatService] markSessionViewed error:', error);
  }
}

// ─── Get unread message count for a session ─────────────────────────

export async function getUnreadCount(sessionId: string): Promise<number> {
  // 1. Get session's last_viewed_at
  const { data: session, error: sessionError } = await supabase
    .from('max_chat_sessions')
    .select('last_viewed_at')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    console.error('[ChatService] getUnreadCount session error:', sessionError);
    return 0;
  }

  const lastViewed = (session as { last_viewed_at: string | null }).last_viewed_at;

  // 2. Count user messages after last_viewed_at
  let query = supabase
    .from('max_chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('role', 'user');

  if (lastViewed) {
    query = query.gt('created_at', lastViewed);
  }

  const { count, error } = await query;

  if (error) {
    console.error('[ChatService] getUnreadCount error:', error);
    return 0;
  }

  return count || 0;
}

// ─── Get unread counts for multiple sessions (bulk) ─────────────────

export async function getUnreadCounts(sessionIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (sessionIds.length === 0) return result;

  // 1. Get all sessions' last_viewed_at
  const { data: sessions, error: sessError } = await supabase
    .from('max_chat_sessions')
    .select('id, last_viewed_at')
    .in('id', sessionIds);

  if (sessError || !sessions) {
    console.error('[ChatService] getUnreadCounts sessions error:', sessError);
    return result;
  }

  // 2. Get all user messages for these sessions
  const { data: messages, error: msgError } = await supabase
    .from('max_chat_messages')
    .select('session_id, created_at')
    .in('session_id', sessionIds)
    .eq('role', 'user');

  if (msgError || !messages) {
    console.error('[ChatService] getUnreadCounts messages error:', msgError);
    return result;
  }

  // Build last_viewed_at lookup
  const viewedMap = new Map<string, string | null>();
  for (const s of sessions as { id: string; last_viewed_at: string | null }[]) {
    viewedMap.set(s.id, s.last_viewed_at);
  }

  // Count unread per session
  for (const msg of messages as { session_id: string; created_at: string }[]) {
    const lastViewed = viewedMap.get(msg.session_id);
    if (!lastViewed || msg.created_at > lastViewed) {
      result.set(msg.session_id, (result.get(msg.session_id) || 0) + 1);
    }
  }

  return result;
}

// ─── Return session to AI (Max) ─────────────────────────────────────

export async function returnToAi(sessionId: string): Promise<boolean> {
  // 1. Update session: back to AI, clear taken_by
  const { error: sessionError } = await supabase
    .from('max_chat_sessions')
    .update({
      status: 'ai',
      taken_by: null,
      taken_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (sessionError) {
    console.error('[ChatService] returnToAi error:', sessionError);
    return false;
  }

  // 2. Insert system message
  const { error: msgError } = await supabase.from('max_chat_messages').insert({
    session_id: sessionId,
    role: 'system',
    content: 'Chat wurde an Max (KI) zurueckgegeben.',
  });

  if (msgError) {
    console.error('[ChatService] returnToAi system message error:', msgError);
  }

  return true;
}

// ─── Latest offer for a lead ────────────────────────────────────────

export interface LeadOffer {
  id: string;
  offer_number: string | null;
  status: string | null;
  pricing: Record<string, unknown> | null;
  variants: Array<Record<string, unknown>> | null;
  public_token: string | null;
  created_at: string;
}

export async function getLatestOfferForLead(leadId: string): Promise<LeadOffer | null> {
  const { data, error } = await supabase
    .from('offers')
    .select('id, offer_number, status, pricing, variants, public_token, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[ChatService] getLatestOfferForLead error:', error);
    return null;
  }

  return (data as LeadOffer | null) || null;
}
