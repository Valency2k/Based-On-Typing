const hre = require("hardhat");
const fs = require("fs");

async function main() {
    // 1. Get arguments
    const newBaseURI = process.env.NEW_BASE_URI;

    if (!newBaseURI) {
        console.error("❌ Error: Please set NEW_BASE_URI environment variable.");
        console.error("Example: NEW_BASE_URI='https://your-api.com/api/metadata/' npx hardhat run scripts/update_base_uri.js --network base");
        process.exit(1);
    }

    // 2. Get Contract Address
    const contractAddress = process.env.ACHIEVEMENT_CONTRACT_ADDRESS;
    if (!contractAddress) {
        console.error("❌ Error: ACHIEVEMENT_CONTRACT_ADDRESS not found in environment variables.");
        process.exit(1);
    }

    console.log(`🚀 Updating Base URI for AchievementNFT at: ${contractAddress}`);
    console.log(`🔗 New Base URI: ${newBaseURI}`);

    // 3. Connect to Contract
    const [deployer] = await hre.ethers.getSigners();
    console.log("✍️  Signer:", deployer.address);

    const AchievementNFT = await hre.ethers.getContractFactory("AchievementNFT");
    const contract = AchievementNFT.attach(contractAddress);

    // 4. Update Base URI
    console.log("⏳ Sending transaction...");
    const tx = await contract.setBaseURI(newBaseURI);
    console.log("✅ Transaction sent:", tx.hash);

    console.log("⏳ Waiting for confirmation...");
    await tx.wait();
    console.log("✅ Base URI updated successfully!");

    // 5. Verify
    const currentURI = await contract.tokenURI(1).catch(() => "No tokens minted yet to check");
    console.log("🔍 Verification (Token 1 URI):", currentURI);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Failed:", err);
        process.exit(1);
    });
