import { supabase } from './base.service';

export interface RealizationPhoto {
    url: string;
    caption?: string;
    is_cover?: boolean;
}

export interface Realization {
    id: string;
    contract_id?: string | null;
    title: string;
    description?: string | null;
    product_type: string;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    photos: RealizationPhoto[];
    client_name?: string | null;
    completion_date?: string | null;
    created_by?: string | null;
    source: 'manual' | 'installation' | 'contract';
    is_visible: boolean;
    /** SEO <title> for the public case-study page (optional; falls back to a generated title). */
    seo_title?: string | null;
    /** Meta description for the public case-study page (optional; falls back to the description excerpt). */
    meta_description?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateRealizationInput {
    title: string;
    description?: string;
    product_type: string;
    address?: string;
    city?: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    client_name?: string;
    completion_date?: string;
    source?: 'manual' | 'installation' | 'contract';
    contract_id?: string;
    seo_title?: string;
    meta_description?: string;
}

/** A structured spec-sheet entry shown on the public case-study page. */
export interface RealizationFact {
    label: string;
    value: string;
}

/** Result of the AI copywriter (Claude) for a realization. */
export interface RealizationCopy {
    /** Public SEO H1 title (Produkt + Ort), without the brand name. */
    title: string;
    description: string;
    /** Structured project facts (Modell, Maße, Material, Farbe, Ausstattung…). */
    facts: RealizationFact[];
    seoTitle: string;
    metaDescription: string;
    photoCaptions: string[];
    /** Context-aware pro tips on how to make this realization stronger (was/wie). */
    tips: string[];
}

export const RealizationService = {
    async getRealizations(): Promise<Realization[]> {
        const { data, error } = await supabase
            .from('realizations')
            .select('*')
            .eq('is_visible', true)
            .order('completion_date', { ascending: false });

        if (error) throw error;
        return (data || []).map(r => ({
            ...r,
            photos: Array.isArray(r.photos) ? r.photos : (r.photos ? JSON.parse(r.photos as any) : [])
        }));
    },

    async createRealization(input: CreateRealizationInput, photoFiles: File[], captions?: string[]): Promise<Realization> {
        // 1. Upload photos to storage
        const photos: RealizationPhoto[] = [];
        for (let i = 0; i < photoFiles.length; i++) {
            const file = photoFiles[i];
            const ext = file.name.split('.').pop() || 'jpg';
            const filePath = `${Date.now()}_${i}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('realizations')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });

            if (uploadError) {
                console.error('Photo upload error:', uploadError);
                continue;
            }

            const { data: urlData } = supabase.storage
                .from('realizations')
                .getPublicUrl(filePath);

            photos.push({
                url: urlData.publicUrl,
                // Prefer an AI-generated, SEO-friendly caption (alt text); fall back to the file name.
                caption: (captions?.[i]?.trim()) || file.name.replace(/\.[^.]+$/, ''),
                is_cover: i === 0
            });
        }

        // 2. Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // 3. Insert realization
        const { data, error } = await supabase
            .from('realizations')
            .insert({
                title: input.title,
                description: input.description || null,
                product_type: input.product_type,
                address: input.address || null,
                city: input.city || null,
                postal_code: input.postal_code || null,
                latitude: input.latitude || null,
                longitude: input.longitude || null,
                photos: photos,
                client_name: input.client_name || null,
                completion_date: input.completion_date || null,
                created_by: user?.id || null,
                source: input.source || 'manual',
                contract_id: input.contract_id || null,
                seo_title: input.seo_title || null,
                meta_description: input.meta_description || null,
            })
            .select()
            .single();

        if (error) throw error;
        return { ...data, photos };
    },

    /**
     * AI copywriter (Claude) — generates premium German SEO + marketing text for a
     * realization (description, SEO title, meta description, photo captions).
     * Calls the `generate-realization-copy` Edge Function.
     */
    async generateCopy(input: {
        productType: string;
        city?: string;
        postalCode?: string;
        dimensions?: string;
        title?: string;
        draftDescription?: string;
        photoCount: number;
    }): Promise<RealizationCopy> {
        const { data, error } = await supabase.functions.invoke('generate-realization-copy', { body: input });
        if (error) {
            // Surface the function's own error message when available.
            let detail = '';
            try { detail = (await (error as { context?: Response }).context?.json())?.error || ''; } catch { /* ignore */ }
            throw new Error(detail || 'KI-Generierung fehlgeschlagen.');
        }
        if (!data || (data as { error?: string }).error) {
            throw new Error((data as { error?: string })?.error || 'KI-Generierung fehlgeschlagen.');
        }
        return {
            title: String((data as RealizationCopy).title || ''),
            description: String((data as RealizationCopy).description || ''),
            facts: Array.isArray((data as RealizationCopy).facts) ? (data as RealizationCopy).facts : [],
            seoTitle: String((data as RealizationCopy).seoTitle || ''),
            metaDescription: String((data as RealizationCopy).metaDescription || ''),
            photoCaptions: Array.isArray((data as RealizationCopy).photoCaptions) ? (data as RealizationCopy).photoCaptions : [],
            tips: Array.isArray((data as RealizationCopy).tips) ? (data as RealizationCopy).tips : [],
        };
    },

    async updateRealization(id: string, updates: Partial<CreateRealizationInput> & { photos?: RealizationPhoto[] }): Promise<void> {
        const { error } = await supabase
            .from('realizations')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
    },

    async deleteRealization(id: string): Promise<void> {
        const { error } = await supabase
            .from('realizations')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async addPhotosToRealization(id: string, photoFiles: File[]): Promise<RealizationPhoto[]> {
        // Get current photos
        const { data: current, error: fetchError } = await supabase
            .from('realizations')
            .select('photos')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const existingPhotos: RealizationPhoto[] = Array.isArray(current.photos) ? current.photos : [];

        // Upload new photos
        const newPhotos: RealizationPhoto[] = [];
        for (let i = 0; i < photoFiles.length; i++) {
            const file = photoFiles[i];
            const ext = file.name.split('.').pop() || 'jpg';
            const filePath = `${id}/${Date.now()}_${i}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('realizations')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });

            if (uploadError) continue;

            const { data: urlData } = supabase.storage
                .from('realizations')
                .getPublicUrl(filePath);

            newPhotos.push({
                url: urlData.publicUrl,
                caption: file.name.replace(/\.[^.]+$/, ''),
                is_cover: false
            });
        }

        const allPhotos = [...existingPhotos, ...newPhotos];

        const { error: updateError } = await supabase
            .from('realizations')
            .update({ photos: allPhotos })
            .eq('id', id);

        if (updateError) throw updateError;
        return allPhotos;
    }
};
