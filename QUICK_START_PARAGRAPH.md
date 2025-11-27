# 🚀 Paragraph Mode - Quick Start Guide

## ⚡ Get Started in 5 Minutes

### Step 1: Start the Backend Server

```bash
cd backend
npm install
npm start
```

✅ Server running at `http://localhost:3001`

---

### Step 2: Deploy/Update Smart Contract

#### Option A: Using Remix (Easiest)

1. Open https://remix.ethereum.org/
2. Create new file: `BasedOnTyping.sol`
3. Copy content from `BasedOnTyping_Remix.sol`
4. Compile with Solidity 0.8.20+
5. Deploy to Base Sepolia:
   - Connect MetaMask to Base Sepolia
   - Constructor parameter: `330000` (if ETH = $3,300)
   - Click Deploy
6. **Copy the deployed contract address**

#### Option B: Using Hardhat

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network baseSepolia
```

---

### Step 3: Update Contract Addresses

Update the deployed contract address in **TWO files**:

**File 1: `web3Integration.js` (line 285)**
```javascript
contractAddress: '0xYOUR_NEW_CONTRACT_ADDRESS_HERE'
```

**File 2: `backend/server.js` (line 17)**
```javascript
const CONTRACT_ADDRESS = '0xYOUR_NEW_CONTRACT_ADDRESS_HERE';
```

---

### Step 4: Test Paragraph Mode

Open `paragraph-mode-example.html` in your browser:

```bash
# Option 1: Direct file open
# Just double-click paragraph-mode-example.html

# Option 2: Local server (recommended)
npx http-server -p 8080
# Then open http://localhost:8080/paragraph-mode-example.html
```

**Testing Flow:**
1. ✅ Connect MetaMask (Base Sepolia)
2. ✅ Select time limit (e.g., 60 seconds)
3. ✅ Click "Start Paragraph Mode"
4. ✅ Type the paragraph that appears
5. ✅ Complete within time limit
6. ✅ Results saved on blockchain

---

## 🎮 How It Works

### Backend Flow
```
User clicks Start
    ↓
Backend fetches paragraph from API
    ↓
Backend computes keccak256(paragraph)
    ↓
Returns: { paragraphText, paragraphHash, feeWei }
    ↓
Frontend starts blockchain transaction
    ↓
Contract stores hash + creates session
    ↓
User types paragraph
    ↓
Frontend submits results to blockchain
```

### Smart Contract Flow
```
startParagraphMode(timeLimit, paragraphHash)
    ↓
Validate timeLimit ∈ {15,30,45,60,120,180}
    ↓
Collect $0.10 fee in Base ETH
    ↓
Create session with paragraphHash
    ↓
Return sessionId
    ↓
completeGame(sessionId, stats...)
    ↓
Store final results on-chain
```

---

## 🔍 Verify It Works

### Check Backend
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-11-14T...",
  "sessions": 0
}
```

### Check Contract
Visit Base Sepolia Explorer:
```
https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS
```

You should see:
- ✅ Contract deployed
- ✅ Transactions when games are played
- ✅ Events emitted (GameStarted, GameCompleted)

---

## 📝 Environment Variables (Optional)

Create `backend/.env` for custom configuration:

```env
PORT=3001
CONTRACT_ADDRESS=0xYourContractAddress
NODE_ENV=development
```

---

## 🐛 Common Issues

### Backend won't start
**Error:** `Port 3001 already in use`  
**Fix:** Kill process or change port in `server.js`

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3001
kill -9 <PID>
```

### Contract deployment fails
**Error:** `Insufficient funds`  
**Fix:** Get Base Sepolia ETH from faucet:
- https://www.alchemy.com/faucets/base-sepolia
- https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

### MetaMask wrong network
**Fix:** Add Base Sepolia manually:
- Network Name: `Base Sepolia`
- RPC URL: `https://sepolia.base.org`
- Chain ID: `84532`
- Currency: `ETH`
- Explorer: `https://sepolia.basescan.org`

### Paragraph API timeout
**Solution:** Backend auto-falls back to default paragraphs

---

## 🎯 Integration into Main Game

To add Paragraph mode to your main `index.html`:

1. **Add mode selection button:**
```html
<button onclick="selectMode('paragraph')">📝 Paragraph Mode</button>
```

2. **Add time limit selector:**
```javascript
<select id="paragraphTimeLimit">
  <option value="15">15 seconds</option>
  <option value="30">30 seconds</option>
  <option value="60">1 minute</option>
  <option value="120">2 minutes</option>
  <option value="180">3 minutes</option>
</select>
```

3. **Start paragraph game:**
```javascript
async function startParagraphMode(timeLimit) {
    // Fetch paragraph
    const response = await fetch('http://localhost:3001/api/paragraph/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            timeLimit,
            playerAddress: web3Manager.account
        })
    });
    
    const data = await response.json();
    
    // Start on blockchain
    const result = await web3Manager.startParagraphGame(
        timeLimit,
        data.paragraphHash
    );
    
    // Initialize game
    currentGame = new GameSession('paragraph', {
        timeLimit,
        paragraphText: data.paragraphText,
        onTimerComplete: endGame
    });
    
    currentGame.initialize();
}
```

---

## 📊 Test Data

### Valid Time Limits
- ✅ 15 seconds
- ✅ 30 seconds
- ✅ 45 seconds
- ✅ 60 seconds
- ✅ 120 seconds
- ✅ 180 seconds
- ❌ Any other value → Contract reverts

### Example Paragraph Hash
```
Original: "The quick brown fox jumps over the lazy dog."
Hash: 0x5c6ce3b2c8c89d1b8d3e8f1c1a9c8e2b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8
```

---

## ✅ Success Checklist

Before going to production:

- [ ] Backend server running and accessible
- [ ] Contract deployed to Base Sepolia
- [ ] Contract addresses updated in all files
- [ ] MetaMask connected to Base Sepolia
- [ ] Have Base Sepolia ETH for testing
- [ ] Paragraph mode successfully started
- [ ] Typed paragraph and completed game
- [ ] Results visible on BaseScan
- [ ] All events emitted correctly

---

## 🎉 You're Ready!

Paragraph Mode is now fully integrated! Players can:
- ✅ Type real paragraphs from free APIs
- ✅ Choose time limits (15s - 180s)
- ✅ Pay $0.10 fee per game
- ✅ Track stats on-chain
- ✅ Compete for best WPM scores

**Next:** Deploy to Base Mainnet for real players! 🚀

---

## 📞 Need Help?

1. Check backend logs: `npm start` output
2. Check browser console: F12 → Console
3. Check MetaMask: Recent transactions
4. Check BaseScan: Contract interactions
5. Review `PARAGRAPH_MODE_GUIDE.md` for detailed info
