// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract AchievementNFT is ERC721, Ownable {
    using Strings for uint256;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    uint256 private _tokenIds;

    // Achievement Types
    uint256 public constant FIRST_GAME = 1;
    uint256 public constant SPEED_DEMON = 2; // > 80 WPM
    uint256 public constant PERFECT_GAME = 3; // 100% Accuracy
    uint256 public constant MARATHON = 4; // > 500 words total
    uint256 public constant SURVIVOR = 5; // Survival Level 5
    uint256 public constant DAILY_CHAMPION = 6; // Complete Daily Challenge

    mapping(uint256 => string) public achievementNames;
    mapping(address => mapping(uint256 => bool)) public hasAchievement;
    mapping(uint256 => uint256) public tokenAchievementTypes; // tokenId => achievementId

    string public baseURI;

    // Fee Management
    AggregatorV3Interface internal priceFeed;
    address public signer;
    uint256 public constant MINT_FEE_USD = 40; // $0.40 USD in cents
    uint256 public ethPriceInCents; // Fallback price
    
    event FeePaid(address indexed player, uint256 amount);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    constructor(address _priceFeed, address _signer) ERC721("TypingAchievements", "TYPE") Ownable(msg.sender) {
        achievementNames[FIRST_GAME] = "First Steps";
        achievementNames[SPEED_DEMON] = "Speed Demon";
        achievementNames[PERFECT_GAME] = "Perfectionist";
        achievementNames[MARATHON] = "Marathon Runner";
        achievementNames[SURVIVOR] = "Survivor";
        achievementNames[DAILY_CHAMPION] = "Daily Champion";
        
        priceFeed = AggregatorV3Interface(_priceFeed);
        signer = _signer;
        ethPriceInCents = 300000; // Default fallback: $3000.00
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setSigner(address _newSigner) public onlyOwner {
        signer = _newSigner;
    }

    function setEthPrice(uint256 _priceInCents) public onlyOwner {
        ethPriceInCents = _priceInCents;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function calculateMintFee() public view returns (uint256) {
        // Try Chainlink first
        try priceFeed.latestRoundData() returns (
            uint80, /* roundId */
            int256 price,
            uint256, /* startedAt */
            uint256, /* updatedAt */
            uint80 /* answeredInRound */
        ) {
            if (price > 0) {
                // Fee (USD) = $0.60
                // Price is in 8 decimals. $3000 = 3000 * 10^8
                // Fee (Wei) = (0.60 * 10^18) / (Price / 10^8)
                //           = (0.60 * 10^26) / Price
                //           = (60 * 10^24) / Price
                return (uint256(MINT_FEE_USD) * 1e24) / uint256(price);
            }
        } catch {}

        // Fallback to manual price
        if (ethPriceInCents == 0) return 0.0002 ether; // Safety fallback
        return (MINT_FEE_USD * 1e18) / ethPriceInCents;
    }

    function mintAchievement(address player, uint256 achievementId, bytes calldata signature) public payable {
        require(achievementId >= 1 && achievementId <= 6, "Invalid achievement ID");
        require(!hasAchievement[player][achievementId], "Achievement already unlocked");

        // Verify Signature
        bytes32 messageHash = keccak256(abi.encodePacked(player, achievementId));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        require(ethSignedMessageHash.recover(signature) == signer, "Invalid signature");

        // Check Fee (Owner mints for free)
        if (msg.sender != owner()) {
            uint256 requiredFee = calculateMintFee();
            require(msg.value >= requiredFee, "Insufficient fee");

            // Refund excess
            if (msg.value > requiredFee) {
                (bool refundSuccess, ) = msg.sender.call{value: msg.value - requiredFee}("");
                require(refundSuccess, "Refund failed");
            }
            
            emit FeePaid(msg.sender, requiredFee);
        }

        _tokenIds++;
        uint256 newItemId = _tokenIds;

        _mint(player, newItemId);
        hasAchievement[player][achievementId] = true;
        tokenAchievementTypes[newItemId] = achievementId;
    }

    function checkAchievements(address player) public view returns (bool[] memory) {
        bool[] memory unlocked = new bool[](6);
        for (uint256 i = 0; i < 6; i++) {
            unlocked[i] = hasAchievement[player][i + 1];
        }
        return unlocked;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId);

        uint256 achievementId = tokenAchievementTypes[tokenId];
        string memory base = _baseURI();
        return bytes(base).length > 0 ? string(abi.encodePacked(base, Strings.toString(achievementId))) : "";
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
        
        emit FundsWithdrawn(owner(), balance);
    }
}


