import React from 'react';
import type { StructuralZoneResult } from '../../services/structural-zones.service';

interface StructuralZoneBadgeProps {
    zones: StructuralZoneResult | null;
    compact?: boolean; // Smaller version for inline use
}

/**
 * Displays wind zone, snow zone badges and structural recommendation warning.
 * DIN EN 1991-1-3 (Snow) / DIN EN 1991-1-4 (Wind)
 */
export const StructuralZoneBadge: React.FC<StructuralZoneBadgeProps> = ({ zones, compact }) => {
    if (!zones) return null;

    const { wind, snow, recommendation, warningMessage } = zones;

    const isWarning = recommendation === 'reinforced' || recommendation === 'heavy-duty';
    const isHeavy = recommendation === 'heavy-duty';

    return (
        <div className={`space-y-2 ${compact ? 'text-xs' : 'text-sm'}`}>
            {/* Zone Badges */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Wind Zone */}
                <div className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold
                    ${wind.zone >= 3 ? 'bg-red-50 text-red-700 border border-red-200' :
                      wind.zone >= 2 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-sky-50 text-sky-700 border border-sky-200'}
                `}>
                    <svg className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
                    </svg>
                    <span>WZ{wind.zone}</span>
                    <span className="opacity-70">·</span>
                    <span className="font-bold">{wind.speedKmh} km/h</span>
                </div>

                {/* Snow Zone */}
                <div className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold
                    ${['3', '2a'].includes(snow.zone) ? 'bg-red-50 text-red-700 border border-red-200' :
                      ['2', '1a'].includes(snow.zone) ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'}
                `}>
                    <svg className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
                        <path d="M8 16h.01M8 20h.01M12 18h.01M12 22h.01M16 16h.01M16 20h.01" />
                    </svg>
                    <span>SLZ{snow.zone.toUpperCase()}</span>
                    <span className="opacity-70">·</span>
                    <span className="font-bold">{snow.loadKn.toFixed(2)} kN/m²</span>
                </div>

                {/* Recommendation badge */}
                <div className={`
                    inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold
                    ${isHeavy ? 'bg-red-100 text-red-800 border border-red-300' :
                      isWarning ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'}
                `}>
                    {isHeavy ? '🔴' : isWarning ? '🟡' : '🟢'}
                    <span>
                        {isHeavy ? 'Verstärkt empfohlen' : isWarning ? 'Erhöhte Last' : 'Standard'}
                    </span>
                </div>
            </div>

            {/* Warning Banner */}
            {warningMessage && (
                <div className={`
                    flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl
                    ${isHeavy
                        ? 'bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200'
                        : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200'}
                `}>
                    <span className="text-lg flex-shrink-0 mt-0.5">{isHeavy ? '⚠️' : '💡'}</span>
                    <div>
                        <p className={`font-bold ${isHeavy ? 'text-red-800' : 'text-amber-800'} ${compact ? 'text-xs' : 'text-sm'}`}>
                            {isHeavy ? 'Empfehlung: Verstärkte Konstruktion' : 'Hinweis zur Statik'}
                        </p>
                        <p className={`${isHeavy ? 'text-red-700' : 'text-amber-700'} mt-0.5 leading-relaxed ${compact ? 'text-[11px]' : 'text-xs'}`}>
                            {warningMessage}
                        </p>
                        <p className={`opacity-50 mt-1 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                            Gemäß DIN EN 1991-1-3/NA &amp; DIN EN 1991-1-4/NA
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
