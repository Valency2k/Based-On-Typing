const { ethers } = require('ethers');

async function main() {
    const rpcUrl = "https://mainnet.base.org";
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const addressToCheck = '0x7CE8Ca965369696f2bf55068D05A3Cfaa3D9D588';

    console.log(`Checking code at address: ${addressToCheck}`);

    try {
        const code = await provider.getCode(addressToCheck);

        if (code === '0x') {
            console.log("Result: EOA (Externally Owned Account) - Regular Wallet");
        } else {
            console.log("Result: Smart Contract");
            console.log(`Code Length: ${code.length} bytes`);
        }

    } catch (error) {
        console.error("Error fetching code:", error);
    }
}

main();
