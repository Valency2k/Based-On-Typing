const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging AchievementNFT State on Base...\n");

    const CONTRACT_ADDRESS = "0x3BF06869Dae75c7742054096339E81dAAaacDA99";
    const [deployer] = await ethers.getSigners();
    console.log("👤 Current Wallet (Backend/Deployer):", deployer.address);

    const AchievementNFT = await ethers.getContractFactory("AchievementNFT");
    const contract = AchievementNFT.attach(CONTRACT_ADDRESS);

    // 1. Check Signer
    const signerAddress = await contract.signer();
    console.log("✍️  Contract Signer Variable:", signerAddress);

    if (signerAddress.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("✅ Signer matches Deployer");
    } else {
        console.error("❌ Signer MISMATCH! Contract expects signatures from:", signerAddress);
    }

    // 2. Check Owner
    const ownerAddress = await contract.owner();
    console.log("👑 Contract Owner:", ownerAddress);

    // 3. Check Fee
    try {
        const feeWei = await contract.calculateMintFee();
        console.log("💵 Current Mint Fee:", ethers.formatEther(feeWei), "ETH");
    } catch (e) {
        console.error("❌ Failed to calculate fee:", e.message);
    }

    // 4. Simulate Signature Generation
    const playerAddress = deployer.address; // Test with self
    const achievementId = 1;

    console.log(`\n🔄 Simulating signature for Player: ${playerAddress}, ID: ${achievementId}`);

    const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'uint256'],
        [playerAddress, achievementId]
    );
    const signature = await deployer.signMessage(ethers.getBytes(messageHash));
    console.log("📝 Generated Signature:", signature);

    // 5. Simulate Minting (Call Static)
    try {
        console.log("🚀 Attempting static call to mintAchievement...");
        // If owner, fee is 0. If not, fee is required.
        const fee = (deployer.address === ownerAddress) ? 0 : await contract.calculateMintFee();

        await contract.mintAchievement.staticCall(playerAddress, achievementId, signature, {
            value: fee
        });
        console.log("✅ Minting simulation SUCCEEDED!");
    } catch (e) {
        console.error("❌ Minting simulation FAILED:");
        if (e.reason) console.error("   Reason:", e.reason);
        else if (e.data) console.error("   Data:", e.data);
        else console.error("   Error:", e.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
