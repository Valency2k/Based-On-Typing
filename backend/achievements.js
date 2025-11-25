const { getContract, isConnected } = require('./blockchain');
const { ethers } = require('ethers');

const ACHIEVEMENTS = [
    { id: 1, name: "First Steps", check: (sessions) => sessions.length > 0 },
    { id: 2, name: "Speed Demon", check: (sessions) => sessions.some(s => s.wpm >= 80) },
    { id: 3, name: "Perfectionist", check: (sessions) => sessions.some(s => s.accuracy >= 10000) }, // 100.00%
    {
        id: 4, name: "Marathon Runner", check: (sessions) => {
            const totalWords = sessions.reduce((sum, s) => sum + Number(s.wordsTyped), 0);
            return totalWords >= 500;
        }
    },
    {
        id: 5, name: "Survivor", check: (sessions) => {
            // Survival mode is enum index 2
            // Assuming Level 5 corresponds to a certain number of words or duration.
            // Let's assume 50 words typed in Survival mode implies reaching Level 5 (approx).
            return sessions.some(s => s.mode === 2 && s.wordsTyped >= 50);
        }
    },
    {
        id: 6, name: "Daily Champion", check: (sessions) => {
            // Daily Challenge is enum index 3
            return sessions.some(s => s.mode === 3 && s.completed);
        }
    }
];

async function getAchievements(playerAddress) {
    const contract = getContract();
    const achievementContract = require('./blockchain').getAchievementContract();

    if (!contract || !isConnected()) {
        console.warn('Cannot fetch achievements: contract unavailable');
        return { unlocked: [], minted: [] };
    }

    try {
        // 1. Calculate Unlocked (Local Logic)
        const sessions = await contract.getPlayerSessions(playerAddress);

        const normalizedSessions = sessions.map(s => ({
            mode: s.mode,
            wordsTyped: s.wordsTyped.toNumber(),
            accuracy: s.accuracy.toNumber(),
            wpm: s.wpm.toNumber(),
            completed: s.completed
        }));

        const unlockedIds = ACHIEVEMENTS
            .filter(ach => ach.check(normalizedSessions))
            .map(ach => ach.id);

        // 2. Check Minted (On-Chain Logic)
        let mintedIds = [];
        if (achievementContract) {
            try {
                const mintedStatus = await achievementContract.checkAchievements(playerAddress);
                // mintedStatus is bool[] for IDs 1..6
                mintedIds = mintedStatus
                    .map((isMinted, index) => isMinted ? index + 1 : null)
                    .filter(id => id !== null);
            } catch (err) {
                console.warn("Failed to check minted status:", err.message);
            }
        }

        return { unlocked: unlockedIds, minted: mintedIds };
    } catch (err) {
        console.error('Error calculating achievements:', err);
        return { unlocked: [], minted: [] };
    }
}

async function checkAndMint(playerAddress) {
    const contract = getContract();
    const achievementContract = require('./blockchain').getAchievementContract();

    if (!contract || !isConnected()) {
        console.warn('Cannot check/mint achievements: contract unavailable');
        return [];
    }

    if (!achievementContract) {
        console.warn('Cannot mint: Achievement contract not initialized');
        return [];
    }

    try {
        // 1. Get unlocked achievement IDs based on game history
        const unlockedIds = await getAchievements(playerAddress);
        if (unlockedIds.length === 0) return [];

        // 2. Check which ones are already minted on-chain
        // The contract has a checkAchievements function that returns bool[]
        const mintedStatus = await achievementContract.checkAchievements(playerAddress);
        // mintedStatus is an array of booleans [id1_minted, id2_minted, ...]

        const newAchievements = [];

        for (const id of unlockedIds) {
            // IDs are 1-based, array is 0-based
            const isMinted = mintedStatus[id - 1];

            if (!isMinted) {
                console.log(`🏆 Minting Achievement #${id} for ${playerAddress}...`);
                try {
                    const tx = await achievementContract.mintAchievement(playerAddress, id);
                    await tx.wait();
                    console.log(`✅ Minted Achievement #${id}: ${tx.hash}`);
                    newAchievements.push(id);
                } catch (mintErr) {
                    console.error(`❌ Failed to mint Achievement #${id}:`, mintErr.message);
                }
            }
        }

        return newAchievements;
    } catch (err) {
        console.error('Error in checkAndMint:', err);
        return [];
    }
}

async function mintAchievement(playerAddress, achievementId) {
    const achievementContract = require('./blockchain').getAchievementContract();
    const wallet = require('./blockchain').getWallet();

    if (!achievementContract) {
        throw new Error('Achievement contract not initialized');
    }
    if (!wallet) {
        throw new Error('Wallet not initialized');
    }

    // 1. Verify player has unlocked this achievement
    const { unlocked } = await getAchievements(playerAddress);
    if (!unlocked.includes(achievementId)) {
        throw new Error('Achievement not unlocked yet');
    }

    // 2. Check if already minted
    const mintedStatus = await achievementContract.checkAchievements(playerAddress);
    if (mintedStatus[achievementId - 1]) {
        throw new Error('Achievement already minted');
    }

    // 3. Generate Signature
    // keccak256(abi.encodePacked(player, achievementId))
    const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'uint256'],
        [playerAddress, achievementId]
    );

    const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));

    // Get current fee from contract
    const fee = await achievementContract.calculateMintFee();

    return { signature, fee: fee.toString() };
}

module.exports = { getAchievements, checkAndMint, mintAchievement };
