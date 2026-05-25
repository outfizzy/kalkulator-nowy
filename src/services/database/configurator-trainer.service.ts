import { supabase } from '../../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SupplierConfigurator {
    id: string;
    supplier: string;
    name: string;
    url: string;
    loginUrl: string | null;
    loginRequired: boolean;
    credentials: any;
    status: 'new' | 'recording' | 'learning' | 'testing' | 'ready' | 'broken';
    confidenceScore: number;
    techStack: any;
    pageStructure: any;
    lastHealthCheck: string | null;
    lastHealthResult: any;
    healthCheckIntervalHours: number;
    metadata: any;
    createdAt: string;
    updatedAt: string;
}

export interface RecordingStep {
    seq: number;
    action: string; // 'click', 'input', 'select', 'navigate', 'screenshot', 'price_change'
    targetSelector: string | null;
    targetText: string | null;
    value: string | null;
    screenshotPath: string | null;
    domSnapshotPath: string | null;
    pageUrl: string;
    visiblePrice: string | null;
    timestampMs: number;
    pageChanges: any;
}

export interface ConfiguratorRecording {
    id: string;
    configuratorId: string;
    recordedBy: string;
    status: 'recording' | 'completed' | 'analyzing' | 'analyzed' | 'verified' | 'failed';
    steps: RecordingStep[];
    finalPrice: number | null;
    finalCurrency: string;
    finalConfiguration: any;
    finalPdfPath: string | null;
    durationMs: number | null;
    stepsCount: number;
    pagesVisited: number;
    aiAnalysis: any;
    aiAnalysisModel: string | null;
    aiConfidence: number | null;
    productModel: string | null;
    tags: string[];
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    // Joined data
    supplierName?: string;
    recordedByName?: string;
}

export interface ConfigurationNode {
    id: string;
    configuratorId: string;
    nodeKey: string;
    nodeType: string;
    name: string;
    selectors: any[];
    fieldType: string | null;
    options: any;
    validation: any;
    defaultValue: string | null;
    pageIndex: number | null;
    section: string | null;
    orderInSection: number | null;
    isRequired: boolean;
    isConditional: boolean;
    businessMeaning: string | null;
    firstSeenIn: string | null;
    seenCount: number;
    lastSeenAt: string;
}

export interface ConfigurationEdge {
    id: string;
    configuratorId: string;
    fromNodeId: string;
    toNodeId: string;
    edgeType: string;
    condition: any;
    effect: any;
    confidence: number;
    verifiedBy: string | null;
    verifiedAt: string | null;
    source: string;
    evidence: any[];
    observationCount: number;
    // Joined
    fromNodeName?: string;
    toNodeName?: string;
}

export interface ConfiguratorTestResult {
    id: string;
    configuratorId: string;
    jobId: string | null;
    inputConfig: any;
    status: string;
    ourPrice: number | null;
    supplierPrice: number | null;
    priceDifference: number | null;
    priceDifferencePct: number | null;
    screenshots: any[];
    finalScreenshotPath: string | null;
    pdfPath: string | null;
    executionLog: any[];
    executionTimeMs: number | null;
    stepsExecuted: number | null;
    errorType: string | null;
    errorDetails: any;
    selfHealed: boolean;
    healingDetails: any;
    createdAt: string;
}

// ─── Row Mappers ────────────────────────────────────────────────────────────────

