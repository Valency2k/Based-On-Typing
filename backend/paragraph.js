const { v4: uuidv4 } = require('uuid');
const ai = require('./ai');
const utils = require('./utils');

const sessions = new Map();

async function startHandler(req, res) {
    try {
        const { timeLimit, playerAddress } = req.body;
        const valid = [15, 30, 45, 60, 120, 180];
        // Only validate if timeLimit is provided (it's optional for paragraph mode)
        if (timeLimit && !valid.includes(timeLimit))
            return res.status(400).json({ error: 'Invalid time limit' });

        const paragraphText = await ai.generateAIParagraph();
        const hash = utils.hashParagraph(paragraphText);
        const feeWei = await utils.calculateFee();

        const sessionId = `${playerAddress || 'anon'}_${Date.now()}_${uuidv4()}`;

        sessions.set(sessionId, {
            paragraphText,
            paragraphHash: hash,
            timeLimit,
            playerAddress,
            startTime: Date.now(),
            completed: false
        });

        res.json({
            success: true,
            sessionId,
            paragraphText,
            paragraphHash: hash,
            timeLimit,
            feeWei
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to start session' });
    }
}

async function submitHandler(req, res) {
    try {
        const { sessionId, typedText } = req.body;
        const session = sessions.get(sessionId);

        if (!session) return res.status(404).json({ error: 'Session not found' });

        const metrics = utils.calculateTypingMetrics(
            session.paragraphText,
            typedText
        );

        session.completed = true;
        session.results = metrics;

        res.json({
            success: true,
            metrics,
            originalParagraph: session.paragraphText
        });
    } catch (err) {
        res.status(500).json({ error: 'Submit failed' });
    }
}

function getHandler(req, res) {
    const session = sessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Not found' });

    res.json({
        paragraphText: session.paragraphText,
        paragraphHash: session.paragraphHash,
        timeLimit: session.timeLimit
    });
}

module.exports = { startHandler, submitHandler, getHandler };
