import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ResetNotification({ onConfirm }) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.5, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-surface border border-gold/30 rounded-modern-lg p-8 max-w-md w-full shadow-glow-gold relative overflow-hidden text-center"
                >
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />

                    <div className="relative z-10 space-y-6">
                        <motion.h2
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gold via-yellow-200 to-gold"
                        >
                            RESULTS
                        </motion.h2>

                        <p className="text-text-muted">
                            Yesterday's Daily Challenge results are out! Click below to check if you're among the winners.
                        </p>

                        <button
                            onClick={onConfirm}
                            className="w-full py-3 bg-gold text-black font-bold rounded-modern hover:scale-105 transition-transform shadow-glow-gold"
                        >
                            Reveal Winners
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
