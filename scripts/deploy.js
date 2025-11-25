const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying BasedOnTyping to Base Network...\n");

    // ==========================================
    // 1. ETH PRICE INPUT (REQUIRED)
    // ==========================================
    const INITIAL_ETH_PRICE_IN_CENTS = 340000; // Updated to $3,400.00
    console.log(`📊 Using ETH price: $${INITIAL_ETH_PRICE_IN_CENTS / 100}`);
    console.log(`💰 Game fee: $0.20 USD\n`);

    // ==========================================
    // 2. DEPLOY CONTRACT
    // ==========================================
    // ==========================================
    // 2. DEPLOY CONTRACT
    // ==========================================
    const PRICE_FEED_ADDRESS = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"; // Base Mainnet ETH/USD
    const [deployer] = await hre.ethers.getSigners();
    const SIGNER_ADDRESS = deployer.address;

    console.log("📡 Price Feed:", PRICE_FEED_ADDRESS);
    console.log("✍️  Signer:", SIGNER_ADDRESS);

    const Factory = await hre.ethers.getContractFactory("BasedOnTyping");
    const contract = await Factory.deploy(INITIAL_ETH_PRICE_IN_CENTS, PRICE_FEED_ADDRESS, SIGNER_ADDRESS);

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log("✅ Contract deployed!");
    console.log("📍 Address:", contractAddress, "\n");

    // ==========================================
    // 3. CONTRACT DETAILS
    // ==========================================
    try {
        const developer = await contract.developer();
        console.log("👤 Developer:", developer);
    } catch (e) {
        console.log("⚠️ Could not fetch developer:", e.message);
    }

    try {
        const feeWei = await contract.calculateGameFee();
        console.log("💵 Current Fee:",
            hre.ethers.formatEther(feeWei),
            "ETH"
        );
    } catch (e) {
        console.log("⚠️ Could not calculate fee:", e.message);
    }

    console.log("\nNetwork:", hre.network.name);
    console.log("------------------------------------------\n");

    // ==========================================
    // 4. WAIT FOR CONFIRMATIONS ON REAL NETWORKS
    // ==========================================
    if (!["hardhat", "localhost"].includes(hre.network.name)) {
        console.log("⏳ Waiting for confirmations...");
        const deploymentTx = contract.deploymentTransaction();
        if (deploymentTx) {
            await deploymentTx.wait(5);
            console.log("✅ Deployment confirmed!");
        }
    }

    // ==========================================
    // 5. BASESCAN VERIFICATION
    // ==========================================
    if (!["hardhat", "localhost"].includes(hre.network.name)) {
        console.log("🔍 Verifying contract...");

        try {
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [INITIAL_ETH_PRICE_IN_CENTS, PRICE_FEED_ADDRESS, SIGNER_ADDRESS],
            });
            console.log("✅ Verified on Basescan!");
        } catch (e) {
            console.log("⚠️ Verification error:", e.message);
            console.log(`Try manual verify:\n`);
            console.log(
                `npx hardhat verify --network ${hre.network.name} ${contractAddress} ${INITIAL_ETH_PRICE_IN_CENTS} ${PRICE_FEED_ADDRESS} ${SIGNER_ADDRESS}`
            );
        }
    }

    // ==========================================
    // 6. SAVE DEPLOYMENT ARTIFACTS
    // ==========================================
    const output = {
        contractAddress,
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        ethPriceInCents: INITIAL_ETH_PRICE_IN_CENTS,
        deploymentTime: new Date().toISOString(),
    };

    fs.writeFileSync("deployment-info.json", JSON.stringify(output, null, 2));
    console.log("\n📄 Saved deployment-info.json");

    // SAVE ABI FOR FRONTEND
    const artifact = await hre.artifacts.readArtifact("BasedOnTyping");
    fs.writeFileSync("contractABI.json", JSON.stringify(artifact.abi, null, 2));
    console.log("📄 Saved contractABI.json (frontend-ready)");

    console.log("\n🎯 NEXT STEPS:");
    console.log(`➡️ Add this to your .env:\nCONTRACT_ADDRESS="${contractAddress}"`);
    console.log("➡️ Update your frontend blockchain config.\n");
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Deployment failed:", err);
        process.exit(1);
    });
