const hre = require("hardhat");

async function main() {
    console.log("🔍 Testing wallet configuration...\n");

    try {
        const [deployer] = await hre.ethers.getSigners();
        const address = await deployer.getAddress();
        const balance = await deployer.getBalance();

        console.log("✅ Wallet configuration is valid!");
        console.log("==================================");
        console.log(`Deployer Address: ${address}`);
        console.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH`);
        console.log(`Network: ${hre.network.name}`);
        console.log("==================================\n");

        if (balance.eq(0)) {
            console.log("⚠️  WARNING: Your wallet has 0 ETH!");
            console.log("You need testnet ETH to deploy.");
            console.log("Get free testnet ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet\n");
        } else {
            console.log("✅ You have ETH! Ready to deploy.\n");
        }

    } catch (error) {
        console.error("❌ Wallet configuration ERROR:");
        console.error(error.message);
        console.log("\nPlease check your .env file:");
        console.log("1. Make sure .env file exists in the project root");
        console.log("2. Private key should be 64 characters (no 0x prefix)");
        console.log("3. No spaces or quotes around the key\n");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
