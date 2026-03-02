import React from 'react';
import { type LedInputs, ROOF_TYPE_CONFIGS } from '../../services/led-calculator.service';

interface LedDiagramProps {
    inputs: LedInputs;
}

export const LedDiagram: React.FC<LedDiagramProps> = ({ inputs }) => {
    const config = ROOF_TYPE_CONFIGS[inputs.roofType];
    const { fieldCount, width, depth } = inputs;

    // SVG dimensions
    const svgW = 600;
    const svgH = 350;
    const padding = 40;

    // Roof area dimensions in SVG space
    const roofW = svgW - padding * 2;
    const roofH = svgH - padding * 2 - 40; // leave room for labels
    const roofX = padding;
    const roofY = padding + 20;

    // Field width in SVG space — fields divide the WIDTH (horizontal axis)
    // Rafters run vertically (along depth), so field divisions are along the width
    const fieldSvgW = roofW / fieldCount;

    // Check if element has LED
    const hasLed = (el: { stripes: number; spots: number } | undefined) =>
        el && (el.stripes > 0 || el.spots > 0);

    // Colors
    const stripeColor = '#f59e0b'; // amber
    const spotColor = '#0ea5e9';   // sky blue
    const elementColor = '#94a3b8'; // slate
    const activeElement = '#475569';
    const wallColor = '#64748b';

    return (
        <div className="relative">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 justify-center">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: stripeColor }} />
                    <span className="text-xs text-slate-500 font-medium">LED Stripe</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spotColor }} />
                    <span className="text-xs text-slate-500 font-medium">LED Spot</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-1.5 rounded-full bg-slate-300" />
                    <span className="text-xs text-slate-500 font-medium">Sparren</span>
                </div>
            </div>

            <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-auto"
                style={{ maxHeight: '320px' }}
            >
                {/* Background */}
                <rect x={0} y={0} width={svgW} height={svgH} fill="#fafafa" rx={12} />

                {/* Roof area (top view) */}
                <rect
                    x={roofX}
                    y={roofY}
                    width={roofW}
                    height={roofH}
                    fill="#f1f5f9"
                    stroke="#cbd5e1"
                    strokeWidth={2}
                    rx={4}
                />

                {/* Wall connection (top side) - horizontal along width */}
                {config.hasWandanschluss && (
                    <g>
                        <rect
                            x={roofX}
                            y={roofY - 8}
                            width={roofW}
                            height={8}
                            fill={hasLed(inputs.wandanschluss) ? '#e2e8f0' : '#f1f5f9'}
                            stroke={wallColor}
                            strokeWidth={2}
                        />
                        <text
                            x={roofX + roofW / 2}
                            y={roofY - 12}
                            textAnchor="middle"
                            fontSize={9}
                            fill={wallColor}
                            fontWeight={600}
                        >
                            🧱 Wand
                        </text>

                        {/* Wandanschluss LED */}
                        {hasLed(inputs.wandanschluss) && (
                            <>
                                {Array.from({ length: inputs.wandanschluss.stripes }, (_, i) => (
                                    <line
                                        key={`wall-stripe-${i}`}
                                        x1={roofX + 20}
                                        y1={roofY - 3 - i * 2}
                                        x2={roofX + roofW - 20}
                                        y2={roofY - 3 - i * 2}
                                        stroke={stripeColor}
                                        strokeWidth={2.5}
                                        strokeLinecap="round"
                                        opacity={0.9}
                                    />
                                ))}
                                {Array.from({ length: inputs.wandanschluss.spots }, (_, i) => (
                                    <circle
                                        key={`wall-spot-${i}`}
                                        cx={roofX + roofW * (i + 1) / (inputs.wandanschluss.spots + 1)}
                                        cy={roofY - 3}
                                        r={3}
                                        fill={spotColor}
                                        opacity={0.9}
                                    />
                                ))}
                            </>
                        )}
                    </g>
                )}

                {/* Rinne (bottom gutter) - horizontal along width */}
                <rect
                    x={roofX}
                    y={roofY + roofH}
                    width={roofW}
                    height={10}
                    fill={hasLed(inputs.rinne) ? '#fef3c7' : '#e2e8f0'}
                    stroke={hasLed(inputs.rinne) ? stripeColor : elementColor}
                    strokeWidth={2}
                    rx={2}
                />
                <text
                    x={roofX + roofW / 2}
                    y={roofY + roofH + 22}
                    textAnchor="middle"
                    fontSize={10}
                    fill={hasLed(inputs.rinne) ? '#92400e' : elementColor}
                    fontWeight={600}
                >
                    🔲 Rinne
                </text>

                {/* Rinne LEDs */}
                {hasLed(inputs.rinne) && (
                    <>
                        {Array.from({ length: inputs.rinne.stripes }, (_, i) => (
                            <line
                                key={`rinne-stripe-${i}`}
                                x1={roofX + 20}
                                y1={roofY + roofH + 3 + i * 2.5}
                                x2={roofX + roofW - 20}
                                y2={roofY + roofH + 3 + i * 2.5}
                                stroke={stripeColor}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                opacity={0.9}
                            />
                        ))}
                        {Array.from({ length: inputs.rinne.spots }, (_, i) => (
                            <circle
                                key={`rinne-spot-${i}`}
                                cx={roofX + roofW * (i + 1) / (inputs.rinne.spots + 1)}
                                cy={roofY + roofH + 5}
                                r={3}
                                fill={spotColor}
                                opacity={0.9}
                            />
                        ))}
                    </>
                )}

                {/* Outer rafter left - VERTICAL (runs along depth) */}
                <rect
                    x={roofX - 4}
                    y={roofY}
                    width={8}
                    height={roofH}
                    fill={hasLed(inputs.aussensparrenLinks) ? '#fef3c7' : '#e2e8f0'}
                    stroke={hasLed(inputs.aussensparrenLinks) ? stripeColor : elementColor}
                    strokeWidth={2}
                    rx={2}
                />
                {hasLed(inputs.aussensparrenLinks) && (
                    <>
                        {Array.from({ length: inputs.aussensparrenLinks.stripes }, (_, i) => (
                            <line
                                key={`asl-stripe-${i}`}
                                x1={roofX - 1 + i * 2}
                                y1={roofY + 10}
                                x2={roofX - 1 + i * 2}
                                y2={roofY + roofH - 10}
                                stroke={stripeColor}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                opacity={0.9}
                            />
                        ))}
                        {Array.from({ length: inputs.aussensparrenLinks.spots }, (_, i) => (
                            <circle
                                key={`asl-spot-${i}`}
                                cx={roofX}
                                cy={roofY + roofH * (i + 1) / (inputs.aussensparrenLinks.spots + 1)}
                                r={3}
                                fill={spotColor}
                                opacity={0.9}
                            />
                        ))}
                    </>
                )}

                {/* Outer rafter right - VERTICAL (runs along depth) */}
                <rect
                    x={roofX + roofW - 4}
                    y={roofY}
                    width={8}
                    height={roofH}
                    fill={hasLed(inputs.aussensparrenRechts) ? '#fef3c7' : '#e2e8f0'}
                    stroke={hasLed(inputs.aussensparrenRechts) ? stripeColor : elementColor}
                    strokeWidth={2}
                    rx={2}
                />
                {hasLed(inputs.aussensparrenRechts) && (
                    <>
                        {Array.from({ length: inputs.aussensparrenRechts.stripes }, (_, i) => (
                            <line
                                key={`asr-stripe-${i}`}
                                x1={roofX + roofW + 1 - i * 2}
                                y1={roofY + 10}
                                x2={roofX + roofW + 1 - i * 2}
                                y2={roofY + roofH - 10}
                                stroke={stripeColor}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                opacity={0.9}
                            />
                        ))}
                        {Array.from({ length: inputs.aussensparrenRechts.spots }, (_, i) => (
                            <circle
                                key={`asr-spot-${i}`}
                                cx={roofX + roofW}
                                cy={roofY + roofH * (i + 1) / (inputs.aussensparrenRechts.spots + 1)}
                                r={3}
                                fill={spotColor}
                                opacity={0.9}
                            />
                        ))}
                    </>
                )}

                {/* Mittelsparren (center rafters) - VERTICAL lines dividing width into fields */}
                {config.hasMittelsparren && inputs.mittelsparren.map((ms, idx) => {
                    const xPos = roofX + fieldSvgW * (idx + 1);
                    const hasMs = hasLed(ms);

                    return (
                        <g key={`ms-${idx}`}>
                            {/* Rafter line - vertical */}
                            <line
                                x1={xPos}
                                y1={roofY + 8}
                                x2={xPos}
                                y2={roofY + roofH - 8}
                                stroke={hasMs ? activeElement : '#cbd5e1'}
                                strokeWidth={hasMs ? 3 : 1.5}
                                strokeDasharray={hasMs ? undefined : '6 4'}
                            />
                            {hasMs && (
                                <>
                                    {/* LED stripes - parallel vertical lines next to rafter */}
                                    {Array.from({ length: ms.stripes }, (_, i) => (
                                        <line
                                            key={`ms${idx}-stripe-${i}`}
                                            x1={xPos + 3 + i * 2.5}
                                            y1={roofY + 15}
                                            x2={xPos + 3 + i * 2.5}
                                            y2={roofY + roofH - 15}
                                            stroke={stripeColor}
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                            opacity={0.9}
                                        />
                                    ))}
                                    {/* LED spots - along the rafter */}
                                    {Array.from({ length: ms.spots }, (_, i) => (
                                        <circle
                                            key={`ms${idx}-spot-${i}`}
                                            cx={xPos}
                                            cy={roofY + roofH * (i + 1) / (ms.spots + 1)}
                                            r={3}
                                            fill={spotColor}
                                            opacity={0.9}
                                        />
                                    ))}
                                </>
                            )}
                        </g>
                    );
                })}

                {/* Dimension labels */}
                {/* Width */}
                <text
                    x={roofX + roofW / 2}
                    y={14}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#64748b"
                    fontWeight={600}
                    fontFamily="monospace"
                >
                    ← {width} mm →
                </text>

                {/* Depth */}
                <text
                    x={svgW - 12}
                    y={roofY + roofH / 2}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#64748b"
                    fontWeight={600}
                    fontFamily="monospace"
                    transform={`rotate(90, ${svgW - 12}, ${roofY + roofH / 2})`}
                >
                    ← {depth} mm →
                </text>

                {/* Roof type label */}
                <text
                    x={roofX + roofW / 2}
                    y={roofY + roofH / 2}
                    textAnchor="middle"
                    fontSize={12}
                    fill="#94a3b8"
                    fontWeight={700}
                    opacity={0.3}
                >
                    {config.labelDE}
                </text>

                {/* Field count labels - centered in each field along the width */}
                {Array.from({ length: fieldCount }, (_, i) => (
                    <text
                        key={`field-label-${i}`}
                        x={roofX + fieldSvgW * i + fieldSvgW / 2}
                        y={roofY + roofH - 8}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#94a3b8"
                        fontWeight={500}
                    >
                        F{i + 1}
                    </text>
                ))}
            </svg>
        </div>
    );
};
