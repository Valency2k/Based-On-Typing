const hre = require("hardhat");

async function main() {
    console.log("🚀 Updating Base URI for AchievementNFT...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("✍️  Signer:", deployer.address);

    // Load contract address from .env or hardcoded
    const CONTRACT_ADDRESS = "0xf5f7F34667fC5Cc4f1235E2c9cBebDBc2cd2A291";
    console.log("📍 Contract:", CONTRACT_ADDRESS);

    const AchievementNFT = await hre.ethers.getContractFactory("AchievementNFT");
    const contract = AchievementNFT.attach(CONTRACT_ADDRESS);

    // New Base URI
    // Assuming backend is hosted at the same domain as frontend or configured similarly
    // If using Vercel, it might be https://based-on-typing.vercel.app/api/metadata/
    const NEW_BASE_URI = "https://based-on-typing.vercel.app/api/metadata/";

    console.log("🔗 Setting Base URI to:", NEW_BASE_URI);

    const tx = await contract.setBaseURI(NEW_BASE_URI);
    console.log("⏳ Transaction sent:", tx.hash);

    await tx.wait();
    console.log("✅ Base URI updated successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Update failed:", err);
        process.exit(1);
    });
