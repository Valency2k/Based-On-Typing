const { ethers } = require('ethers');

async function main() {
    const rpcUrl = "https://mainnet.base.org";
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const contractAddress = '0x82ca85c51d6018888fD3A9281156E8e358BFcb42';

    // Minimal ABI to get developer
    const abi = [
        "function developer() view returns (address)",
        "function totalFeesCollected() view returns (uint256)"
    ];

    const contract = new ethers.Contract(contractAddress, abi, provider);

    console.log(`Connecting to Base Mainnet...`);

    try {
        const developer = await contract.developer();
        const totalFees = await contract.totalFeesCollected();

        console.log(`Contract Address: ${contractAddress}`);
        console.log(`Developer Address (Fee Recipient): ${developer}`);
        console.log(`Total Fees Collected: ${ethers.utils.formatEther(totalFees)} ETH`);

        const balance = await provider.getBalance(developer);
        console.log(`\nCurrent Balance of Developer (${developer}): ${ethers.utils.formatEther(balance)} ETH`);

    } catch (error) {
        console.error("Error fetching contract data:", error);
    }
}

main();
