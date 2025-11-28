import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { GameSession } from '../utils/gameLogic';
import { useSound } from '../hooks/useSound';

export function GameArea({ mode, config, onComplete, onQuit }) {
    const [game, setGame] = useState(null);
    const [stats, setStats] = useState(null);
    const [input, setInput] = useState('');
    const [currentWord, setCurrentWord] = useState('');
    const [wordStatus, setWordStatus] = useState('neutral');

    const [timeRemaining, setTimeRemaining] = useState(null);
    const inputRef = useRef(null);
    const { playClick, playError, playSuccess } = useSound();

    // Initialize game
    useEffect(() => {
        const newGame = new GameSession(mode, config);
        newGame.initialize();

        // Use batched state updates to avoid the linting warning
        const initializeGameState = () => {
            setGame(newGame);
            setCurrentWord(newGame.getCurrentWord());
            setStats(newGame.getProgress());
            setTimeRemaining(config.timeLimit || null);
        };

        initializeGameState();

        setTimeout(() => inputRef.current?.focus(), 100);

        const interval = setInterval(() => {
            if (newGame && newGame.timerStarted && !newGame.completed) {
                const currentStats = newGame.getProgress();
                setStats({ ...currentStats });

                // Update timer based on elapsed time
                if (config.timeLimit) {
                    const elapsed = newGame.getElapsedTime();
                    const remaining = Math.max(0, config.timeLimit - elapsed);
                    setTimeRemaining(remaining);

                    if (remaining <= 0) {
                        newGame.complete();
                        onComplete(newGame.getStats());
                    }
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [mode, config]);

    const handleInput = (e) => {
        const val = e.target.value;
        setInput(val);

        if (!game) return;

        if (currentWord.startsWith(val)) {
            setWordStatus('correct');
        } else {
            setWordStatus('incorrect');
        }

        if (val.endsWith(' ')) {
            const wordToSubmit = val.trim();
            if (wordToSubmit) {
                const result = game.typeWord(wordToSubmit);

                if (result.valid) {
                    if (result.correct) {
                        playClick();
                    } else {
                        playError();

                        toast.error('Mistake!', { id: 'mistake', duration: 1000, icon: '❌' });
                    }

                    if (result.completed || result.gameOver) {
                        playSuccess();
                        confetti({
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 }
                        });
                        onComplete(game.getStats());
                    } else {
                        setInput('');
                        setCurrentWord(result.currentWord);
                        setWordStatus('neutral');
                        setStats(result.progress);
                    }
                }
            } else {
                setInput('');
            }
        }
    };

    if (!game || !stats) return <div className="text-center py-20 text-text-muted">Loading...</div>;

    const wpm = Math.round((stats.correctCharacters / 5) * 60 / (stats.timeElapsed || 1));

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn">
            {/* Top Stats Panel */}
            <div className="flex justify-between items-center mb-8">
                <button
                    onClick={onQuit}
                    className="glass px-4 py-2 rounded-modern text-text-muted hover:text-error transition-colors"
                >
                    ← Back
                </button>

                <div className="flex gap-4">
                    {mode === 'survival' && (
                        <StatBox label="Lives" value={'❤️'.repeat(Math.max(0, 3 - stats.mistakes))} />
                    )}
                    <StatBox label="WPM" value={wpm} highlight />
                    <StatBox label="Accuracy" value={`${stats.accuracy}%`} />
                    <StatBox label="Words" value={`${stats.correctWords}/${stats.totalWords}`} />
                </div>
            </div>

            {/* Timer Circle (if applicable) */}
            {timeRemaining !== null && (
                <div className="flex justify-center mb-8">
                    <CircularTimer
                        total={config.timeLimit}
                        remaining={timeRemaining}
                    />
                </div>
            )}

            {/* Word Display */}
            <div className="mb-12 min-h-[200px] flex flex-col items-center justify-center gap-4">
                {mode === 'paragraph' ? (
                    <div className="text-left max-w-4xl leading-relaxed text-2xl font-mono p-6 glass rounded-lg max-h-[400px] overflow-y-auto">
                        {game && game.words.map((word, index) => {
                            let className = "inline-block mr-2 mb-2 px-1 rounded ";
                            if (index < game.currentWordIndex) {
                                // Completed words
                                className += "text-success opacity-50";
                            } else if (index === game.currentWordIndex) {
                                // Current word
                                className += "bg-primary/20 text-primary font-bold ring-2 ring-primary/50";
                            } else {
                                // Future words
                                className += "text-text-muted opacity-60";
                            }

                            return (
                                <span key={index} className={className}>
                                    {word}
                                </span>
                            );
                        })}
                    </div>
                ) : (
                    <>
                        <div
                            key={currentWord}
                            className="text-center"
                        >
                            <div className="flex gap-1 justify-center text-6xl md:text-8xl font-bold tracking-wider">
                                {currentWord.split('').map((char, index) => {
                                    let charClass = 'text-text-muted opacity-40'; // Not typed yet

                                    if (index < input.length) {
                                        if (input[index] === char) {
                                            charClass = 'text-success'; // Correct
                                        } else {
                                            charClass = 'text-error'; // Wrong
                                        }
                                    } else if (index === input.length) {
                                        charClass = 'text-primary animate-pulse'; // Current character
                                    }

                                    return (
                                        <span
                                            key={index}
                                            className={charClass}
                                        >
                                            {char}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Next Words Preview */}
                        {game && game.words && (
                            <div className="flex gap-4 text-2xl text-text-muted opacity-50">
                                {game.words.slice(game.currentWordIndex + 1, game.currentWordIndex + 3).map((word, i) => (
                                    <span key={i}>{word}</span>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Minimalist Input Bar */}
            <div className="max-w-2xl mx-auto mb-8">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInput}
                    className={`w-full glass px-8 py-6 text-2xl text-center rounded-modern-lg outline-none transition-all focus:shadow-glow-blue ${wordStatus === 'incorrect' ? 'border-2 border-error shadow-glow-red' : 'border-2 border-transparent'
                        }`}
                    placeholder="Start typing..."
                    autoComplete="off"
                    spellCheck="false"
                    autoFocus
                />
            </div>

            {/* Progress Indicators */}
            <div className="max-w-2xl mx-auto">
                <div className="h-2 bg-card rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-purple transition-all duration-300"
                        style={{ width: `${(stats.correctWords / (typeof stats.totalWords === 'number' ? stats.totalWords : 100)) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-sm text-text-muted">
                    <span>Progress</span>
                    <span>{stats.correctWords} words</span>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value, highlight = false }) {
    return (
        <div className={`glass px-6 py-3 rounded-modern ${highlight ? 'border-2 border-primary shadow-glow-blue' : ''}`}>
            <div className="text-xs text-text-muted mb-1">{label}</div>
            <div className={`text-2xl font-bold ${highlight ? 'text-primary' : 'text-text'}`}>
                {value}
            </div>
        </div>
    );
}

function CircularTimer({ total, remaining }) {
    const percentage = (remaining / total) * 100;
    const circumference = 2 * Math.PI * 45; // radius = 45
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
                <circle
                    cx="64"
                    cy="64"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-card"
                />
                <circle
                    cx="64"
                    cy="64"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="text-primary transition-all duration-500 ease-linear"
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">{Math.ceil(remaining)}</span>
            </div>
        </div>
    );
}
