const fs = require('fs').promises;
const path = require('path');
const { ethers } = require('ethers');
const { getContract, getWallet, isConnected } = require('./blockchain');
const utils = require('./utils');

const FILE_PATH = path.join(__dirname, 'leaderboard.json');
let listenersAttached = false;

// Helper to read leaderboard file safely
async function readFileSafe() {
    try {
        const data = await fs.readFile(FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        console.error('Error reading leaderboard file:', error);
        return [];
    }
}

// Helper to write leaderboard file safely
async function writeFileSafe(data) {
    try {
        await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing leaderboard file:', error);
    }
}

async function initialize() {
    try {
        await fs.access(FILE_PATH);
    } catch {
        await writeFileSafe([]);
    }
}

function getStartOfWeek() {
    const now = new Date();
    const day = now.getUTCDay() || 7; // Make Sunday 7
    if (day !== 1) {
        now.setUTCDate(now.getUTCDate() - (day - 1));
    }
    now.setUTCHours(0, 0, 0, 0);
    return Math.floor(now.getTime() / 1000);
}

// Helper to deduplicate list for display (Best per player per mode)
function deduplicateForDisplay(list) {
    const unique = {};
    list.forEach(entry => {
        const key = `${entry.playerAddress.toLowerCase()}_${entry.mode}`;
        if (!unique[key] || entry.wpm > unique[key].wpm || (entry.wpm === unique[key].wpm && entry.score > unique[key].score)) {
            unique[key] = entry;
        }
    });
    return Object.values(unique);
}

function cleanupLeaderboard(list) {
    const startOfWeek = getStartOfWeek();
    const groups = {};

    // Group by player and mode
    list.forEach(entry => {
        const key = `${entry.playerAddress.toLowerCase()}_${entry.mode}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(entry);
    });

    const cleanedList = [];

    Object.values(groups).forEach(group => {
        // 1. Find All-Time Best
        group.sort((a, b) => b.wpm - a.wpm || b.score - a.score || b.timestamp - a.timestamp);
        const bestAllTime = group[0];
        cleanedList.push(bestAllTime);

        // 2. Find Weekly Best (if different)
        const weeklyEntries = group.filter(e => e.timestamp >= startOfWeek);
        if (weeklyEntries.length > 0) {
            weeklyEntries.sort((a, b) => b.wpm - a.wpm || b.score - a.score || b.timestamp - a.timestamp);
            const bestWeekly = weeklyEntries[0];

            // Only add if it's a different entry object (check timestamp/score to be sure)
            if (bestWeekly.timestamp !== bestAllTime.timestamp || bestWeekly.score !== bestAllTime.score) {
                cleanedList.push(bestWeekly);
            }
        }
    });

    return cleanedList;
}

// Core logic to process a game completion event (live or synced)
async function processGameCompletion(player, sessionIdBN, wordsTypedBN, accuracyBN, eventTimestampBN) {
    const contract = getContract();
    if (!contract) return;

    console.log('Processing GameCompleted for player:', player);
    try {
        const sessionId = sessionIdBN.toNumber();

        // Check if we already have this session to avoid unnecessary RPC calls
        const list = await readFileSafe();

        // Fetch full session details from contract
        const session = await contract.getGameSession(player, sessionId);

        // Defensive checks
        if (!session || session.player === ethers.constants.AddressZero) {
            console.warn('Skipping empty session:', { player, sessionId });
            return;
        }

        if (!session.completed) {
            console.warn('Skipping incomplete session:', { player, sessionId });
            return;
        }

        // Validate data
        if (session.wordsTyped <= 0 || session.duration <= 0 || session.wpm <= 0) {
            console.warn('Skipping invalid session metrics:', { player, sessionId });
            return;
        }

        // Normalize session fields
        const entry = {
            playerAddress: session.player,
            mode: Number(session.mode),
            wordsTyped: Number(session.wordsTyped),
            correctWords: Number(session.correctWords),
            mistakes: Number(session.mistakes),
            accuracy: Number(session.accuracy),
            accuracyPercent: Number(session.accuracy) / 100,
            wpm: Number(session.wpm),
            score: 0,
            durationSeconds: Number(session.duration),
            timestamp: Number(session.endTime) || Date.now(),
            textLength: Number(session.correctWords) // fallback
        };

        if (session.correctCharacters !== undefined) {
            entry.textLength = Number(session.correctCharacters);
        }

        // Compute score
        entry.score = utils.calculateGlobalScore({
            wordsTyped: entry.wordsTyped,
            mistakes: entry.mistakes,
            accuracy: entry.accuracyPercent,
            durationSeconds: entry.durationSeconds,
            correctWords: entry.correctWords
        });

        // Update leaderboard file
        let currentList = await readFileSafe();

        // Add new entry
        currentList.push(entry);

        // Smart Cleanup: Keep Best All-Time AND Best Weekly per player/mode
        currentList = cleanupLeaderboard(currentList);

        currentList.sort((a, b) => b.wpm - a.wpm || b.score - a.score || b.timestamp - a.timestamp);
        await writeFileSafe(currentList);

    } catch (err) {
        console.error('Error processing game completion:', err);
    }
}

// Sync past events from contract
async function syncLeaderboard() {
    const contract = getContract();
    if (!contract || !isConnected()) {
        console.log('Cannot sync: contract/provider unavailable');
        return;
    }

    console.log('🔄 Syncing leaderboard from blockchain history (last 2000 blocks)...');
    try {
        const filter = contract.filters.GameCompleted();
        // Reduced range to avoid rate limits and timeouts
        const events = await contract.queryFilter(filter, -2000);

        console.log(`Found ${events.length} historical GameCompleted events.`);

        for (const event of events) {
            const { player, sessionId, wordsTyped, accuracy, timestamp } = event.args;
            await processGameCompletion(player, sessionId, wordsTyped, accuracy, timestamp);
        }

        console.log('✅ Leaderboard sync complete.');
    } catch (err) {
        console.error('❌ Error syncing leaderboard:', err.message);
    }
}

function attachEventListeners() {
    if (listenersAttached) return;
    const contract = getContract();
    if (contract) {
        contract.on("GameCompleted", processGameCompletion);
        listenersAttached = true;
        console.log("✅ Leaderboard listeners attached.");
    } else {
        console.warn("⚠️ Cannot attach listeners: Contract not initialized.");
    }
}

function detachEventListeners() {
    if (!listenersAttached) return;
    const contract = getContract();
    if (contract) {
        contract.off("GameCompleted", processGameCompletion);
        listenersAttached = false;
        console.log("🛑 Leaderboard listeners detached.");
    }
}

async function getGlobalHandler(req, res) {
    try {
        const limit = Math.min(Number(req.query.limit || 20), 100);
        const offset = Math.max(Number(req.query.offset || 0), 0);
        const period = req.query.period || 'all';

        let data = await readFileSafe();

        if (period === 'weekly') {
            const startOfWeek = getStartOfWeek();
            data = data.filter(e => e.timestamp >= startOfWeek);
        }

        // Deduplicate: Show only best score per player for the selected period
        data = deduplicateForDisplay(data);

        data.sort((a, b) => b.wpm - a.wpm || b.score - a.score || b.timestamp - a.timestamp);
        res.json({ success: true, entries: data.slice(offset, offset + limit), total: data.length });
    } catch {
        res.status(500).json({ success: false });
    }
}

async function getModeHandler(req, res) {
    try {
        const modeMap = { 'time-limit': 0, 'word-count': 1, 'survival': 2, 'daily-challenge': 3, 'paragraph': 4 };
        const mode = modeMap[req.params.mode];
        if (mode === undefined) return res.status(400).json({ success: false, error: 'Invalid mode' });
        const period = req.query.period || 'all';

        let data = await readFileSafe();
        data = data.filter((e) => e.mode === mode);

        // Additional filter for Daily Challenge to ensure only today's scores are shown
        if (mode === 3) {
            const todayStart = new Date().setUTCHours(0, 0, 0, 0);
            data = data.filter(e => {
                const entryDate = new Date(e.timestamp * 1000).setUTCHours(0, 0, 0, 0);
                return entryDate === todayStart;
            });
        } else if (period === 'weekly') {
            const startOfWeek = getStartOfWeek();
            data = data.filter(e => e.timestamp >= startOfWeek);
        }

        // Deduplicate: Show only best score per player for the selected period
        data = deduplicateForDisplay(data);

        data.sort((a, b) => b.wpm - a.wpm || b.score - a.score || b.timestamp - a.timestamp);
        res.json({ success: true, entries: data, total: data.length });
    } catch {
        res.status(500).json({ success: false });
    }
}

async function getPlayerHandler(req, res) {
    try {
        const address = req.params.address;
        const data = await readFileSafe();
        const filtered = data.filter((e) => e.playerAddress.toLowerCase() === address.toLowerCase());
        filtered.sort((a, b) => b.wpm - a.wpm || b.score - a.score);
        res.json({ success: true, entries: filtered });
    } catch {
        res.status(500).json({ success: false });
    }
}

async function count() {
    const data = await readFileSafe();
    return data.length;
}

module.exports = {
    initialize,
    attachEventListeners,
    detachEventListeners,
    syncLeaderboard,
    getGlobalHandler,
    getModeHandler,
    getPlayerHandler,
    count,
    readFileSafe,
    writeFileSafe
};