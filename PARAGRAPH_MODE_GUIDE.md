# 📝 Paragraph Mode - Complete Implementation Guide

## Overview

This guide covers the **Paragraph Mode** feature added to the "Based on Typing" game on Base network. Paragraph Mode allows players to type complete paragraphs within a time limit, with all the same blockchain features as other modes.

---

## 🎯 Key Features

✅ **Free Paragraph API Integration** - Fetches random paragraphs from BaconIpsum/Loripsum APIs  
✅ **On-Chain Hash Verification** - Only the keccak256 hash is stored on-chain  
✅ **Off-Chain Paragraph Storage** - Backend stores full paragraph text  
✅ **Time Limit Options** - 15s, 30s, 45s, 60s, 120s, 180s  
✅ **$0.10 USD Fee** - Same developer fee as other modes  
✅ **Real-Time WPM Calculation** - Industry-standard formula  
✅ **Session Tracking** - Full on-chain session metadata  

---

## 📁 Files Modified/Created

### Smart Contract
- **`contracts/BasedOnTyping.sol`** - Updated with Paragraph mode enum and functions

### Backend
- **`backend/server.js`** - Node.js Express server for paragraph fetching
- **`backend/package.json`** - Backend dependencies

### Frontend
- **`web3Integration.js`** - Added `startParagraphGame()` method
- **`gameLogic.js`** - Added paragraph mode logic
- **`paragraph-mode-example.html`** - Standalone example page

---

## 🔧 Smart Contract Changes

### New Enum Value
```solidity
enum GameMode {
    TimeLimit,
    WordCount,
    Survival,
    DailyChallenge,
    Paragraph  // NEW!
}
```

### New Struct Field
```solidity
struct GameSession {
    // ... existing fields
    bytes32 paragraphHash;  // NEW! Hash of paragraph for verification
}
```

### New Function
```solidity
function startParagraphMode(uint256 timeLimitSeconds, bytes32 paragraphHash) 
    external 
    payable 
    returns (uint256)
```

**Validates:**
- Time limit is one of: 15, 30, 45, 60, 120, 180 seconds
- Fee payment ($0.10 USD in Base ETH)
- Stores paragraph hash on-chain

---

## 🚀 Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

Dependencies installed:
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `ethers` - Ethereum/Web3 library
- `axios` - HTTP client for API calls

### 2. Configure Contract Address

Update `backend/server.js` line 17:
```javascript
const CONTRACT_ADDRESS = '0xYourContractAddressHere';
```

### 3. Export Contract ABI

Create `backend/contractABI.json` with the contract ABI:
```bash
# After compiling contract with Hardhat
npx hardhat compile
# Copy the ABI from artifacts/contracts/BasedOnTyping.sol/BasedOnTyping.json
```

Or manually create the file with the contract ABI array.

### 4. Start Backend Server

```bash
npm start
# Server runs on http://localhost:3001
```

For development with auto-reload:
```bash
npm run dev
```

---

## 🌐 Backend API Endpoints

### POST `/api/paragraph/start`
Start a new paragraph mode game.

**Request:**
```json
{
  "timeLimit": 60,
  "playerAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "0x742...bEb_1699999999999",
  "paragraphText": "The bacon ipsum dolor amet...",
  "paragraphHash": "0xabcd1234...",
  "timeLimit": 60,
  "feeWei": "60606060606060",
  "contractAddress": "0x17dD05602720b4C31A55ea58A130260733B527d4"
}
```

### POST `/api/paragraph/submit`
Submit typed paragraph for verification.

**Request:**
```json
{
  "sessionId": "0x742...bEb_1699999999999",
  "typedText": "The bacon ipsum dolor amet...",
  "onChainSessionId": 0
}
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "wordsTyped": 50,
    "correctWords": 48,
    "mistakes": 2,
    "accuracy": 96.00,
    "totalCharacters": 250,
    "correctCharacters": 240,
    "accuracyBasisPoints": 9600
  },
  "originalParagraph": "The bacon ipsum dolor amet...",
  "message": "Results calculated. Submit to blockchain using completeGame()."
}
```

### GET `/api/health`
Health check endpoint.

---

## 🎮 Frontend Integration

### Example Usage

```javascript
// 1. Connect wallet
const web3Manager = new Web3Manager();
await web3Manager.connectWallet();

// 2. Fetch paragraph from backend
const response = await fetch('http://localhost:3001/api/paragraph/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        timeLimit: 60,
        playerAddress: web3Manager.account
    })
});

const paragraphData = await response.json();

// 3. Start game on blockchain
const result = await web3Manager.startParagraphGame(
    60,  // time limit
    paragraphData.paragraphHash
);

const onChainSessionId = result.sessionId;

// 4. Initialize game session
const game = new GameSession('paragraph', {
    timeLimit: 60,
    paragraphText: paragraphData.paragraphText,
    onTimerTick: (remaining) => console.log(remaining),
    onTimerComplete: () => console.log('Time up!')
});

game.initialize();

// 5. Type words
const result = game.typeWord('The');  // Type first word
const result2 = game.typeWord('bacon');  // Type second word

// 6. Complete game
await web3Manager.completeGame(
    onChainSessionId,
    stats.wordsTyped,
    stats.correctWords,
    stats.mistakes
);
```

