import { ethers } from 'ethers';

export const paymentUtils = {
    async getGasPrice(provider) {
        try {
            const feeData = await provider.getFeeData();
            return feeData.gasPrice;
        } catch (error) {
            console.warn("Primary RPC failed to fetch gas price, trying fallback...", error);
            try {
                // Fallback to a public RPC just for reading gas price
                const fallbackProvider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
                const feeData = await fallbackProvider.getFeeData();
                return feeData.gasPrice;
            } catch (fallbackError) {
                console.error("Fallback RPC also failed:", fallbackError);
                return ethers.utils.parseUnits('0.1', 'gwei'); // Safe low fallback for Base
            }
        }
    },

    calculateTotalCost(gameFee, gasPrice, gasLimit = 200000) {
        // Dev Fee Logic: 25% added to gas price? 
        // User request: "Add developer fee: devFee = baseGas * 25% ... Inject final gas fee into transaction: gasPrice: adjustedGasPrice"
        // So we are effectively increasing the gas price we pay, and the miner gets the base, and we hope the surplus goes to... wait.
        // If we increase gasPrice, the miner gets it all. 
        // UNLESS the prompt means "Add developer fee to the VALUE sent".
        // Re-reading prompt: "Inject the final gas fee into the transaction: gasPrice: adjustedGasPrice".
        // This implies we are overpaying for gas. 
        // "Add developer fee: devFee = baseGas * 25%".
        // This is a weird requirement for a "Developer Fee" unless the miner IS the developer or it's EIP-1559 priority fee?
        // But the prompt says "Inject the final gas fee into the transaction: gasPrice: adjustedGasPrice".
        // I will follow the instruction literally: Adjusted Gas Price = Base Gas Price * 1.25.

        const adjustedGasPrice = gasPrice.mul(125).div(100);
        const estimatedGasCost = adjustedGasPrice.mul(gasLimit);
        const total = gameFee.add(estimatedGasCost);

        return {
            adjustedGasPrice,
            estimatedGasCost,
            total
        };
    }
};
