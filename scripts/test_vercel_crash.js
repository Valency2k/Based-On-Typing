const app = require('../backend/server');
const http = require('http');

async function runTest() {
    console.log("🚀 Starting Vercel Simulation...");

    // Mock environment variables if needed
    // process.env.MONGODB_URI = "mongodb://localhost:27017/test"; 

    const server = http.createServer(app);

    server.listen(3002, async () => {
        console.log("✅ Server listening on 3002");

        try {
            console.log("👉 Requesting /api/status...");
            const response = await fetch('http://localhost:3002/api/status');
            const text = await response.text();
            console.log("Response:", response.status, text);
        } catch (err) {
            console.error("❌ Request failed:", err);
        }

        server.close();
        process.exit(0);
    });
}

runTest().catch(err => {
    console.error("❌ Crash detected:", err);
    process.exit(1);
});
