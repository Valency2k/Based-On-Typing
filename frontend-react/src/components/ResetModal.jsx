import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export function ResetModal({ type = 'daily', onClose }) {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Play fanfare sound
        try {
            const audio = new Audio('/sounds/reset-fanfare.mp3');
            audio.volume = 0.6;
            audio.play();
        } catch (e) {
            console.warn("Audio play failed", e);
        }

        // Trigger confetti
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#FFD700', '#FFA500', '#FFFFFF']
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#FFD700', '#FFA500', '#FFFFFF']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();

        const fetchData = async () => {
            try {
                // Fetch top 10 for the specific mode/period
                // For daily reset, we might want Daily Challenge winners or just global top 10
                // The user said "show top 10 players with their WPM for everyone to see"
                // Let's assume Daily Challenge winners for Daily reset, and Global Weekly for Weekly reset

                let data;
                if (type === 'daily') {
                    // Fetch Daily Challenge leaderboard
                    data = await api.fetchLeaderboard('daily-challenge', 'all', 10);
                } else {
                    // Fetch Weekly Global leaderboard
                    data = await api.fetchLeaderboard('global', 'weekly', 10);
                }

                if (data.success && Array.isArray(data.entries)) {
                    setLeaders(data.entries);
                }
            } catch (err) {
                console.error("Failed to fetch reset leaders", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [type]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                {/* Confetti is handled by canvas-confetti overlay */}

                <motion.div
                    initial={{ scale: 0.5, y: 100 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-surface border border-gold/30 rounded-modern-lg p-8 max-w-2xl w-full shadow-glow-gold relative overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />

                    <div className="text-center mb-8 relative z-10">
                        <motion.h2
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gold via-yellow-200 to-gold mb-2"
                        >
                            {type === 'daily' ? 'DAILY RESET!' : 'WEEKLY CHAMPIONS!'}
                        </motion.h2>
                        <p className="text-xl text-text-muted">
                            {type === 'daily' ? 'Top Daily Challenge Warriors' : 'Legends of the Week'}
                        </p>
                    </div>

                    {loading ? (
                        <div className="space-y-2 animate-pulse">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-12 bg-white/5 rounded" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar relative z-10">
                            {leaders.length > 0 ? leaders.map((entry, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`flex items-center justify-between p-4 rounded-lg border ${i === 0 ? 'bg-gold/20 border-gold/50' :
                                        i === 1 ? 'bg-slate-400/20 border-slate-400/50' :
                                            i === 2 ? 'bg-orange-700/20 border-orange-700/50' :
                                                'bg-white/5 border-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center font-bold
                                            ${i === 0 ? 'text-gold' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-text-muted'}
                                        `}>
                                            #{i + 1}
                                        </div>
                                        <div className="font-mono">
                                            {entry.playerAddress ? `${entry.playerAddress.slice(0, 6)}...${entry.playerAddress.slice(-4)}` : 'Unknown'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-xs text-text-muted">WPM</div>
                                            <div className="font-bold text-xl text-primary">{entry.wpm}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-text-muted">ACC</div>
                                            <div className="font-bold text-success">{entry.accuracyPercent}%</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="text-center py-10 text-text-muted">
                                    No scores recorded for this period.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 text-center relative z-10">
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-gold text-black font-bold rounded-modern hover:scale-105 transition-transform"
                        >
                            Continue
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
