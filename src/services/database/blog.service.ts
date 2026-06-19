import { supabase } from '../../lib/supabase';

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    image_url: string | null;
    is_published: boolean;
    published_at: string | null;
    author_id: string | null;
    author_name?: string;
    created_at: string;
    updated_at: string;
    meta_title?: string;
    meta_description?: string;
    tags?: string[];
    /** 'de' for polendach24.de, 'pl' for zadaszto.pl */
    site?: 'de' | 'pl';
    /** SEO silo (DE only): terrassenueberdachung, pergola, carport, wintergarten */
    silo?: string | null;
    /** Display priority (1 = highest) */
    priority?: number;
    /** SEO alt text for the cover image. */
    image_alt?: string | null;
}

/** Result of the AI article generator (Claude) — a publish-ready post with all SEO fields. */
export interface GeneratedArticle {
    title: string;
    slug: string;
    excerpt: string;
    metaTitle: string;
    metaDescription: string;
    tags: string[];
    suggestedSilo: string;
    content: string;
    coverImageAlt: string;
    imageBriefs: { placement: string; description: string; alt: string }[];
}

export const BlogService = {
    /**
     * Get all posts for a specific site.
     * @param publishedOnly - Only return published posts
     * @param site - 'de' for polendach24.de, 'pl' for zadaszto.pl (default: 'pl' for backward compat)
     */
    async getPosts(publishedOnly = false, site: 'de' | 'pl' = 'pl'): Promise<BlogPost[]> {
        let query = supabase
            .from('blog_posts_pl')
            .select('*, profiles!author_id(full_name)')
            .eq('site', site)
            .order('created_at', { ascending: false });

        if (publishedOnly) {
            query = query.eq('is_published', true);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((row: any) => ({
            ...row,
            author_name: row.profiles?.full_name || 'Nieznany',
        }));
    },

    async getPost(id: string): Promise<BlogPost> {
        const { data, error } = await supabase
            .from('blog_posts_pl')
            .select('*, profiles!author_id(full_name)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return {
            ...data,
            author_name: (data as any).profiles?.full_name || 'Nieznany',
        };
    },

    /**
     * Create a new post for a specific site.
     * @param post - Post data
     * @param site - 'de' or 'pl' (default: 'pl')
     */
    async createPost(post: Partial<BlogPost>, site: 'de' | 'pl' = 'pl'): Promise<BlogPost> {
        const slug = BlogService.generateSlug(post.title || 'post');
        const insertData: any = {
            title: post.title || '',
            slug,
            content: post.content || '',
            excerpt: post.excerpt || '',
            image_url: post.image_url || null,
            is_published: false,
            author_id: post.author_id || null,
            meta_title: post.meta_title || post.title || '',
            meta_description: post.meta_description || post.excerpt || '',
            tags: post.tags || [],
            image_alt: post.image_alt || null,
            site,
        };

        // DE-specific fields
        if (site === 'de') {
            insertData.silo = post.silo || null;
            insertData.priority = post.priority || 3;
        }

        const { data, error } = await supabase
            .from('blog_posts_pl')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePost(id: string, updates: Partial<BlogPost>): Promise<BlogPost> {
        const updateData: any = {
            ...updates,
            updated_at: new Date().toISOString(),
        };
        // Remove computed fields
        delete updateData.author_name;
        delete updateData.profiles;

        // Regenerate slug if title changed
        if (updates.title) {
            updateData.slug = BlogService.generateSlug(updates.title);
        }

        const { data, error } = await supabase
            .from('blog_posts_pl')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * AI article generator (Claude Opus 4.8) — returns a publish-ready German SEO post
     * with all fields (title, slug, meta, tags, silo, content, cover alt, image briefs).
     * Calls the `generate-blog-article` Edge Function.
     */
    async generateArticle(input: { topic: string; keywords?: string; silo?: string | null }): Promise<GeneratedArticle> {
        const { data, error } = await supabase.functions.invoke('generate-blog-article', { body: input });
        if (error) {
            let detail = '';
            try { detail = (await (error as { context?: Response }).context?.json())?.error || ''; } catch { /* ignore */ }
            throw new Error(detail || 'KI-Generierung fehlgeschlagen.');
        }
        if (!data || (data as { error?: string }).error) {
            throw new Error((data as { error?: string })?.error || 'KI-Generierung fehlgeschlagen.');
        }
        return data as GeneratedArticle;
    },

    async publishPost(id: string): Promise<void> {
        const { error } = await supabase
            .from('blog_posts_pl')
            .update({
                is_published: true,
                published_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw error;
    },

    async unpublishPost(id: string): Promise<void> {
        const { error } = await supabase
            .from('blog_posts_pl')
            .update({
                is_published: false,
                published_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw error;
    },

    async deletePost(id: string): Promise<void> {
        const { error } = await supabase
            .from('blog_posts_pl')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    generateSlug(title: string): string {
        return title
            .toLowerCase()
            // German characters
            .replace(/[äæ]/g, 'ae')
            .replace(/[öœ]/g, 'oe')
            .replace(/[ü]/g, 'ue')
            .replace(/[ß]/g, 'ss')
            // Polish characters
            .replace(/[ąàáâãå]/g, 'a')
            .replace(/[ćč]/g, 'c')
            .replace(/[ęèéêë]/g, 'e')
            .replace(/[ł]/g, 'l')
            .replace(/[ńñ]/g, 'n')
            .replace(/[óòôõ]/g, 'o')
            .replace(/[śš]/g, 's')
            .replace(/[źżž]/g, 'z')
            .replace(/[ùû]/g, 'u')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100)
            + '-' + Date.now().toString(36);
    },

    /**
     * Upload image for a blog post.
     * @param file - Image file
     * @param site - 'de' or 'pl' — determines storage folder
     */
    async uploadImage(file: File, site: 'de' | 'pl' = 'pl'): Promise<string> {
        const ext = file.name.split('.').pop();
        const folder = site === 'de' ? 'blog-de' : 'blog-pl';
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${ext}`;

        // Bucket 'media': existing public bucket (auth upload, public read, image mime types).
        // The previously referenced 'public' bucket does not exist → uploads failed.
        const { error } = await supabase.storage
            .from('media')
            .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data } = supabase.storage.from('media').getPublicUrl(fileName);
        return data.publicUrl;
    }
};
