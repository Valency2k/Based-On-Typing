const { ethers } = require('ethers');
const { getContract } = require('./blockchain');

// Simple rotation of challenges for now
const CHALLENGES = [
    "The quick brown fox jumps over the lazy dog. This is a classic pangram used to test typing speed and accuracy.",
    "To be or not to be, that is the question. Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune.",
    "All that glitters is not gold. Often have you heard that told. Many a man his life hath sold but my outside to behold.",
    "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.",
    "In the beginning God created the heaven and the earth. And the earth was without form, and void; and darkness was upon the face of the deep."
];

function getDailyChallengeText() {
    // Use the date to select a challenge
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    return CHALLENGES[dayOfYear % CHALLENGES.length];
}

const leaderboard = require('./leaderboard');

async function getHandler(req, res) {
    try {
        const contract = getContract();
        // Optional: Verify with contract if needed, but for now just return the text
        // const todayChallenge = await contract.getTodayChallenge();

        const text = getDailyChallengeText();
        const wordCount = text.split(' ').length;

        // Fetch top 10 daily challenge scores
        const dailyScores = await leaderboard.getTopScores(3, 10);

        res.json({
            text,
            wordCount,
            timeLimit: 60, // Default for daily challenge
            difficulty: "Normal", // Add difficulty field
            date: new Date().toISOString().split('T')[0],
            leaderboard: dailyScores.map(e => ({
                address: e.playerAddress,
                wpm: e.wpm,
                accuracy: e.accuracyPercent
            }))
        });
    } catch (err) {
        console.error("Daily Challenge Error:", err);
        res.status(500).json({ error: 'Failed to get daily challenge' });
    }
}

module.exports = { getHandler };
