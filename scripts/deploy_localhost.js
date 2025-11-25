const hre = require("hardhat");

async function main() {
    console.log("Deploying BasedOnTyping to localhost...");

    // Initial ETH price in cents (e.g., $3300.00 = 330000 cents)
    const initialEthPrice = 330000;

    const BasedOnTyping = await hre.ethers.getContractFactory("BasedOnTyping");
    const contract = await BasedOnTyping.deploy(initialEthPrice);

    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log(`BasedOnTyping deployed to: ${address}`);

    // Save address to a file for frontend/backend to pick up?
    // Or just log it. I'll log it and the user can update env vars or I can update them.
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
