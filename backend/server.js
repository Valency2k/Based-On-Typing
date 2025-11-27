require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Validate RPC_URL
// Validate RPC_URL check removed as it is handled in blockchain.js

const PORT = process.env.PORT || 3001;

// Environment Validation
const requiredEnv = ['MONGODB_URI'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
    console.error(`❌ CRITICAL: Missing required environment variables: ${missingEnv.join(', ')}`);
    console.error('Server will start in LIMITED MODE (No Database).');
    // process.exit(1); // Don't crash, just run without DB
}

if (!process.env.PRIVATE_KEY) {
    console.warn('⚠️ WARNING: PRIVATE_KEY is missing. The server will run in READ-ONLY mode (no game signing).');
}

// Modular imports
const { MongoClient } = require('mongodb');
const {
    initBlockchain,
    getStatus,
    onProviderConnected,
    onProviderDisconnected,
    signGameResult
} = require('./blockchain');

const leaderboard = require('./leaderboard');
const paragraph = require('./paragraph');
const dailyChallenge = require('./dailyChallenge');
const achievements = require('./achievements');

// MongoDB Connection
const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017/dummy", {
    serverSelectionTimeoutMS: 5000, // Fail fast if IP is blocked
    connectTimeoutMS: 5000
});
let db;
let dbStatus = "Not Started";

async function connectDB() {
    if (!process.env.MONGODB_URI) {
        dbStatus = "Missing MONGODB_URI";
        console.error("❌ DB Status: Missing MONGODB_URI");
        return;
    }

    try {
        dbStatus = "Connecting...";
        console.log("⏳ Connecting to MongoDB...");
        await client.connect();
        db = client.db("basedontyping");
        console.log('✅ MongoDB Connected');
        leaderboard.setDb(db);
        dbStatus = "Connected";
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        dbStatus = `Error: ${err.message}`;
    }
}

let isInitialized = false;

async function ensureInitialized() {
    if (isInitialized) return;

    console.log("⚙️ Initializing Backend...");

    // 1. Connect to MongoDB
    await connectDB();

    // 2. Initialize Blockchain
    await initBlockchain();

    isInitialized = true;
    console.log("✅ Backend Initialized");
}

const app = express();
app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
    // Skip init for health/ping checks to avoid blocking them if DB is down
    if (req.path === '/api/health' || req.path === '/api/ping') {
        return next();
    }

    if (!isInitialized) {
        await ensureInitialized();
    }
    next();
});

// ... (API Router and endpoints remain the same) ...
// RECONSTRUCTING ROUTES REPLACING PLACEHOLDER
app.get('/api/status', async (req, res) => {
    res.json({
        status: 'online',
        db: dbStatus,
        blockchain: await getStatus(),
        initialized: isInitialized
    });
});

app.get('/api/leaderboard/global', leaderboard.getGlobalHandler);
app.get('/api/leaderboard/player/:address', leaderboard.getPlayerHandler);
app.get('/api/leaderboard/:mode', leaderboard.getModeHandler);

app.get('/api/daily-challenge', dailyChallenge.getHandler);

app.post('/api/paragraph/start', paragraph.startHandler);
app.post('/api/paragraph/submit', paragraph.submitHandler);

app.get('/api/achievements/:address', async (req, res) => {
    try {
        const data = await achievements.getAchievements(req.params.address);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error("Achievements Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/achievements/mint', async (req, res) => {
    try {
        const { playerAddress, achievementId } = req.body;
        const result = await achievements.mintAchievement(playerAddress, achievementId);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("Minting Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});


// Start server ONLY if running directly (not imported by Vercel)
if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, '0.0.0.0', async () => {
        console.log(`🚀 Based on Typing Backend running on http://0.0.0.0:${PORT}`);
        await ensureInitialized();
    });
}

module.exports = app;
