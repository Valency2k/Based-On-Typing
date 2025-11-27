const { ethers } = require('ethers');

async function main() {
    const rpcUrl = "https://mainnet.base.org";
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const txHash = '0x2dd44c90fef93fa84bf38d60677dcec4dce0ff36372667570522ba512f4fc1cc';

    console.log(`Tracing Transaction: ${txHash}`);

    try {
        const tx = await provider.getTransaction(txHash);
        const receipt = await provider.getTransactionReceipt(txHash);

        if (!tx) {
            console.log("Transaction not found.");
            return;
        }

        console.log(`\n--- Transaction Details ---`);
        console.log(`From: ${tx.from}`);
        console.log(`To: ${tx.to}`);
        console.log(`Value: ${ethers.utils.formatEther(tx.value)} ETH`);
        console.log(`Data (Input): ${tx.data}`);
        console.log(`Nonce: ${tx.nonce}`);
        console.log(`Gas Price: ${ethers.utils.formatUnits(tx.gasPrice, 'gwei')} gwei`);

        if (receipt) {
            console.log(`\n--- Receipt Details ---`);
            console.log(`Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
            console.log(`Block Number: ${receipt.blockNumber}`);
            console.log(`Gas Used: ${receipt.gasUsed.toString()}`);

            console.log(`\n--- Logs (${receipt.logs.length}) ---`);
            for (const log of receipt.logs) {
                console.log(`Log Address: ${log.address}`);
                console.log(`Topics: ${log.topics}`);
                console.log(`Data: ${log.data}`);
            }
        } else {
            console.log("\nTransaction is pending or not mined.");
        }

    } catch (error) {
        console.error("Error fetching transaction:", error);
    }
}

main();
