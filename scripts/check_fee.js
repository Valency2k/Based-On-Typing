const hre = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0xe5F8Cb182473517a265003d38D60d87e106901d8";
    const BasedOnTyping = await hre.ethers.getContractFactory("BasedOnTyping");
    const contract = BasedOnTyping.attach(CONTRACT_ADDRESS);

    console.log("🔍 Checking fee on contract:", CONTRACT_ADDRESS);

    try {
        const fee = await contract.calculateGameFee();
        console.log("✅ Fee (Wei):", fee.toString());
        console.log("✅ Fee (ETH):", hre.ethers.formatEther(fee));
    } catch (error) {
        console.error("❌ Failed to calculate fee:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
