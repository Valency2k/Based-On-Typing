import React from 'react';
import { motion } from 'framer-motion';

const MODE_STYLES = {
    timeLimit: {
        glow: 'glow-blue',
        gradient: 'from-primary/20 to-primary/5',
        border: 'border-primary',
        text: 'text-primary'
    },
    wordCount: {
        glow: 'glow-green',
        gradient: 'from-success/20 to-success/5',
        border: 'border-success',
        text: 'text-success'
    },
    survival: {
        glow: 'glow-red',
        gradient: 'from-error/20 to-error/5',
        border: 'border-error',
        text: 'text-error'
    },
    dailyChallenge: {
        glow: 'glow-gold',
        gradient: 'from-gold/20 to-gold/5',
        border: 'border-gold',
        text: 'text-gold'
    },
    paragraph: {
        glow: 'glow-purple',
        gradient: 'from-purple/20 to-purple/5',
        border: 'border-purple',
        text: 'text-purple'
    },
    practice: {
        glow: '',
        gradient: 'from-text-muted/10 to-transparent',
        border: 'border-text-muted/30',
        text: 'text-text-muted'
    }
};

export function GameModeCard({ mode, icon, title, description, onSelect, disabled = false }) {
    const style = MODE_STYLES[mode] || MODE_STYLES.timeLimit;

    return (
        <motion.div
            whileHover={!disabled ? { y: -5 } : {}}
            className={`glass p-6 rounded-modern-lg border ${style.border} ${!disabled ? 'hover:border-primary/50' : ''} transition-colors group relative overflow-hidden ${disabled ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 ${!disabled ? 'group-hover:opacity-100' : ''} transition-opacity`} />

            <div className="relative z-10">
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className={`text-xl font-bold mb-2 ${style.text} ${!disabled ? 'group-hover:text-primary' : ''} transition-colors`}>{title}</h3>
                <p className="text-text-muted text-sm mb-6 min-h-[40px]">{description}</p>

                <button
                    onClick={!disabled ? onSelect : undefined}
                    disabled={disabled}
                    className={`w-full py-2 rounded-modern font-medium transition-all ${disabled
                            ? 'bg-white/5 text-text-muted cursor-not-allowed'
                            : 'bg-white/5 hover:bg-primary hover:text-white'
                        }`}
                >
                    {disabled ? 'Cooldown' : 'Play Now'}
                </button>
            </div>
        </motion.div>
    );
}
