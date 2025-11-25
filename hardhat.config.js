require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            viaIR: true
        }
    },
    networks: {
        // Base Mainnet
        base: {
            url: "https://mainnet.base.org",
            accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
            chainId: 8453
        },
        // Base Sepolia Testnet
        baseSepolia: {
            url: "https://sepolia.base.org",
            accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
            chainId: 84532
        },
        // Local Hardhat network
        hardhat: {
            chainId: 31337
        }
    },
    etherscan: {
        // Updated to use Etherscan API v2
        apiKey: process.env.BASESCAN_API_KEY || "your_api_key_here"
    }
};