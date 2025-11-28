import React, { createContext, useContext, useState } from 'react';

const StatsContext = createContext();

export function StatsProvider({ children }) {
    const [quickStats, setQuickStats] = useState(() => {
        try {
            const saved = localStorage.getItem('quickStats');
            const savedDate = localStorage.getItem('statsDate');
            const now = new Date();
            const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().split('T')[0];

            if (saved) {
                let parsed = JSON.parse(saved);

                // Daily Reset for WPM and Accuracy
                if (savedDate !== todayUTC) {
                    parsed.wpm = 0;
                    parsed.accuracy = 0;
                    localStorage.setItem('statsDate', todayUTC);
                }

                // Validate streak on load
                const yesterday = new Date(now);
                yesterday.setUTCDate(now.getUTCDate() - 1);
                const yesterdayUTC = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate())).toISOString().split('T')[0];

                const lastPlayed = localStorage.getItem('lastStreakDate');

                // If last played was before yesterday, streak is broken
                if (lastPlayed && lastPlayed < yesterdayUTC) {
                    parsed.streak = 0;
                }

                // Save any changes
                localStorage.setItem('quickStats', JSON.stringify(parsed));
                return parsed;
            }
        } catch (e) {
            console.error("Failed to load stats:", e);
        }

        return {
            wpm: 0,
            accuracy: 0,
            streak: 0,
            totalGames: 0
        };
    });

    const updateStats = (newGameStats) => {
        setQuickStats(prev => {
            // Ignore practice mode for streak
            if (newGameStats.mode === 'practice') {
                return prev;
            }

            const now = new Date();
            const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().split('T')[0];
            const lastPlayed = localStorage.getItem('lastStreakDate');

            let newStreak = prev.streak;

            if (lastPlayed !== todayUTC) {
                // Check if it's consecutive (yesterday)
                const yesterday = new Date(now);
                yesterday.setUTCDate(now.getUTCDate() - 1);
                const yesterdayUTC = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate())).toISOString().split('T')[0];

                if (lastPlayed === yesterdayUTC) {
                    newStreak += 1;
                } else {
                    // Missed a day or first time
                    newStreak = 1;
                }
                localStorage.setItem('lastStreakDate', todayUTC);
            }
            // If lastPlayed === todayUTC, do nothing (already incremented for today)

            // Update stats date to today
            localStorage.setItem('statsDate', todayUTC);

            const newWpm = Math.max(prev.wpm, newGameStats.wpm);
            const newAccuracy = Math.max(prev.accuracy, newGameStats.accuracy);
            const newTotal = (prev.totalGames || 0) + 1;

            const newState = {
                wpm: newWpm,
                accuracy: newAccuracy,
                streak: newStreak,
                totalGames: newTotal
            };

            localStorage.setItem('quickStats', JSON.stringify(newState));
            return newState;
        });
    };

    const resetStreak = () => {
        setQuickStats(prev => {
            const newState = { ...prev, streak: 0 };
            localStorage.setItem('quickStats', JSON.stringify(newState));
            return newState;
        });
    };

    return (
        <StatsContext.Provider value={{ quickStats, updateStats, resetStreak }}>
            {children}
        </StatsContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStats() {
    return useContext(StatsContext);
}
