const { ethers } = require('ethers');

async function main() {
    const abi = [
        "event GameStarted(address indexed player, uint256 indexed sessionId, uint8 mode, uint256 timestamp)",
        "event ModeSelected(address indexed player, uint8 mode, uint256 timeOrWords)",
        "event FeePaid(address indexed player, uint256 amount, uint256 timestamp)",
        "event GameCompleted(address indexed player, uint256 indexed sessionId, uint256 wordsTyped, uint256 accuracy, uint256 wpm, uint256 timestamp)",
        "event ScoreSubmitted(address indexed player, uint8 mode, uint256 wpm, uint256 accuracy, uint256 score, uint256 timestamp)",
        "event PriceUpdated(uint256 newPrice, uint256 timestamp)",
        "event DailyChallengeCreated(uint256 indexed challengeDate, bytes32 challengeHash, uint256 wordCount, uint256 timeLimit)"
    ];

    const iface = new ethers.utils.Interface(abi);

    const logs = [
        {
            topics: ['0x212ddc488fd575e47c9a6bfe5eb8e8e2d533e91862942b3989027be4cb12ef67', '0x0000000000000000000000000000000000000000000000000000000069264300'],
            data: '0xc7c993338dd26604355695d84518adfbc4478ad1445a046c10bc8bbe1a00b67b0000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000000000000009f'
        },
        {
            topics: ['0xf3816d9cce3442fbfe3e4d36ad047b3362efdc9f2e283e77b0ecd768a0a01ef2', '0x00000000000000000000000026a16721d790c10dec598d3e0fca515e39cb401c'],
            data: '0x000000000000000000000000000000000000000000000000000003be992dbdcec00000000000000000000000000000000000000000000000000000000692743e5'
        },
        {
            topics: ['0x1f6e2227a3f988f2a06233d47bc66331c97bddd09dd9d8cd46071fa78e197e7f', '0x00000000000000000000000026a16721d790c10dec598d3e0fca515e39cb401c'],
            data: '0x0000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000009f'
        },
        {
            topics: ['0xbcb4b60b2dee985720fc934eba20f78c8a606281e67343d662180914e6e509aa', '0x00000000000000000000000026a16721d790c10dec598d3e0fca515e39cb401c', '0x0000000000000000000000000000000000000000000000000000000000000000'],
            data: '0x000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000692743e5'
        }
    ];

    console.log("Decoding Logs...");
    logs.forEach((log, index) => {
        try {
            const parsed = iface.parseLog(log);
            console.log(`\nLog ${index + 1}: ${parsed.name}`);
            console.log(parsed.args);
        } catch (e) {
            console.log(`\nLog ${index + 1}: Could not parse (Topic: ${log.topics[0]})`);
        }
    });
}

main();
