# ⚡ Based on Typing

A blockchain-enhanced typing game built on the Base network. Players pay $0.10 in ETH to play various typing game modes, with all sessions recorded on-chain.

## 🎮 Game Modes

### 1. Time Limit Mode
Type as many words as possible before time runs out!
- Time options: 15s, 30s, 45s, 60s, 120s, 180s
- Unlimited words during the time period
- Score based on accuracy and speed

### 2. Word Count Mode
Type a fixed number of words as fast as you can!
- Word options: 10, 20, 30, 50 words
- Track your time and accuracy

### 3. Survival Mode
Survive as long as you can without too many mistakes!
- Maximum 3 mistakes per level
- Difficulty increases each level
- See how far you can go

### 4. Daily Challenge Mode
Complete today's unique challenge!
- New challenge every 24 hours
- Compete with other players
- Unique word combinations daily

## 💰 Pricing

- **Game Fee**: $0.10 USD (paid in Base ETH)
- Fee is automatically calculated based on current ETH price
- No rewards - this is a pay-to-play game

## 🚀 Quick Start

### Prerequisites

- Node.js v16 or higher
- MetaMask wallet
- Base ETH for game fees

### Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Set Up Environment Variables**
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your private key
# NEVER commit .env to version control!
```

3. **Compile Smart Contract**
```bash
npx hardhat compile
```

### Deployment

#### Deploy to Base Sepolia Testnet

```bash
# Update the ETH price in scripts/deploy.js first!
npx hardhat run scripts/deploy.js --network baseSepolia
```

#### Deploy to Base Mainnet

```bash
# Make sure you have real ETH for gas fees
npx hardhat run scripts/deploy.js --network base
```

#### After Deployment

1. Copy the deployed contract address from the console
2. Open `web3Integration.js`
3. Update the `contractAddress` with your deployed address
4. Update `activeNetwork` to 'mainnet' or 'testnet'

### Running the Game

1. **Start Local Server**
```bash
npm run dev
```

2. **Open in Browser**
- Navigate to `http://localhost:3000`
- Connect your MetaMask wallet
- Make sure you're on the Base network
- Start playing!

## 📁 Project Structure

```
Based on Typing/
├── contracts/
│   └── BasedOnTyping.sol      # Main smart contract
├── scripts/
│   └── deploy.js               # Deployment script
├── index.html                  # Main HTML file
├── styles.css                  # Styling
├── gameLogic.js               # Game mechanics
├── web3Integration.js         # Blockchain integration
├── app.js                     # Main application logic
├── hardhat.config.js          # Hardhat configuration
└── package.json               # Dependencies
```

## 🔧 Configuration

### Update ETH Price

The developer must update the ETH price periodically to maintain the $0.10 fee:

```javascript
// Connect to the deployed contract
const contract = new ethers.Contract(contractAddress, ABI, signer);

// Update price (e.g., ETH at $3000 = 300000 cents)
await contract.updateEthPrice(300000);
```

### Network Configuration

Edit `web3Integration.js` to switch between testnet and mainnet:

```javascript
// For testnet
activeNetwork: 'testnet'

// For mainnet
activeNetwork: 'mainnet'
```

## 🎯 How to Play

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask
2. **Select Mode**: Choose your preferred game mode
3. **Pay Fee**: Approve the $0.10 transaction
4. **Start Typing**: Type the words as they appear
5. **View Results**: See your stats and blockchain confirmation

## 📊 Smart Contract Features

- ✅ Four distinct game modes
- ✅ Automatic $0.10 USD fee calculation
- ✅ On-chain game session storage
- ✅ Daily challenge generation
- ✅ Player history tracking
- ✅ Gas-optimized operations
- ✅ Secure fee collection

## 🔒 Security

- Private keys stored in `.env` (never committed)
- Smart contract audited for common vulnerabilities
- No player funds stored (pay-per-game model)
- Transparent on-chain records

## 🌐 Base Network

This game is deployed on Base - Ethereum's Layer 2 solution:
- Fast transactions
- Low gas fees
- Secure and decentralized

## 📝 License

MIT License - feel free to use and modify

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📧 Support

For issues or questions:
- Open a GitHub issue
- Check the Base network documentation
- Review MetaMask setup guides

## 🎨 Future Enhancements

Possible features to add:
- Leaderboard system
- NFT achievements
- Multiplayer mode
- Tournament system
- Custom word sets
- Difficulty levels
- Sound effects
- Mobile app

---

**Built with ❤️ on Base Network**
