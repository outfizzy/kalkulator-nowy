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

    async createRealization(input: CreateRealizationInput, photoFiles: File[]): Promise<Realization> {
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
                caption: file.name.replace(/\.[^.]+$/, ''),
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
            })
            .select()
            .single();

        if (error) throw error;
        return { ...data, photos };
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
