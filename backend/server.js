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
const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017/dummy"); // Prevent crash on init
let db;
let dbStatus = "Initializing";

async function connectDB() {
    if (!process.env.MONGODB_URI) {
        dbStatus = "Missing MONGODB_URI";
        console.error("❌ DB Status: Missing MONGODB_URI");
        return;
    }

    try {
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
connectDB();

const app = express();
app.use(cors({
    origin: true, // Allow any origin
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (images)

// API Router
const apiRouter = express.Router();

// Metadata Endpoint for NFTs
apiRouter.get('/metadata/:id', (req, res) => {
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
        image: `${process.env.FRONTEND_URL || (req.protocol + '://' + req.get('host'))}/achievements/${id}.png`,
        attributes: [
            { trait_type: "Type", value: achievementNames[id] }
        ]
    };

    res.json(metadata);
});

// Health endpoint
apiRouter.get('/status', async (req, res) => {
    const blockchainStatus = await getStatus();
    res.json({
        status: blockchainStatus,
        database: dbStatus,
        env: {
            hasMongoURI: !!process.env.MONGODB_URI,
            hasPrivateKey: !!process.env.PRIVATE_KEY
        }
    });
});

// Ping endpoint (No dependencies)
apiRouter.get('/ping', (req, res) => {
    res.send('pong');
});

// Leaderboard endpoints
apiRouter.get('/leaderboard', (req, res) => res.redirect('/api/leaderboard/global'));
apiRouter.get('/leaderboard/global', leaderboard.getGlobalHandler);
apiRouter.get('/leaderboard/:mode', leaderboard.getModeHandler);
apiRouter.get('/leaderboard/player/:address', leaderboard.getPlayerHandler);

// Daily Challenge endpoint
apiRouter.get('/daily-challenge', dailyChallenge.getHandler);

// Paragraph endpoints
apiRouter.post('/paragraph/start', paragraph.startHandler);
apiRouter.post('/paragraph/submit', paragraph.submitHandler);

// Achievements endpoint
apiRouter.get('/achievements/:address', async (req, res) => {
    try {
        const { unlocked, minted } = await achievements.getAchievements(req.params.address);
        res.json({ success: true, unlocked, minted });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Mint Achievement Endpoint
apiRouter.post('/achievements/mint', async (req, res) => {
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
apiRouter.post('/game/sign', async (req, res) => {
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

// Mount Router
app.use((req, res, next) => {
    console.log(`[DEBUG] Request: ${req.method} ${req.url}`);
    next();
});
app.use('/api', apiRouter);
app.use('/', apiRouter); // Handle cases where Vercel strips /api prefix

// 404 Handler
app.use((req, res) => {
    console.log(`[DEBUG] 404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: "Route not found", path: req.url });
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
