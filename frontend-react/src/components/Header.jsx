import React from 'react';

export function Header({ account, connectWallet, isConnected, quickStats, onDisconnect }) {
    return (
        <header className="border-b border-white/5 bg-card/50 backdrop-blur-md sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 md:h-20 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain drop-shadow-glow-blue" />
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        BasedOn<span className="text-primary">Typing</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-end">
                    {/* Stats Ticker - Visible on mobile now too, but smaller */}
                    <div className="flex gap-3 md:gap-6 text-xs md:text-sm font-medium text-text-muted bg-black/20 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/5 overflow-x-auto">
                        <div className="flex items-center gap-1.5">
                            <span className="text-primary">⚡</span>
                            <span>{quickStats.wpm} <span className="hidden sm:inline">WPM</span></span>
                        </div>
                        <div className="w-px h-3 md:h-4 bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-success">🎯</span>
                            <span>{quickStats.accuracy}%</span>
                        </div>
                        <div className="w-px h-3 md:h-4 bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-gold">🔥</span>
                            <span>{quickStats.streak} <span className="hidden sm:inline">Day Streak</span></span>
                        </div>
                    </div>

                    {/* Wallet Button */}
                    <button
                        onClick={isConnected ? onDisconnect : connectWallet}
                        className={`
                            relative overflow-hidden px-4 py-2 md:px-6 md:py-2.5 rounded-modern font-medium transition-all duration-300 text-sm md:text-base whitespace-nowrap
                            ${isConnected
                                ? 'bg-card border border-primary/30 text-primary hover:bg-primary/10 shadow-glow-blue'
                                : 'bg-primary text-white hover:bg-primary/90 hover:scale-105 shadow-glow-blue'
                            }
                        `}
                    >
                        <div className="relative z-10 flex items-center gap-2">
                            <span>{isConnected ? '🟢' : '🔗'}</span>
                            <span>
                                {isConnected
                                    ? `${account.slice(0, 4)}...${account.slice(-4)}`
                                    : 'Connect'
                                }
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
}
