// In production (Vercel), we want relative paths starting with /api
// In local dev, we might want localhost.
// If VITE_API_URL is set, use it.
// If not set, and we are in PROD, use '/api'.
// If not set, and we are in DEV, use 'http://127.0.0.1:3001/api'.

const isProd = import.meta.env.PROD;
const API_URL = import.meta.env.VITE_API_URL || (isProd ? '/api' : 'http://127.0.0.1:3001/api');

export const api = {
    async fetchDailyChallenge() {
        try {
            const response = await fetch(`${API_URL}/daily-challenge`);
            if (!response.ok) {
                console.warn(`API Error: ${response.status} ${response.statusText}`);
                return { success: false, error: 'Failed to fetch daily challenge' };
            }
            return await response.json();
        } catch (error) {
            console.error("API Connection Error (Daily Challenge):", error);
            return { success: false, error: error.message };
        }
    },

    async fetchAIText() {
        try {
            const response = await fetch(`${API_URL}/paragraph/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'ai_paragraph' })
            });
            if (!response.ok) {
                console.warn(`API Error: ${response.status} ${response.statusText}`);
                return null; // Return null on failure for text
            }
            const data = await response.json();
            return data.paragraphText || null;
        } catch (error) {
            console.error("API Connection Error (AI Text):", error);
            return null;
        }
    },

    async submitScore(stats) {
        try {
            if (stats.mode === 'paragraph') {
                const response = await fetch(`${API_URL}/paragraph/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(stats)
                });
                if (!response.ok) throw new Error('Failed to submit score');
                return await response.json();
            }
            return { success: true };
        } catch (error) {
            console.error("API Connection Error (Submit Score):", error);
            return { success: false, error: error.message };
        }
    },

    async fetchLeaderboard(mode, period = 'all') {
        try {
            const response = await fetch(`${API_URL}/leaderboard/${mode}?period=${period}`);
            if (!response.ok) {
                console.warn(`API Error: ${response.status} ${response.statusText}`);
                return { success: false, entries: [] };
            }
            const data = await response.json();
            return data.success ? data : { success: false, entries: [] };
        } catch (error) {
            console.error("API Connection Error (Leaderboard):", error);
            return { success: false, entries: [] };
        }
    },

    async fetchPlayerScores(address) {
        try {
            const response = await fetch(`${API_URL}/leaderboard/player/${address}`);
            if (!response.ok) {
                console.warn(`API Error: ${response.status} ${response.statusText}`);
                return { success: false, entries: [] };
            }
            const data = await response.json();
            return data.success ? data : { success: false, entries: [] };
        } catch (error) {
            console.error("API Connection Error (Player Scores):", error);
            return { success: false, entries: [] };
        }
    },

    async fetchAchievements(address) {
        if (!address) return { success: false, unlocked: [], minted: [] };
        try {
            const response = await fetch(`${API_URL}/achievements/${address}`);
            if (!response.ok) {
                console.warn(`API Error: ${response.status} ${response.statusText}`);
                return { success: false, unlocked: [], minted: [] };
            }
            const data = await response.json();
            return data.success ? data : { success: false, unlocked: [], minted: [] };
        } catch (error) {
            console.error("API Connection Error (Achievements):", error);
            return { success: false, unlocked: [], minted: [] };
        }
    },

    async mintAchievement(playerAddress, achievementId) {
        try {
            const response = await fetch(`${API_URL}/achievements/mint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerAddress, achievementId })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Minting failed');
            }
            return await response.json();
        } catch (error) {
            console.error("API Connection Error (Minting):", error);
            return { success: false, error: error.message };
        }
    }
};
