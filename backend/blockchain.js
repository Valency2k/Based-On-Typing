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

async function getWorkingProvider() {
    // List of reliable public RPCs
    const rpcUrls = [
        "https://mainnet.base.org",
        "https://base.llamarpc.com",
        "https://base-mainnet.public.blastapi.io",
        "https://1rpc.io/base"
    ];

    // Shuffle array to distribute load
    const shuffled = rpcUrls.sort(() => 0.5 - Math.random());

    for (const url of shuffled) {
        try {
            console.log(`Testing RPC: ${url}`);
            const tempProvider = new ethers.providers.JsonRpcProvider(url);
            // fast timeout check
            await Promise.race([
                tempProvider.getBlockNumber(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
            ]);
            console.log(`✅ Connected to RPC: ${url}`);
            return tempProvider;
        } catch (err) {
            console.warn(`⚠️ RPC failed: ${url} - ${err.message}`);
        }
    }
    throw new Error("All RPC endpoints failed");
}

async function initBlockchain() {
    try {
        provider = await getWorkingProvider();
    } catch (err) {
        console.error("❌ CRITICAL: Could not connect to any RPC provider");
        connected = false;
        internalEmitter.emit("disconnected");
        return; // Don't crash, just return. The interval will try again.
    }

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

    connected = true;
    internalEmitter.emit("connected");

    // periodic RPC check (Only run if NOT on Vercel)
    if (!process.env.VERCEL) {
        // Clear existing interval if any (though this function is usually called once)
        // Ideally we should have a way to stop the old interval if re-initializing.
        // For now, we assume initBlockchain is called once or handles it.

        setInterval(async () => {
            if (!provider) return;
            try {
                await provider.getBlockNumber();
                if (!connected) {
                    connected = true;
                    console.log("🌐 RPC provider reconnected");
                    internalEmitter.emit("connected");
                }
            } catch (err) {
                console.error("❌ RPC Check failed:", err.message);
                if (connected) {
                    connected = false;
                    internalEmitter.emit("disconnected");
                }
                // Attempt to reconnect
                console.log("🔄 Attempting to switch RPC...");
                try {
                    const newProvider = await getWorkingProvider();
                    provider = newProvider;
                    // Re-connect wallet/contracts
                    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
                    if (wallet) {
                        wallet = wallet.connect(provider);
                        contract = contract.connect(wallet);
                        if (achievementContract) achievementContract = achievementContract.connect(wallet);
                    }
                    connected = true;
                    console.log("✅ Switched to new RPC provider");
                    internalEmitter.emit("connected");
                } catch (reconnectErr) {
                    console.error("❌ Reconnection failed:", reconnectErr.message);
                }
            }
        }, 15000);
    }

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
