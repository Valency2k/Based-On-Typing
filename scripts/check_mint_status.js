const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking Mint Status on Base...\n");

    const CONTRACT_ADDRESS = "0x3BF06869Dae75c7742054096339E81dAAaacDA99";
    const [deployer] = await ethers.getSigners();
    const playerAddress = deployer.address;
    const achievementId = 1;

    console.log("👤 Player:", playerAddress);
    console.log("🏆 Achievement ID:", achievementId);

    const AchievementNFT = await ethers.getContractFactory("AchievementNFT");
    const contract = AchievementNFT.attach(CONTRACT_ADDRESS);

    const hasMinted = await contract.hasAchievement(playerAddress, achievementId);
    console.log(`\n🔒 Has Achievement ${achievementId} been minted? ${hasMinted}`);

    if (hasMinted) {
        console.log("❌ FAILURE REASON: Achievement already unlocked!");
    } else {
        console.log("✅ Achievement not yet minted. Issue is elsewhere.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
