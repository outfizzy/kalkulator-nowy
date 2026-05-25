import { supabase } from '../../lib/supabase';

export interface JobQueueItem {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review';
    priority: number;
    payload: any;
    result: any;
    error: string | null;
    attempts: number;
    maxAttempts: number;
    lockedBy: string | null;
    scheduledFor: string;
    startedAt: string | null;
    completedAt: string | null;
    createdBy: string | null;
    createdAt: string;
}

const mapRowToJobQueueItem = (row: any): JobQueueItem => ({
    id: row.id,
    type: row.type,
    status: row.status,
    priority: row.priority,
    payload: row.payload,
    result: row.result,
    error: row.error,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lockedBy: row.locked_by,
    scheduledFor: row.scheduled_for,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
});

export const JobQueueService = {
    async enqueueJob(
        type: string,
        payload: any,
        options?: { priority?: number; scheduledFor?: string; createdBy?: string }
    ): Promise<JobQueueItem> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('job_queue')
            .insert({
                type,
                payload,
                status: 'pending',
                priority: options?.priority ?? 0,
                scheduled_for: options?.scheduledFor ?? new Date().toISOString(),
                created_by: options?.createdBy ?? user.id,
            })
            .select()
            .single();

        if (error) throw error;
        return mapRowToJobQueueItem(data);
    },

    async claimJob(type: string, workerId: string): Promise<JobQueueItem | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Find oldest pending job of this type that is ready to run
        const { data: jobs, error: fetchError } = await supabase
            .from('job_queue')
            .select('*')
            .eq('type', type)
            .eq('status', 'pending')
            .lte('scheduled_for', new Date().toISOString())
            .order('priority', { ascending: true })
            .order('scheduled_for', { ascending: true })
            .limit(1);

        if (fetchError) throw fetchError;
        if (!jobs || jobs.length === 0) return null;

        const job = jobs[0];

        // Lock the job
        const now = new Date().toISOString();
        const { data: updated, error: updateError } = await supabase
            .from('job_queue')
            .update({
                status: 'processing',
                locked_by: workerId,
                locked_at: now,
                started_at: now,
            })
            .eq('id', job.id)
            .eq('status', 'pending') // Optimistic lock: only claim if still pending
            .select()
            .single();

        if (updateError) {
            // Another worker may have claimed it
            console.error('JobQueueService.claimJob: Failed to lock job', updateError);
            return null;
        }

        return mapRowToJobQueueItem(updated);
    },

    async completeJob(jobId: string, result: any): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('job_queue')
            .update({
                status: 'completed',
                result,
                completed_at: new Date().toISOString(),
            })
            .eq('id', jobId);

        if (error) throw error;
    },

    async failJob(jobId: string, errorMessage: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Fetch current job to check attempts
        const { data: job, error: fetchError } = await supabase
            .from('job_queue')
            .select('attempts, max_attempts')
            .eq('id', jobId)
            .single();

        if (fetchError) throw fetchError;
        if (!job) throw new Error(`Job ${jobId} not found`);

        const newAttempts = (job.attempts || 0) + 1;
        const maxAttempts = job.max_attempts || 3;
        const newStatus = newAttempts >= maxAttempts ? 'failed' : 'pending';

        const updates: Record<string, unknown> = {
            attempts: newAttempts,
            error: errorMessage,
            status: newStatus,
        };

        // If retrying, unlock the job
        if (newStatus === 'pending') {
            updates.locked_by = null;
            updates.locked_at = null;
            updates.started_at = null;
        }

        // If permanently failed, set completed_at
        if (newStatus === 'failed') {
            updates.completed_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('job_queue')
            .update(updates)
            .eq('id', jobId);

        if (error) throw error;
    },

    async getJobStatus(jobId: string): Promise<JobQueueItem | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('job_queue')
            .select('*')
            .eq('id', jobId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return mapRowToJobQueueItem(data);
    },

    async getJobs(filters?: { type?: string; status?: string; limit?: number }): Promise<JobQueueItem[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        let query = supabase
            .from('job_queue')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(filters?.limit ?? 50);

        if (filters?.type) query = query.eq('type', filters.type);
        if (filters?.status) query = query.eq('status', filters.status);

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(mapRowToJobQueueItem);
    },
};
