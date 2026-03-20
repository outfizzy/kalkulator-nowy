import { supabase } from '../../lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface ConsentRecord {
  consent_type: string;
  consent_given: boolean;
  consent_text: string;
  document_version: string;
}

export interface SavedConsent {
  id: string;
  user_id: string;
  consent_type: string;
  consent_given: boolean;
  consent_text: string;
  document_version: string;
  ip_address: string | null;
  user_agent: string | null;
  granted_at: string;
  revoked_at: string | null;
}

// ============================================================================
// Get client IP (best-effort via public API)
// ============================================================================

export async function getClientIP(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

// ============================================================================
// Save consents at registration
// ============================================================================

export async function saveRegistrationConsents(
  userId: string,
  consents: ConsentRecord[],
  ipAddress: string
): Promise<void> {
  const userAgent = navigator.userAgent || 'unknown';

  const records = consents.map(c => ({
    user_id: userId,
    consent_type: c.consent_type,
    consent_given: c.consent_given,
    consent_text: c.consent_text,
    document_version: c.document_version,
    ip_address: ipAddress,
    user_agent: userAgent,
    granted_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('user_consents').insert(records);
  if (error) {
    console.error('Failed to save consents:', error);
    // Don't block registration — log error but continue
  }
}

// ============================================================================
// Get user consents
// ============================================================================

export async function getUserConsents(userId: string): Promise<SavedConsent[]> {
  const { data, error } = await supabase
    .from('user_consents')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Revoke consent (GDPR withdrawal)
// ============================================================================

export async function revokeConsent(userId: string, consentType: string): Promise<void> {
  const { error } = await supabase
    .from('user_consents')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .is('revoked_at', null);

  if (error) throw error;
}