const mapRowToSupplier = (row: any): SupplierConfigurator => ({
    id: row.id,
    supplier: row.supplier,
    name: row.name,
    url: row.url,
    loginUrl: row.login_url,
    loginRequired: row.login_required,
    credentials: row.credentials,
    status: row.status,
    confidenceScore: row.confidence_score,
    techStack: row.tech_stack,
    pageStructure: row.page_structure,
    lastHealthCheck: row.last_health_check,
    lastHealthResult: row.last_health_result,
    healthCheckIntervalHours: row.health_check_interval_hours,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const mapRowToRecording = (row: any): ConfiguratorRecording => ({
    id: row.id,
    configuratorId: row.configurator_id,
    recordedBy: row.recorded_by,
    status: row.status,
    steps: row.steps || [],
    finalPrice: row.final_price,
    finalCurrency: row.final_currency,
    finalConfiguration: row.final_configuration,
    finalPdfPath: row.final_pdf_path,
    durationMs: row.duration_ms,
    stepsCount: row.steps_count,
    pagesVisited: row.pages_visited,
    aiAnalysis: row.ai_analysis,
    aiAnalysisModel: row.ai_analysis_model,
    aiConfidence: row.ai_confidence,
    productModel: row.product_model,
    tags: row.tags || [],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Joined data (may be undefined)
    supplierName: row.supplier_name,
    recordedByName: row.recorded_by_name,
});

const mapRowToNode = (row: any): ConfigurationNode => ({
    id: row.id,
    configuratorId: row.configurator_id,
    nodeKey: row.node_key,
    nodeType: row.node_type,
    name: row.name,
    selectors: row.selectors || [],
    fieldType: row.field_type,
    options: row.options,
    validation: row.validation,
    defaultValue: row.default_value,
    pageIndex: row.page_index,
    section: row.section,
    orderInSection: row.order_in_section,
    isRequired: row.is_required,
    isConditional: row.is_conditional,
    businessMeaning: row.business_meaning,
    firstSeenIn: row.first_seen_in,
    seenCount: row.seen_count,
    lastSeenAt: row.last_seen_at,
});

const mapRowToEdge = (row: any): ConfigurationEdge => ({
    id: row.id,
    configuratorId: row.configurator_id,
    fromNodeId: row.from_node_id,
    toNodeId: row.to_node_id,
    edgeType: row.edge_type,
    condition: row.condition,
    effect: row.effect,
    confidence: row.confidence,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    source: row.source,
    evidence: row.evidence || [],
    observationCount: row.observation_count,
    // Joined
    fromNodeName: row.from_node_name,
    toNodeName: row.to_node_name,
});

const mapRowToTestResult = (row: any): ConfiguratorTestResult => ({
    id: row.id,
    configuratorId: row.configurator_id,
    jobId: row.job_id,
    inputConfig: row.input_config,
    status: row.status,
    ourPrice: row.our_price,
    supplierPrice: row.supplier_price,
    priceDifference: row.price_difference,
    priceDifferencePct: row.price_difference_pct,
    screenshots: row.screenshots || [],
    finalScreenshotPath: row.final_screenshot_path,
    pdfPath: row.pdf_path,
    executionLog: row.execution_log || [],
    executionTimeMs: row.execution_time_ms,
    stepsExecuted: row.steps_executed,
    errorType: row.error_type,
    errorDetails: row.error_details,
    selfHealed: row.self_healed,
    healingDetails: row.healing_details,
    createdAt: row.created_at,
});

// ─── camelCase → snake_case helpers for inserts/updates ─────────────────────────

const mapSupplierToRow = (data: Partial<SupplierConfigurator>): Record<string, unknown> => {
    const row: Record<string, unknown> = {};
    if (data.supplier !== undefined) row.supplier = data.supplier;
    if (data.name !== undefined) row.name = data.name;
    if (data.url !== undefined) row.url = data.url;
    if (data.loginUrl !== undefined) row.login_url = data.loginUrl;
    if (data.loginRequired !== undefined) row.login_required = data.loginRequired;
    if (data.credentials !== undefined) row.credentials = data.credentials;
    if (data.status !== undefined) row.status = data.status;
    if (data.confidenceScore !== undefined) row.confidence_score = data.confidenceScore;
    if (data.techStack !== undefined) row.tech_stack = data.techStack;
    if (data.pageStructure !== undefined) row.page_structure = data.pageStructure;
    if (data.lastHealthCheck !== undefined) row.last_health_check = data.lastHealthCheck;
    if (data.lastHealthResult !== undefined) row.last_health_result = data.lastHealthResult;
    if (data.healthCheckIntervalHours !== undefined) row.health_check_interval_hours = data.healthCheckIntervalHours;
    if (data.metadata !== undefined) row.metadata = data.metadata;
    return row;
};

const mapNodeToRow = (data: Partial<ConfigurationNode>): Record<string, unknown> => {
    const row: Record<string, unknown> = {};
    if (data.configuratorId !== undefined) row.configurator_id = data.configuratorId;
    if (data.nodeKey !== undefined) row.node_key = data.nodeKey;
    if (data.nodeType !== undefined) row.node_type = data.nodeType;
    if (data.name !== undefined) row.name = data.name;
    if (data.selectors !== undefined) row.selectors = data.selectors;
    if (data.fieldType !== undefined) row.field_type = data.fieldType;
    if (data.options !== undefined) row.options = data.options;
    if (data.validation !== undefined) row.validation = data.validation;
    if (data.defaultValue !== undefined) row.default_value = data.defaultValue;
    if (data.pageIndex !== undefined) row.page_index = data.pageIndex;
    if (data.section !== undefined) row.section = data.section;
    if (data.orderInSection !== undefined) row.order_in_section = data.orderInSection;
    if (data.isRequired !== undefined) row.is_required = data.isRequired;
    if (data.isConditional !== undefined) row.is_conditional = data.isConditional;
    if (data.businessMeaning !== undefined) row.business_meaning = data.businessMeaning;
    if (data.firstSeenIn !== undefined) row.first_seen_in = data.firstSeenIn;
    if (data.seenCount !== undefined) row.seen_count = data.seenCount;
    if (data.lastSeenAt !== undefined) row.last_seen_at = data.lastSeenAt;
    return row;
};

const mapEdgeToRow = (data: Partial<ConfigurationEdge>): Record<string, unknown> => {
    const row: Record<string, unknown> = {};
    if (data.configuratorId !== undefined) row.configurator_id = data.configuratorId;
    if (data.fromNodeId !== undefined) row.from_node_id = data.fromNodeId;
    if (data.toNodeId !== undefined) row.to_node_id = data.toNodeId;
    if (data.edgeType !== undefined) row.edge_type = data.edgeType;
    if (data.condition !== undefined) row.condition = data.condition;
    if (data.effect !== undefined) row.effect = data.effect;
    if (data.confidence !== undefined) row.confidence = data.confidence;
    if (data.verifiedBy !== undefined) row.verified_by = data.verifiedBy;
    if (data.verifiedAt !== undefined) row.verified_at = data.verifiedAt;
    if (data.source !== undefined) row.source = data.source;
    if (data.evidence !== undefined) row.evidence = data.evidence;
    if (data.observationCount !== undefined) row.observation_count = data.observationCount;
    return row;
};

const mapTestResultToRow = (data: Partial<ConfiguratorTestResult>): Record<string, unknown> => {
    const row: Record<string, unknown> = {};
    if (data.configuratorId !== undefined) row.configurator_id = data.configuratorId;
    if (data.jobId !== undefined) row.job_id = data.jobId;
    if (data.inputConfig !== undefined) row.input_config = data.inputConfig;
    if (data.status !== undefined) row.status = data.status;
    if (data.ourPrice !== undefined) row.our_price = data.ourPrice;
    if (data.supplierPrice !== undefined) row.supplier_price = data.supplierPrice;
    if (data.priceDifference !== undefined) row.price_difference = data.priceDifference;
    if (data.priceDifferencePct !== undefined) row.price_difference_pct = data.priceDifferencePct;
    if (data.screenshots !== undefined) row.screenshots = data.screenshots;
    if (data.finalScreenshotPath !== undefined) row.final_screenshot_path = data.finalScreenshotPath;
    if (data.pdfPath !== undefined) row.pdf_path = data.pdfPath;
    if (data.executionLog !== undefined) row.execution_log = data.executionLog;
    if (data.executionTimeMs !== undefined) row.execution_time_ms = data.executionTimeMs;
    if (data.stepsExecuted !== undefined) row.steps_executed = data.stepsExecuted;
    if (data.errorType !== undefined) row.error_type = data.errorType;
    if (data.errorDetails !== undefined) row.error_details = data.errorDetails;
    if (data.selfHealed !== undefined) row.self_healed = data.selfHealed;
    if (data.healingDetails !== undefined) row.healing_details = data.healingDetails;
    return row;
};

// ─── Service ────────────────────────────────────────────────────────────────────

export const ConfiguratorTrainerService = {

    // ── Suppliers ─────────────────────────────────────────────────────────────

    async getSuppliers(): Promise<SupplierConfigurator[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('supplier_configurators')
            .select('*')
            .order('supplier', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapRowToSupplier);
    },

    async getSupplier(id: string): Promise<SupplierConfigurator | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('supplier_configurators')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return mapRowToSupplier(data);
    },

    async createSupplier(supplierData: Partial<SupplierConfigurator>): Promise<SupplierConfigurator> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const row = mapSupplierToRow(supplierData);
        const { data, error } = await supabase
            .from('supplier_configurators')
            .insert(row)
            .select()
            .single();

        if (error) throw error;
        return mapRowToSupplier(data);
    },

    async updateSupplier(id: string, updates: Partial<SupplierConfigurator>): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const row = mapSupplierToRow(updates);
        row.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('supplier_configurators')
            .update(row)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteSupplier(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('supplier_configurators')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ── Recordings ────────────────────────────────────────────────────────────

    async getRecordings(configuratorId?: string): Promise<ConfiguratorRecording[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        let query = supabase
            .from('configurator_recordings')
            .select('*')
            .order('created_at', { ascending: false });

        if (configuratorId) {
            query = query.eq('configurator_id', configuratorId);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Manual joins: supplier names and recorded_by names
        const configuratorIds = Array.from(new Set(data.map(r => r.configurator_id).filter(Boolean)));
        const userIds = Array.from(new Set(data.map(r => r.recorded_by).filter(Boolean)));

        const supplierMap = new Map<string, string>();
        if (configuratorIds.length > 0) {
            const { data: suppliers } = await supabase
                .from('supplier_configurators')
                .select('id, supplier')
                .in('id', configuratorIds);
            suppliers?.forEach(s => supplierMap.set(s.id, s.supplier));
        }

        const profileMap = new Map<string, string>();
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);
            profiles?.forEach(p => profileMap.set(p.id, p.full_name));
        }

        return data.map(row => ({
            ...mapRowToRecording(row),
            supplierName: row.configurator_id ? supplierMap.get(row.configurator_id) : undefined,
            recordedByName: row.recorded_by ? profileMap.get(row.recorded_by) : undefined,
        }));
    },

    async getRecording(id: string): Promise<ConfiguratorRecording | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('configurator_recordings')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        // Join supplier name
        let supplierName: string | undefined;
        if (data.configurator_id) {
            const { data: supplier } = await supabase
                .from('supplier_configurators')
                .select('supplier')
                .eq('id', data.configurator_id)
                .maybeSingle();
            supplierName = supplier?.supplier;
        }

        // Join recorded_by name
        let recordedByName: string | undefined;
        if (data.recorded_by) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', data.recorded_by)
                .maybeSingle();
            recordedByName = profile?.full_name;
        }

        return {
            ...mapRowToRecording(data),
            supplierName,
            recordedByName,
        };
    },

    async createRecording(configuratorId: string): Promise<ConfiguratorRecording> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('configurator_recordings')
            .insert({
                configurator_id: configuratorId,
                recorded_by: user.id,
                status: 'recording',
                steps: [],
                steps_count: 0,
                pages_visited: 0,
                tags: [],
                final_currency: 'PLN',
            })
            .select()
            .single();

        if (error) throw error;
        return mapRowToRecording(data);
    },

    async updateRecording(id: string, updates: any): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.steps !== undefined) dbUpdates.steps = updates.steps;
        if (updates.finalPrice !== undefined) dbUpdates.final_price = updates.finalPrice;
        if (updates.finalCurrency !== undefined) dbUpdates.final_currency = updates.finalCurrency;
        if (updates.finalConfiguration !== undefined) dbUpdates.final_configuration = updates.finalConfiguration;
        if (updates.finalPdfPath !== undefined) dbUpdates.final_pdf_path = updates.finalPdfPath;
        if (updates.durationMs !== undefined) dbUpdates.duration_ms = updates.durationMs;
        if (updates.stepsCount !== undefined) dbUpdates.steps_count = updates.stepsCount;
        if (updates.pagesVisited !== undefined) dbUpdates.pages_visited = updates.pagesVisited;
        if (updates.aiAnalysis !== undefined) dbUpdates.ai_analysis = updates.aiAnalysis;
        if (updates.aiAnalysisModel !== undefined) dbUpdates.ai_analysis_model = updates.aiAnalysisModel;
        if (updates.aiConfidence !== undefined) dbUpdates.ai_confidence = updates.aiConfidence;
        if (updates.productModel !== undefined) dbUpdates.product_model = updates.productModel;
        if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

        const { error } = await supabase
            .from('configurator_recordings')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    async addRecordingStep(recordingId: string, step: RecordingStep): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Fetch current steps, append new step, update
        const { data: recording, error: fetchError } = await supabase
            .from('configurator_recordings')
            .select('steps, steps_count')
            .eq('id', recordingId)
            .single();

        if (fetchError) throw fetchError;
        if (!recording) throw new Error(`Recording ${recordingId} not found`);

        const currentSteps = recording.steps || [];
        const updatedSteps = [...currentSteps, step];

        const { error } = await supabase
            .from('configurator_recordings')
            .update({
                steps: updatedSteps,
                steps_count: updatedSteps.length,
                updated_at: new Date().toISOString(),
            })
            .eq('id', recordingId);

        if (error) throw error;
    },

    async completeRecording(
        id: string,
        finalData: {
            finalPrice?: number;
            finalConfiguration?: any;
            finalPdfPath?: string;
            durationMs?: number;
        }
    ): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Fetch current recording to count steps
        const { data: recording, error: fetchError } = await supabase
            .from('configurator_recordings')
            .select('steps')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const steps = recording?.steps || [];
        const stepsCount = steps.length;

        // Count unique page URLs visited
        const uniquePages = new Set(steps.map((s: any) => s.pageUrl || s.page_url).filter(Boolean));

        const dbUpdates: Record<string, unknown> = {
            status: 'completed',
            steps_count: stepsCount,
            pages_visited: uniquePages.size,
            updated_at: new Date().toISOString(),
        };

        if (finalData.finalPrice !== undefined) dbUpdates.final_price = finalData.finalPrice;
        if (finalData.finalConfiguration !== undefined) dbUpdates.final_configuration = finalData.finalConfiguration;
        if (finalData.finalPdfPath !== undefined) dbUpdates.final_pdf_path = finalData.finalPdfPath;
        if (finalData.durationMs !== undefined) dbUpdates.duration_ms = finalData.durationMs;

        const { error } = await supabase
            .from('configurator_recordings')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    // ── Configuration Graph: Nodes ────────────────────────────────────────────

    async getNodes(configuratorId: string): Promise<ConfigurationNode[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('configuration_nodes')
            .select('*')
            .eq('configurator_id', configuratorId)
            .order('page_index', { ascending: true })
            .order('order_in_section', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapRowToNode);
    },

    async upsertNode(
        node: Partial<ConfigurationNode> & { configuratorId: string; nodeKey: string }
    ): Promise<ConfigurationNode> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const row = mapNodeToRow(node);

        const { data, error } = await supabase
            .from('configuration_nodes')
            .upsert(row, { onConflict: 'configurator_id,node_key' })
            .select()
            .single();

        if (error) throw error;
        return mapRowToNode(data);
    },

    async deleteNode(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('configuration_nodes')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ── Configuration Graph: Edges ────────────────────────────────────────────

    async getEdges(configuratorId: string): Promise<ConfigurationEdge[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('configuration_edges')
            .select('*')
            .eq('configurator_id', configuratorId);

        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Manual join for node names
        const nodeIds = new Set<string>();
        data.forEach(row => {
            if (row.from_node_id) nodeIds.add(row.from_node_id);
            if (row.to_node_id) nodeIds.add(row.to_node_id);
        });

        const nodeMap = new Map<string, string>();
        if (nodeIds.size > 0) {
            const { data: nodes } = await supabase
                .from('configuration_nodes')
                .select('id, name')
                .in('id', Array.from(nodeIds));
            nodes?.forEach(n => nodeMap.set(n.id, n.name));
        }

        return data.map(row => ({
            ...mapRowToEdge(row),
            fromNodeName: row.from_node_id ? nodeMap.get(row.from_node_id) : undefined,
            toNodeName: row.to_node_id ? nodeMap.get(row.to_node_id) : undefined,
        }));
    },

    async upsertEdge(edge: Partial<ConfigurationEdge>): Promise<ConfigurationEdge> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const row = mapEdgeToRow(edge);

        const { data, error } = await supabase
            .from('configuration_edges')
            .upsert(row)
            .select()
            .single();

        if (error) throw error;
        return mapRowToEdge(data);
    },

    async deleteEdge(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('configuration_edges')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ── Test Results ──────────────────────────────────────────────────────────

    async getTestResults(
        configuratorId: string,
        filters?: { status?: string; limit?: number }
    ): Promise<ConfiguratorTestResult[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        let query = supabase
            .from('configurator_test_results')
            .select('*')
            .eq('configurator_id', configuratorId)
            .order('created_at', { ascending: false })
            .limit(filters?.limit ?? 50);

        if (filters?.status) query = query.eq('status', filters.status);

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(mapRowToTestResult);
    },

    async createTestResult(testData: Partial<ConfiguratorTestResult>): Promise<ConfiguratorTestResult> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const row = mapTestResultToRow(testData);

        const { data, error } = await supabase
            .from('configurator_test_results')
            .insert(row)
            .select()
            .single();

        if (error) throw error;
        return mapRowToTestResult(data);
    },

    async updateTestResult(id: string, updates: Partial<ConfiguratorTestResult>): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const row = mapTestResultToRow(updates);

        const { error } = await supabase
            .from('configurator_test_results')
            .update(row)
            .eq('id', id);

        if (error) throw error;
    },
};
