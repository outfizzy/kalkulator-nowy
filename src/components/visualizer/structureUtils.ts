import type { ProductConfig } from '../../types';
import { orangestylePricing } from '../../data/orangestyle_pricing';
import { trendstylePricingEntries, trendstylePlusPricingEntries } from '../../data/trendstyle_pricing';
import { topstylePricingEntries } from '../../data/topstyle_pricing';
import { topstyleXlPricingEntries } from '../../data/topstyle_xl_pricing';
import { skystylePricingEntries } from '../../data/skystyle_pricing';

// Simplified map function (duplicated from pricing.ts to avoid circular deps if any, or just for isolation)
function mapSnowZoneToOrangelineZone(snowZoneId?: string): string {
    if (!snowZoneId) return '1a&2';
    const normalized = snowZoneId.toString().toUpperCase();
    const zoneMap: Record<string, string> = {
        '1': '1',
        '2': '1a&2',
        '3': '2a&3',
        'I': '1',
        'II': '1a&2',
        'III': '2a&3',
        'IV': '2a&3',
        'V': '2a&3',
        '1A&2': '1a&2',
        '2A&3': '2a&3'
    };
    return zoneMap[normalized] || '1a&2';
}

export interface StructureSpecs {
    postCount: number;
    rafterCount: number;
    fieldCount: number;
}

export function getStructureSpecs(config: ProductConfig): StructureSpecs {
    // defaults
    // defaults - dynamic fallback to prevent "spreading" if data lookup fails
    // Assume max post spacing approx 3.5m for visual safety
    let posts = Math.max(2, Math.ceil(config.width / 3500) + 1);
    // Assume rafter spacing approx 900mm
    let fields = Math.max(2, Math.ceil(config.width / 900));

    // Special Rule for Topstyle standard:
    // If width <= 7000mm, force 2 posts (no middle post).
    if (config.modelId === 'topstyle' && config.width <= 7000) {
        posts = 2;
    }

    const snowZoneId = config.snowZone || '2';
    const mappedZone = mapSnowZoneToOrangelineZone(snowZoneId);

    let entries: { width: number; depth: number; posts: number; fields: number; snowZone?: string; coverType?: string; mountingType?: string }[] = [];

    // Select Data Source
    if (config.modelId === 'orangestyle') {
        entries = orangestylePricing;
    } else if (config.modelId === 'trendstyle') {
        entries = trendstylePricingEntries;
    } else if (config.modelId === 'trendstyle_plus') {
        entries = trendstylePlusPricingEntries;
    } else if (config.modelId === 'topstyle') {
        entries = topstylePricingEntries;
    } else if (config.modelId === 'topstyle_xl') {
        entries = topstyleXlPricingEntries;
    } else if (config.modelId === 'skystyle') {
        entries = skystylePricingEntries;
    }

    // Filter
    if (entries.length > 0) {
        // Filter by Zone & Roof
        const filtered = entries.filter(p => {
            // Check snow zone if present in entry
            if (p.snowZone && p.snowZone !== mappedZone) return false;
            // Check cover type if present
            if (p.coverType && p.coverType !== config.roofType) return false;
            // Check mounting for Skystyle
            if (p.mountingType && p.mountingType !== config.installationType) return false;
            return true;
        });

        // If skystyle or others return nothing, try less strict? No, strict is good.

        // Find matching size
        // 1. Width >= config.width
        const uniqueWidths = Array.from(new Set(filtered.map(e => e.width))).sort((a, b) => a - b);
        const matchWidth = uniqueWidths.find(w => w >= config.width) || uniqueWidths[uniqueWidths.length - 1];

        if (matchWidth) {
            // 2. Depth >= config.projection
            const entriesForWidth = filtered.filter(e => e.width === matchWidth).sort((a, b) => a.depth - b.depth);
            const matchEntry = entriesForWidth.find(e => e.depth >= config.projection) || entriesForWidth[entriesForWidth.length - 1];

            if (matchEntry) {
                posts = matchEntry.posts;
                fields = matchEntry.fields;
            }
        }
    }

    return {
        postCount: posts,
        fieldCount: fields,
        rafterCount: fields + 1
    };
}
