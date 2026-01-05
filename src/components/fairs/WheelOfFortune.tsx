import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Prize } from '../../services/database/fair.service';

interface WheelOfFortuneProps {
    prizes: Prize[];
    onSpinEnd: (prize: Prize) => void;
}

export const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({ prizes, onSpinEnd }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isSpinning, setIsSpinning] = useState(false);

    // Normalize probabilities to 100%
    const totalProb = prizes.reduce((sum, p) => sum + p.probability, 0);
    const normalizedPrizes = prizes.map(p => ({
        ...p,
        normalizedProb: p.probability / totalProb
    }));

    const drawWheel = useCallback((rotationAngle: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let currentAngle = rotationAngle;
        const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];

        normalizedPrizes.forEach((prize, index) => {
            const sliceAngle = prize.normalizedProb * 2 * Math.PI;

            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            ctx.stroke();

            // Draw Text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(currentAngle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(prize.label, radius - 20, 5);
            ctx.restore();

            currentAngle += sliceAngle;
        });

        // Draw Pointer
        ctx.beginPath();
        ctx.moveTo(centerX + radius + 10, centerY);
        ctx.lineTo(centerX + radius - 10, centerY - 10);
        ctx.lineTo(centerX + radius - 10, centerY + 10);
        ctx.closePath();
        ctx.fillStyle = '#1e293b'; // Slate-800
        ctx.fill();
    };

    useEffect(() => {
        drawWheel(0);
    }, [prizes, drawWheel]);

    const spin = () => {
        if (isSpinning) return;
        setIsSpinning(true);

        const duration = 5000; // 5s spin
        const start = performance.now();
        // Calculate random end angle based on probabilities? 
        // For visual simplicity, we spin fast and land "randomly", then use weighted algo to determine result.

        // Weighted Random Selection
        const random = Math.random();
        let selectedPrize = normalizedPrizes[0];
        let runningSum = 0;
        for (const p of normalizedPrizes) {
            runningSum += p.normalizedProb;
            if (random <= runningSum) {
                selectedPrize = p;
                break;
            }
        }

        // Calculate final rotation to land on selected prize
        // The pointer is at 0 degrees (Right side).
        // To land on prize, the center of its slice must align with 0 degrees.
        // Slice starts at some cumulative angle.

        // Let's keep it simple: Just spin visually for X rotations + Y offset. 
        // Then re-draw the final state specifically to match the selected prize if we want "rigged" visual.
        // OR easier: Just physics simulation and see where it lands.

        // Let's implement weighted RNG first, then force the visual to match.

        // Find "start angle" of the selected prize in the list (if we didn't rotate)
        let prizeStartAngle = 0;
        for (const p of normalizedPrizes) {
            if (p === selectedPrize) break;
            prizeStartAngle += p.normalizedProb * 2 * Math.PI;
        }
        const prizeCenterAngle = prizeStartAngle + (selectedPrize.normalizedProb * 2 * Math.PI) / 2;

        // We want (FinalRotation + PrizeCenterAngle) % 2PI = 0 (Pointer is at 0/360) 
        // So FinalRotation = -PrizeCenterAngle + K * 2PI

        const totalRotations = 10 * 2 * Math.PI; // 10 full spins
        const finalRotation = totalRotations - prizeCenterAngle;

        const animate = (time: number) => {
            const elapsed = time - start;
            if (elapsed < duration) {
                // Easing function (easeOutCubic)
                const t = elapsed / duration;
                const easeOut = 1 - Math.pow(1 - t, 3);

                const currentRot = easeOut * finalRotation;
                drawWheel(currentRot);
                requestAnimationFrame(animate);
            } else {
                drawWheel(finalRotation);
                setIsSpinning(false);
                onSpinEnd(selectedPrize);
            }
        };

        requestAnimationFrame(animate);
    };

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={400}
                    className="max-w-full h-auto"
                />
                {/* Pointer (CSS overlay alternatively) */}
                <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-0 h-0 
                    border-t-[15px] border-t-transparent
                    border-b-[15px] border-b-transparent
                    border-l-[25px] border-l-slate-800"
                />
            </div>

            <button
                onClick={spin}
                disabled={isSpinning}
                className={`mt-6 px-12 py-4 rounded-full text-2xl font-bold shadow-xl transition-transform ${isSpinning
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-105 active:scale-95'}`}
            >
                {isSpinning ? 'KRĘCIMY...' : 'ZAKRĘĆ KOŁEM!'}
            </button>
        </div>
    );
};
