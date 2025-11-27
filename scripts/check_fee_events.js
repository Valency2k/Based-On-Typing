const { ethers } = require('ethers');

async function main() {
    const rpcUrl = "https://mainnet.base.org";
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const contractAddress = '0x82ca85c51d6018888fD3A9281156E8e358BFcb42';

    const abi = [
        "event FeePaid(address indexed player, uint256 amount, uint256 timestamp)"
    ];

    const contract = new ethers.Contract(contractAddress, abi, provider);

    console.log(`Querying FeePaid events for ${contractAddress}...`);

    try {
        // Query last 10000 blocks (approx 5.5 hours)
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = currentBlock - 10000;

        console.log(`Scanning blocks ${fromBlock} to ${currentBlock}...`);

        const filter = contract.filters.FeePaid();
        const events = await contract.queryFilter(filter, fromBlock, currentBlock);

        if (events.length === 0) {
            console.log("No FeePaid events found in the last 10000 blocks.");
        } else {
            console.log(`Found ${events.length} events:`);
            for (const event of events) {
                const { player, amount, timestamp } = event.args;
                console.log(`- Tx: ${event.transactionHash}`);
                console.log(`  Player: ${player}`);
                console.log(`  Amount: ${ethers.utils.formatEther(amount)} ETH`);
                console.log(`  Time: ${new Date(timestamp * 1000).toISOString()}`);
                console.log('---');
            }
        }

    } catch (error) {
        console.error("Error fetching events:", error);
    }
}

main();