---

## 📊 How Paragraph Hashing Works

### 1. Backend Flow

```
User Request → Fetch Paragraph from API → Compute Hash → Store Locally
                                              ↓
                                    Send Hash to Smart Contract
```

**Hash Calculation:**
```javascript
const paragraphHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(paragraphText)
);
```

### 2. Verification

The backend stores the mapping:
```
sessionId → { paragraphText, paragraphHash, ... }
```

When the user submits typed text:
1. Backend retrieves original paragraph
2. Compares typed text word-by-word
3. Calculates accuracy and mistakes
4. Returns metrics for blockchain submission

### 3. Security

- ✅ **Tamper-Proof** - Hash stored on-chain prevents paragraph changes
- ✅ **Privacy** - Full text never goes on-chain (gas efficient)
- ✅ **Verifiable** - Anyone can verify by re-hashing the paragraph

---

## 🔄 Contract Deployment

### Option 1: Hardhat (Recommended for Production)

1. **Update existing contract:**
```bash
npx hardhat compile
```

2. **Deploy updated contract:**
```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

3. **Update contract address** in:
   - `web3Integration.js` (line 285)
   - `backend/server.js` (line 17)

### Option 2: Remix IDE (Quick Testing)

1. Open [Remix IDE](https://remix.ethereum.org)
2. Copy contract from `contracts/BasedOnTyping.sol`
3. Compile with Solidity 0.8.20
4. Deploy to Base Sepolia:
   - Connect MetaMask to Base Sepolia
   - Deploy with constructor parameter (your wallet address)
5. Copy deployed contract address

---

## 🧪 Testing Paragraph Mode

### 1. Start Backend
```bash
cd backend
npm start
```

### 2. Open Example Page
```bash
# Open paragraph-mode-example.html in browser
# Or serve it with a local server:
npx http-server -p 8080
```

### 3. Test Flow
1. Connect MetaMask wallet (Base Sepolia)
2. Select time limit (e.g., 60 seconds)
3. Click "Start Paragraph Mode"
4. Type the paragraph that appears
5. Complete within time limit
6. Results submitted to blockchain

### 4. Verify On-Chain
Check your transaction on Base Sepolia Explorer:
```
https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS
```

---

## 💰 Fee Payment

Paragraph mode uses the **same fee structure** as other modes:

- **Fee:** $0.10 USD worth of Base ETH
- **Calculation:** Contract calls Chainlink price feed (or manual update)
- **Payment:** Required before game starts
- **Refund:** Excess ETH automatically refunded

---

## 🎨 Frontend Example Features

The `paragraph-mode-example.html` demonstrates:

✅ Time limit selection (6 options)  
✅ Paragraph fetching from backend  
✅ Blockchain transaction handling  
✅ Real-time WPM calculation  
✅ Word-by-word highlighting  
✅ Correct/incorrect word marking  
✅ Game completion detection  
✅ Result submission to blockchain  

---

## 🐛 Troubleshooting

### Backend won't start
- **Issue:** Port 3001 already in use
- **Solution:** Change port in `server.js` line 7 or kill existing process

### Paragraph API timeout
- **Issue:** BaconIpsum/Loripsum API unreachable
- **Solution:** Backend automatically falls back to default paragraphs

### Contract reverts "InvalidTimeLimit"
- **Issue:** Time limit not in allowed values
- **Solution:** Use only: 15, 30, 45, 60, 120, 180 seconds

### "Insufficient Fee" error
- **Issue:** Not enough ETH sent with transaction
- **Solution:** Backend calculates correct fee, ensure wallet has enough Base ETH

---

## 📈 Production Checklist

Before deploying to mainnet:

- [ ] Update `CONFIG.activeNetwork` to `'mainnet'` in `web3Integration.js`
- [ ] Deploy contract to Base Mainnet
- [ ] Update contract addresses everywhere
- [ ] Switch backend to production database (not in-memory Map)
- [ ] Add rate limiting to backend API
- [ ] Add authentication/API keys if needed
- [ ] Enable HTTPS for backend
- [ ] Test with real mainnet ETH (small amount first!)
- [ ] Monitor gas costs and optimize if needed
- [ ] Set up error logging and monitoring

---

## 🎉 Summary

You now have a fully functional **Paragraph Mode** for "Based on Typing"!

**What's included:**
- ✅ Smart contract with paragraph hash storage
- ✅ Backend API for paragraph fetching and verification
- ✅ Frontend integration with Web3
- ✅ Example HTML page
- ✅ Real-time stats and WPM calculation
- ✅ Blockchain fee payment and session tracking

**Next steps:**
1. Start backend server
2. Test on Base Sepolia
3. Deploy to mainnet when ready
4. Integrate into main game UI

---

## 📞 Support

For issues or questions:
- Check Base Sepolia Explorer for transaction details
- Review backend logs for API errors
- Test contract functions directly on Remix
- Verify MetaMask is on correct network (Base Sepolia)

Good luck with your typing game! 🚀
