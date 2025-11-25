const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing AchievementNFT Fee Logic...\n");

    const [owner, player, signer] = await ethers.getSigners();

    // 1. Deploy Mock Aggregator ($3000 ETH)
    const MockAggregator = await ethers.getContractFactory("MockAggregator");
    // $3000 * 10^8
    const mockPriceFeed = await MockAggregator.deploy(300000000000);
    await mockPriceFeed.waitForDeployment();
    const mockPriceFeedAddress = await mockPriceFeed.getAddress();
    console.log("✅ Mock Aggregator deployed at:", mockPriceFeedAddress);

    // 2. Deploy AchievementNFT
    const AchievementNFT = await ethers.getContractFactory("AchievementNFT");
    const achievementNFT = await AchievementNFT.deploy(mockPriceFeedAddress, signer.address);
    await achievementNFT.waitForDeployment();
    const nftAddress = await achievementNFT.getAddress();
    console.log("✅ AchievementNFT deployed at:", nftAddress);

    // 3. Check Fee Calculation
    const feeWei = await achievementNFT.calculateMintFee();
    console.log(`💵 Calculated Fee: ${ethers.formatEther(feeWei)} ETH`);

    // Expected: $0.60 / $3000 = 0.0002 ETH
    const expectedFee = ethers.parseEther("0.0002");
    if (feeWei.toString() === expectedFee.toString()) {
        console.log("✅ Fee calculation correct (0.0002 ETH)");
    } else {
        console.error(`❌ Fee calculation incorrect. Expected ${expectedFee}, got ${feeWei}`);
    }

    // 4. Test Minting (Failure: No Fee)
    const achievementId = 1;
    const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'uint256'],
        [player.address, achievementId]
    );
    const signature = await signer.signMessage(ethers.getBytes(messageHash));

    try {
        await achievementNFT.connect(player).mintAchievement(player.address, achievementId, signature);
        console.error("❌ Minting without fee should have failed!");
    } catch (e) {
        if (e.message.includes("Insufficient fee")) {
            console.log("✅ Minting without fee failed as expected");
        } else {
            console.error("❌ Unexpected error:", e.message);
        }
    }

    // 5. Test Minting (Success: With Fee)
    try {
        await achievementNFT.connect(player).mintAchievement(player.address, achievementId, signature, {
            value: feeWei
        });
        console.log("✅ Minting with fee succeeded");
    } catch (e) {
        console.error("❌ Minting with fee failed:", e.message);
    }

    // 6. Test Owner Minting (Success: No Fee)
    try {
        const ownerId = 2;
        // Owner doesn't need signature check in my code? 
        // Wait, my code requires signature for everyone in `mintAchievement`.
        // Let's check the contract code.
        // `require(ethSignedMessageHash.recover(signature) == signer, "Invalid signature");` is run for everyone.
        // But owner is the signer usually? No, signer is separate.
        // Owner might need to sign for themselves if they use this function.
        // But usually owner has a separate `adminMint` or similar. 
        // My code:
        // if (msg.sender != owner()) { check fee }
        // So owner still needs signature? Yes.

        const ownerMessageHash = ethers.solidityPackedKeccak256(
            ['address', 'uint256'],
            [owner.address, ownerId]
        );
        const ownerSignature = await signer.signMessage(ethers.getBytes(ownerMessageHash));

        await achievementNFT.connect(owner).mintAchievement(owner.address, ownerId, ownerSignature);
        console.log("✅ Owner minting without fee succeeded");
    } catch (e) {
        console.error("❌ Owner minting failed:", e.message);
    }

    // 7. Verify Balances
    const contractBalance = await ethers.provider.getBalance(nftAddress);
    console.log(`💰 Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);

    if (contractBalance.toString() === feeWei.toString()) {
        console.log("✅ Contract balance correct");
    } else {
        console.error("❌ Contract balance incorrect");
    }

    // 8. Withdraw
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    await achievementNFT.withdraw();
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    console.log("✅ Withdraw succeeded");
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
