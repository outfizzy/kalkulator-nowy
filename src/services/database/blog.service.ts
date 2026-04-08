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
}

export const BlogService = {
    async getPosts(publishedOnly = false): Promise<BlogPost[]> {
        let query = supabase
            .from('blog_posts_pl')
            .select('*, profiles!author_id(full_name)')
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

    async createPost(post: Partial<BlogPost>): Promise<BlogPost> {
        const slug = BlogService.generateSlug(post.title || 'post');
        const { data, error } = await supabase
            .from('blog_posts_pl')
            .insert({
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
            })
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
            .replace(/[ąàáâãäå]/g, 'a')
            .replace(/[ćč]/g, 'c')
            .replace(/[ęèéêë]/g, 'e')
            .replace(/[ł]/g, 'l')
            .replace(/[ńñ]/g, 'n')
            .replace(/[óòôõö]/g, 'o')
            .replace(/[śš]/g, 's')
            .replace(/[źżž]/g, 'z')
            .replace(/[üù]/g, 'u')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100)
            + '-' + Date.now().toString(36);
    },

    async uploadImage(file: File): Promise<string> {
        const ext = file.name.split('.').pop();
        const fileName = `blog-pl/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${ext}`;

        const { error } = await supabase.storage
            .from('public')
            .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data } = supabase.storage.from('public').getPublicUrl(fileName);
        return data.publicUrl;
    }
};
