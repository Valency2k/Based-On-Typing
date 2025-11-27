require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

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

// ... (API Router and endpoints remain the same) ...

let isInitialized = false;
async function ensureInitialized() {
    if (isInitialized) return;

    // 1. Connect DB
    if (dbStatus !== "Connected") {
        await connectDB();
    }

    // 2. Init Blockchain
    try {
        await initBlockchain();
        await leaderboard.initialize();
        isInitialized = true;
        console.log('✅ Server initialized');
    } catch (err) {
        console.error('❌ Initialization failed:', err);
    }
}

// Middleware to ensure initialization
app.use(async (req, res, next) => {
    // Skip init for health/status checks to avoid blocking them if DB is down
    if (req.path === '/api/status' || req.path === '/api/health' || req.path === '/api/ping') {
        return next();
    }

    if (!isInitialized) {
        await ensureInitialized();
    }
    next();
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
