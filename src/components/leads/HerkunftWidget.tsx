/**
 * "Herkunft & Tracking" panel — shows where a lead came from: auto-tags (channel,
 * SEO segment, region/city), lead temperature, and the captured first-touch
 * attribution (source/medium/campaign, landing page, referrer, gclid). Fed by the
 * website's attribution layer (customer_data.attribution + derived fields).
 * Renders nothing for older leads without attribution.
 */
type Attribution = Record<string, string>;
interface CD {
    attribution?: Attribution;
    tags?: string[];
    seo_segment?: string;
    product_interest?: string;
    region?: string;
    city?: string;
    lead_temperature?: string;
    form_type?: string;
}

const TEMP: Record<string, { label: string; cls: string }> = {
    hot: { label: '🔥 Heiß', cls: 'bg-red-100 text-red-700 border-red-200' },
    warm: { label: '🌤️ Warm', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    cold: { label: '❄️ Kalt', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
};

export function HerkunftWidget({ cd }: { cd: CD }) {
    if (!cd) return null;
    const a = cd.attribution || {};
    const tags = cd.tags || [];
    const hasAttr = Object.keys(a).length > 0;
    if (!tags.length && !hasAttr && !cd.seo_segment && !cd.lead_temperature) return null;

    const rows: Array<[string, string | undefined]> = [
        ['Segment', cd.seo_segment],
        ['Produkt-Interesse', cd.product_interest],
        ['Region / Stadt', [cd.region, cd.city].filter(Boolean).join(' / ') || undefined],
        ['Formular', cd.form_type],
        ['Quelle', [a.first_source, a.first_medium].filter(Boolean).join(' / ') || undefined],
        ['Kampagne', a.first_campaign],
        ['Landingpage', a.first_landing_page],
        ['Aktuelle Seite', a.current_page],
        ['Referrer', a.referrer || a.first_referrer],
        ['Google Ads (gclid)', a.gclid ? '✓ vorhanden' : undefined],
    ].filter(([, v]) => v);

    const temp = cd.lead_temperature ? TEMP[cd.lead_temperature] : null;

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl p-4 mb-3 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📈</span>
                <h4 className="text-sm font-bold text-indigo-900">Herkunft &amp; Tracking</h4>
                {temp && (
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${temp.cls}`}>{temp.label}</span>
                )}
            </div>

            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {tags.map((t) => (
                        <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-700">{t}</span>
                    ))}
                </div>
            )}

            {rows.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {rows.map(([label, value]) => (
                        <div key={label} className="bg-white/80 rounded-lg border border-indigo-100 px-3 py-1.5">
                            <span className="text-[10px] text-indigo-500 uppercase font-semibold block">{label}</span>
                            <span className="text-xs text-slate-800 font-medium break-words">{value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
