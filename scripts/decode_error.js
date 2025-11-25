const { ethers } = require("ethers");

const errors = [
    "InsufficientFee()",
    "InvalidMode()",
    "InvalidTimeLimit()",
    "InvalidWordCount()",
    "GameNotFound()",
    "GameAlreadyCompleted()",
    "Unauthorized()",
    "PriceNotSet()",
    "InvalidLeaderboardEntry()"
];

async function main() {
    console.log("🔍 Decoding Error Selectors...");
    for (const err of errors) {
        let selector;
        try {
            // Try v6 syntax
            selector = ethers.id(err).slice(0, 10);
        } catch (e) {
            try {
                // Try v5 syntax
                selector = ethers.utils.id(err).slice(0, 10);
            } catch (e2) {
                console.error("Could not calculate selector for", err);
                continue;
            }
        }
        console.log(`${selector} : ${err}`);
    }
}

main();
