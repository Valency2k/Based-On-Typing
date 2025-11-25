const { ethers } = require('ethers');
const axios = require('axios');

function hashParagraph(text) {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(text));
}

async function getEthPriceUSD() {
    try {
        const r = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        );
        return r.data.ethereum.usd;
    } catch {
        return 3300;
    }
}

async function calculateFee() {
    const ethPrice = await getEthPriceUSD();
    const feeUSD = 0.2;
    const feeEth = feeUSD / ethPrice;
    return ethers.utils.parseEther(feeEth.toFixed(18)).toString();
}

function calculateTypingMetrics(original, typed) {
    const oWords = original.trim().split(/\s+/);
    const tWords = typed.trim().split(/\s+/);

    let correctWords = 0,
        mistakes = 0,
        correctCharacters = 0,
        totalCharacters = 0;

    for (let i = 0; i < tWords.length; i++) {
        const t = tWords[i] || '';
        const o = oWords[i] || '';
        if (t.toLowerCase() === o.toLowerCase()) {
            correctWords++;
            correctCharacters += o.length;
        } else mistakes++;
        totalCharacters += t.length;
    }

    const accuracy =
        tWords.length > 0 ? (correctWords / tWords.length) * 100 : 0;

    return {
        wordsTyped: tWords.length,
        correctWords,
        mistakes,
        accuracy: Math.round(accuracy * 100) / 100,
        accuracyBasisPoints: Math.round(accuracy * 100),
        totalCharacters,
        correctCharacters
    };
}

function calculateGlobalScore(e) {
    const accuracyScore = (e.accuracy || 0) * 0.4;
    const mistakeScore =
        Math.max(0, 100 - (e.mistakes || 0)) * 20 * 0.2;
    const speedScore =
        e.durationSeconds > 0 ? (10000 / e.durationSeconds) * 0.2 : 0;
    const wordScore = (e.wordsTyped || 0) * 0.2;
    return accuracyScore + mistakeScore + speedScore + wordScore;
}

module.exports = {
    hashParagraph,
    calculateFee,
    calculateTypingMetrics,
    calculateGlobalScore
};
