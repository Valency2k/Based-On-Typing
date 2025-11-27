const { ethers } = require('ethers');
const { getContract, isConnected } = require('./blockchain');
const utils = require('./utils');

let listenersAttached = false;
let db;
let collection;
let systemCollection;

function setDb(database) {
    db = database;
    collection = db.collection('leaderboard');
    systemCollection = db.collection('system_state');
    // Create indexes
    collection.createIndex({ playerAddress: 1, mode: 1 });
    collection.createIndex({ mode: 1, score: -1 });
    console.log("✅ Leaderboard initialized (MongoDB Native)");
}

async function initialize() {
    // Initialization handled via setDb
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

// Core logic to process a game completion event (live or synced)
async function processGameCompletion(player, sessionIdBN, wordsTypedBN, accuracyBN, eventTimestampBN) {
    const contract = getContract();
    if (!contract) return;

    console.log('Processing GameCompleted for player:', player);
    try {
        const sessionId = sessionIdBN.toNumber();

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
        const entryData = {
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
            timestamp: Number(session.endTime) || Math.floor(Date.now() / 1000),
            textLength: Number(session.correctWords) // fallback
        };

        if (session.correctCharacters !== undefined) {
            entryData.textLength = Number(session.correctCharacters);
        }

        // Compute score
        entryData.score = utils.calculateGlobalScore({
            wordsTyped: entryData.wordsTyped,
            mistakes: entryData.mistakes,
            accuracy: entryData.accuracyPercent,
            durationSeconds: entryData.durationSeconds,
            correctWords: entryData.correctWords
        });

        // Save to MongoDB
        if (!collection) {
            console.error("❌ Database not initialized");
            return;
        }

        const existing = await collection.findOne({
            playerAddress: entryData.playerAddress,
            mode: entryData.mode,
            timestamp: entryData.timestamp
        });

        if (!existing) {
            await collection.insertOne(entryData);
            console.log(`✅ Saved score for ${player} (Mode: ${entryData.mode}, WPM: ${entryData.wpm})`);
        } else {
            console.log(`ℹ️ Score already exists for ${player}`);
        }

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

    if (!systemCollection) {
        console.error("❌ System collection not initialized");
        return;
    }

    console.log('🔄 Syncing leaderboard...');

    try {
        // Get last synced block
        let startBlock = 0;
        const state = await systemCollection.findOne({ _id: 'leaderboard_sync' });
        const currentBlock = await contract.provider.getBlockNumber();

        if (state && state.lastBlock) {
            startBlock = state.lastBlock + 1;
            console.log(`   Resuming from block ${startBlock}`);
        } else {
            // Default lookback: 10000 blocks (~5.5 hours on Base)
            startBlock = Math.max(0, currentBlock - 10000);
            console.log(`   No sync state. Starting from block ${startBlock}`);
        }

        if (startBlock > currentBlock) {
            console.log("   Already up to date.");
            return;
        }

        const CHUNK_SIZE = 2000;
        let fromBlock = startBlock;
        let totalEvents = 0;

        while (fromBlock <= currentBlock) {
            const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
            console.log(`   Fetching events ${fromBlock} to ${toBlock}...`);

            try {
                const filter = contract.filters.GameCompleted();
                const events = await contract.queryFilter(filter, fromBlock, toBlock);

                for (const event of events) {
                    const { player, sessionId, wordsTyped, accuracy, timestamp } = event.args;
                    await processGameCompletion(player, sessionId, wordsTyped, accuracy, timestamp);
                }

                totalEvents += events.length;

                // Update state
                await systemCollection.updateOne(
                    { _id: 'leaderboard_sync' },
                    { $set: { lastBlock: toBlock } },
                    { upsert: true }
                );

                fromBlock = toBlock + 1;
            } catch (chunkErr) {
                console.error(`   ❌ Error fetching chunk ${fromBlock}-${toBlock}:`, chunkErr.message);
                break;
            }
        }

        console.log(`✅ Leaderboard sync complete. Processed ${totalEvents} events.`);
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
        if (!collection) return res.status(500).json({ success: false, error: "Database not initialized" });

        const limit = Math.min(Number(req.query.limit || 20), 100);
        const offset = Math.max(Number(req.query.offset || 0), 0);
        const period = req.query.period || 'all';

        let query = {};
        if (period === 'weekly') {
            const startOfWeek = getStartOfWeek();
            query.timestamp = { $gte: startOfWeek };
        }

        // Aggregation pipeline to get best score per player
        const pipeline = [
            { $match: query },
            { $sort: { wpm: -1, score: -1 } },
            {
                $group: {
                    _id: "$playerAddress",
                    doc: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$doc" } },
            { $sort: { wpm: -1, score: -1 } },
            { $skip: offset },
            { $limit: limit }
        ];

        const entries = await collection.aggregate(pipeline).toArray();
        const total = await collection.distinct('playerAddress', query).then(l => l.length);

        res.json({ success: true, entries, total });
    } catch (err) {
        console.error("Global leaderboard error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getModeHandler(req, res) {
    try {
        if (!collection) return res.status(500).json({ success: false, error: "Database not initialized" });

        const modeMap = { 'time-limit': 0, 'word-count': 1, 'survival': 2, 'daily-challenge': 3, 'paragraph': 4 };
        const mode = modeMap[req.params.mode];
        if (mode === undefined) return res.status(400).json({ success: false, error: 'Invalid mode' });
        const period = req.query.period || 'all';

        let query = { mode };

        if (mode === 3) { // Daily Challenge
            // For daily challenge, we might want "today's" scores or just all time bests for daily mode?
            // Usually daily challenge is specific to a day.
            // The frontend seems to filter by "today" in the old code.
            const todayStart = new Date().setUTCHours(0, 0, 0, 0) / 1000; // Seconds
            // Actually, timestamp in DB is seconds (from contract) or ms (from Date.now())?
            // Contract uses block.timestamp (seconds).
            // Date.now() is ms.
            // In processGameCompletion: timestamp: Number(session.endTime) || Date.now()
            // session.endTime is seconds. Date.now() is ms.
            // This is a bug in the old code too if mixed.
            // Assuming seconds for now as contract is primary.
            // Let's fix the query to handle seconds.

            // Wait, if we use Date.now() fallback, it's ms.
            // Let's ensure we store seconds.
            // In processGameCompletion: timestamp: Number(session.endTime) || Math.floor(Date.now() / 1000)
        }

        if (period === 'weekly') {
            const startOfWeek = getStartOfWeek();
            query.timestamp = { $gte: startOfWeek };
        }

        // Aggregation for best per player in this mode
        const pipeline = [
            { $match: query },
            { $sort: { wpm: -1, score: -1 } },
            {
                $group: {
                    _id: "$playerAddress",
                    doc: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$doc" } },
            { $sort: { wpm: -1, score: -1 } }
        ];

        const entries = await collection.aggregate(pipeline).toArray();
        res.json({ success: true, entries, total: entries.length });
    } catch (err) {
        console.error("Mode leaderboard error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getPlayerHandler(req, res) {
    try {
        if (!collection) return res.status(500).json({ success: false, error: "Database not initialized" });

        const address = req.params.address;
        // Case insensitive search
        const entries = await collection.find({
            playerAddress: { $regex: new RegExp(`^${address}$`, 'i') }
        }).sort({ wpm: -1, score: -1 }).toArray();

        res.json({ success: true, entries });
    } catch (err) {
        ```javascript
        return;
    }

    console.log('🔄 Syncing leaderboard...');

    try {
        // Get last synced block
        let startBlock = 0;
        const state = await systemCollection.findOne({ _id: 'leaderboard_sync' });
        const currentBlock = await contract.provider.getBlockNumber();

        if (state && state.lastBlock) {
            startBlock = state.lastBlock + 1;
            console.log(`   Resuming from block ${ startBlock } `);
        } else {
            // Default lookback: 10000 blocks (~5.5 hours on Base)
            startBlock = Math.max(0, currentBlock - 10000);
            console.log(`   No sync state.Starting from block ${ startBlock } `);
        }

        if (startBlock > currentBlock) {
            console.log("   Already up to date.");
            return;
        }

        const CHUNK_SIZE = 2000;
        let fromBlock = startBlock;
        let totalEvents = 0;

        while (fromBlock <= currentBlock) {
            const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
            console.log(`   Fetching events ${ fromBlock } to ${ toBlock }...`);

            try {
                const filter = contract.filters.GameCompleted();
                const events = await contract.queryFilter(filter, fromBlock, toBlock);

                for (const event of events) {
                    const { player, sessionId, wordsTyped, accuracy, timestamp } = event.args;
                    await processGameCompletion(player, sessionId, wordsTyped, accuracy, timestamp);
                }

                totalEvents += events.length;

                // Update state
                await systemCollection.updateOne(
                    { _id: 'leaderboard_sync' },
                    { $set: { lastBlock: toBlock } },
                    { upsert: true }
                );

                fromBlock = toBlock + 1;
            } catch (chunkErr) {
                console.error(`   ❌ Error fetching chunk ${ fromBlock } -${ toBlock }: `, chunkErr.message);
                break;
            }
        }

        console.log(`✅ Leaderboard sync complete.Processed ${ totalEvents } events.`);
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
        if (!collection) return res.status(500).json({ success: false, error: "Database not initialized" });

        const limit = Math.min(Number(req.query.limit || 20), 100);
        const offset = Math.max(Number(req.query.offset || 0), 0);
        const period = req.query.period || 'all';

        let query = {};
        if (period === 'weekly') {
            const startOfWeek = getStartOfWeek();
            query.timestamp = { $gte: startOfWeek };
        }

        // Aggregation pipeline to get best score per player
        const pipeline = [
            { $match: query },
            { $sort: { wpm: -1, score: -1 } },
            {
                $group: {
                    _id: "$playerAddress",
                    doc: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$doc" } },
            { $sort: { wpm: -1, score: -1 } },
            { $skip: offset },
            { $limit: limit }
        ];

        const entries = await collection.aggregate(pipeline).toArray();
        const total = await collection.distinct('playerAddress', query).then(l => l.length);

        res.json({ success: true, entries, total });
    } catch (err) {
        console.error("Global leaderboard error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getModeHandler(req, res) {
    try {
        if (!collection) return res.status(500).json({ success: false, error: "Database not initialized" });

        const modeMap = { 'time-limit': 0, 'word-count': 1, 'survival': 2, 'daily-challenge': 3, 'paragraph': 4 };
        const mode = modeMap[req.params.mode];
        if (mode === undefined) return res.status(400).json({ success: false, error: 'Invalid mode' });
        const period = req.query.period || 'all';

        let query = { mode };

        if (mode === 3) { // Daily Challenge
            // For daily challenge, we might want "today's" scores or just all time bests for daily mode?
            // Usually daily challenge is specific to a day.
            // The frontend seems to filter by "today" in the old code.
            const todayStart = new Date().setUTCHours(0, 0, 0, 0) / 1000; // Seconds
            // Actually, timestamp in DB is seconds (from contract) or ms (from Date.now())?
            // Contract uses block.timestamp (seconds).
            // Date.now() is ms.
            // In processGameCompletion: timestamp: Number(session.endTime) || Date.now()
            // session.endTime is seconds. Date.now() is ms.
            // This is a bug in the old code too if mixed.
            // Assuming seconds for now as contract is primary.
            // Let's fix the query to handle seconds.

            // Wait, if we use Date.now() fallback, it's ms.
            // Let's ensure we store seconds.
            // In processGameCompletion: timestamp: Number(session.endTime) || Math.floor(Date.now() / 1000)
        }

        if (period === 'weekly') {
            const startOfWeek = getStartOfWeek();
            query.timestamp = { $gte: startOfWeek };
        }

        // Aggregation for best per player in this mode
        const pipeline = [
            { $match: query },
            { $sort: { wpm: -1, score: -1 } },
            {
                $group: {
                    _id: "$playerAddress",
                    doc: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$doc" } },
            { $sort: { wpm: -1, score: -1 } }
        ];

        const entries = await collection.aggregate(pipeline).toArray();
        res.json({ success: true, entries, total: entries.length });
    } catch (err) {
        console.error("Mode leaderboard error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getPlayerHandler(req, res) {
    try {
        if (!collection) return res.status(500).json({ success: false, error: "Database not initialized" });

        const address = req.params.address;
        // Case insensitive search
        const entries = await collection.find({
            playerAddress: { $regex: new RegExp(`^ ${ address } $`, 'i') }
        }).sort({ wpm: -1, score: -1 }).toArray();

        res.json({ success: true, entries });
    } catch (err) {
        console.error("Player leaderboard error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
}

async function count() {
    if (!collection) return 0;
    return await collection.countDocuments();
}

module.exports = {
    setDb,
    initialize,
    attachEventListeners,
    detachEventListeners,
    syncLeaderboard,
    getGlobalHandler,
    getModeHandler,
    getPlayerHandler,
    count,
    isInitialized: () => !!collection
};
```