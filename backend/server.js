require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Validate RPC_URL
// Validate RPC_URL check removed as it is handled in blockchain.js

const PORT = process.env.PORT || 3001;

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
const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("basedontyping"); // Explicitly select DB if needed, or rely on URI
        console.log('✅ MongoDB Connected (Native Driver)');
        // Share db instance with modules
        leaderboard.setDb(db);
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
    }
}
connectDB();

const app = express();
app.use(cors({
    origin: true, // Allow any origin
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (images)

// Metadata Endpoint for NFTs
app.get('/api/metadata/:id', (req, res) => {
    const id = req.params.id;
    const achievementNames = {
        "1": "First Steps",
        "2": "Speed Demon",
        "3": "Perfectionist",
        "4": "Marathon Runner",
        "5": "Survivor",
        "6": "Daily Champion"
    };

    if (!achievementNames[id]) {
        return res.status(404).json({ error: "Achievement not found" });
    }

    const metadata = {
        name: `Typing Achievement: ${achievementNames[id]}`,
        description: "Awarded for mastering the Based On Typing game.",
        image: `${req.protocol}://${req.get('host')}/achievements/${id}.png`,
        attributes: [
            { trait_type: "Type", value: achievementNames[id] }
        ]
    };

    res.json(metadata);
});

// CSP Middleware to allow development connections
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';"
    );
    next();
});

// Root endpoint to fix 404 and CSP issues
app.get('/', (req, res) => {
    res.send('Based on Typing Backend is Running!');
});

// Handle Chrome DevTools requests to prevent errors
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(404).send();
});

// Health endpoint
app.get('/api/status', async (req, res) => {
    const status = await getStatus();
    res.json({ status });
});

// Leaderboard endpoints
app.get('/api/leaderboard', (req, res) => res.redirect('/api/leaderboard/global')); // Redirect base path to global
app.get('/api/leaderboard/global', leaderboard.getGlobalHandler);
app.get('/api/leaderboard/:mode', leaderboard.getModeHandler);
app.get('/api/leaderboard/player/:address', leaderboard.getPlayerHandler);

// Daily Challenge endpoint
app.get('/api/daily-challenge', dailyChallenge.getHandler);

// Paragraph endpoints
app.post('/api/paragraph/start', paragraph.startHandler);
app.post('/api/paragraph/submit', paragraph.submitHandler);
// app.get('/api/paragraph/:sessionId', paragraph.getHandler); // Not implemented yet?

// Achievements endpoint
app.get('/api/achievements/:address', async (req, res) => {
    try {
        const { unlocked, minted } = await achievements.getAchievements(req.params.address);
        res.json({ success: true, unlocked, minted });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Mint Achievement Endpoint
app.post('/api/achievements/mint', async (req, res) => {
    try {
        const { playerAddress, achievementId } = req.body;
        if (!playerAddress || !achievementId) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        const { signature, fee } = await achievements.mintAchievement(playerAddress, achievementId);
        res.json({ success: true, signature, fee });
    } catch (err) {
        console.error('Minting failed:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Game Signing endpoint
app.post('/api/game/sign', async (req, res) => {
    try {
        const { player, sessionId, wordsTyped, correctWords, mistakes, correctCharacters, wpm } = req.body;

        if (!player || sessionId === undefined || wpm === undefined) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        const signature = await signGameResult(player, sessionId, wordsTyped, correctWords, mistakes, correctCharacters, wpm);
        res.json({ success: true, signature });
    } catch (err) {
        console.error('Game signing failed:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

let isInitialized = false;
async function ensureInitialized() {
    if (isInitialized) return;
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
        // Initialize immediately when running locally
        await ensureInitialized();
    });
}

module.exports = app;
