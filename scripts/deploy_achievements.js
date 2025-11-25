const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying AchievementNFT to Base Network...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("✍️  Signer:", deployer.address);

    const Factory = await hre.ethers.getContractFactory("AchievementNFT");

    // Base Mainnet Price Feed
    const PRICE_FEED_ADDRESS = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";

    console.log("📡 Price Feed:", PRICE_FEED_ADDRESS);

    const contract = await Factory.deploy(PRICE_FEED_ADDRESS, deployer.address);

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log("✅ AchievementNFT deployed!");
    console.log("📍 Address:", contractAddress, "\n");

    // Wait for a bit to avoid nonce issues
    console.log("⏳ Waiting for propagation...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Set Base URI (Localhost for now)
    console.log("🔗 Setting Base URI...");
    const baseURI = "http://localhost:3001/api/metadata/";
    const tx = await contract.setBaseURI(baseURI);
    await tx.wait();
    console.log(`✅ Base URI set to: ${baseURI}`);

    // ==========================================
    // SAVE DEPLOYMENT ARTIFACTS
    // ==========================================
    const output = {
        contractAddress,
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deploymentTime: new Date().toISOString(),
    };

    fs.writeFileSync("deployment-achievements.json", JSON.stringify(output, null, 2));
    console.log("\n📄 Saved deployment-achievements.json");

    // SAVE ABI FOR FRONTEND
    const artifact = await hre.artifacts.readArtifact("AchievementNFT");
    fs.writeFileSync("achievementABI.json", JSON.stringify(artifact.abi, null, 2));
    console.log("📄 Saved achievementABI.json (frontend-ready)");

    console.log("\n🎯 NEXT STEPS:");
    console.log(`➡️ Add this to your .env:\nACHIEVEMENT_CONTRACT_ADDRESS="${contractAddress}"`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Deployment failed:", err);
        process.exit(1);
    });
