const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// Load contract ABI and address
const contractABIJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'contractABI.json'), 'utf8'));
const CONTRACT_ABI = contractABIJson.abi || contractABIJson; // Handle both formats
const CONTRACT_ADDRESS = '0x82ca85c51d6018888fD3A9281156E8e358BFcb42';

// Global state
let provider;
let contract;
let achievementContract;
let wallet;
let connected = false;
const internalEmitter = new EventEmitter();

async function initBlockchain() {
    // List of reliable public RPCs
    const rpcUrls = [
        "https://mainnet.base.org"
    ];

    // Pick a random one to start with to distribute load
    const rpcUrl = rpcUrls[0];
    console.log(`Using RPC: ${rpcUrl}`);

    provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // READ-ONLY CONTRACT
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    // ENABLE WRITING (IF PRIVATE KEY IS PRESENT)
    if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length > 10) {
        try {
            wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            contract = contract.connect(wallet); // ⭐ VERY IMPORTANT

            // Initialize Achievement Contract if address exists
            if (process.env.ACHIEVEMENT_CONTRACT_ADDRESS) {
                const achievementABIJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'achievementABI.json'), 'utf8'));
                const achievementABI = achievementABIJson.abi || achievementABIJson;
                achievementContract = new ethers.Contract(process.env.ACHIEVEMENT_CONTRACT_ADDRESS, achievementABI, provider);
                achievementContract = achievementContract.connect(wallet);
                console.log("✅ Achievement Contract connected with signer");
            }

            console.log("✅ Contract connected with signer (write-enabled)");
        } catch (err) {
            console.error("❌ Invalid PRIVATE_KEY:", err.message);
        }
    } else {
        console.log("⚠️ No PRIVATE_KEY found — contract will be READ ONLY");
    }

    // RPC connectivity check (Non-blocking)
    provider.getBlockNumber().then(() => {
        connected = true;
        console.log("🌐 RPC provider connected");
        internalEmitter.emit("connected");
    }).catch((err) => {
        connected = false;
        console.error("❌ BLOCKCHAIN OFFLINE:", err.message);
        internalEmitter.emit("disconnected");
    });

    // periodic RPC check
    setInterval(async () => {
        try {
            await provider.getBlockNumber();
            if (!connected) {
                connected = true;
                console.log("🌐 RPC provider reconnected");
                internalEmitter.emit("connected");
            }
        } catch (err) {
            if (connected) {
                connected = false;
                console.error("❌ RPC provider disconnected:", err.message);
                internalEmitter.emit("disconnected");
            }
        }
    }, 15000);

    return { provider, contract, wallet };
}

// Export functions
module.exports = {
    initBlockchain,
    onProviderConnected: (handler) => internalEmitter.on('connected', handler),
    onProviderDisconnected: (handler) => internalEmitter.on('disconnected', handler),
    getContract: () => contract,
    getWallet: () => wallet,
    isConnected: () => connected,
    getStatus: async () => {
        if (!provider) return 'uninitialized';
        try {
            await provider.getBlockNumber();
            return connected ? 'connected' : 'connecting';
        } catch {
            return 'disconnected';
        }
    },
    signGameResult: async (player, sessionId, wordsTyped, correctWords, mistakes, correctCharacters, wpm) => {
        if (!wallet) throw new Error("No signer wallet available");

        // Hash the data exactly as the contract does
        // keccak256(abi.encodePacked(player, sessionId, wordsTyped, correctWords, mistakes, correctCharacters, wpm))
        const messageHash = ethers.utils.solidityKeccak256(
            ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
            [player, sessionId, wordsTyped, correctWords, mistakes, correctCharacters, wpm]
        );

        // Sign the binary hash
        // ethers.Wallet.signMessage automatically adds the prefix "\x19Ethereum Signed Message:\n32" + hash
        const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
        return signature;
    },
    getAchievementContract: () => achievementContract
};
