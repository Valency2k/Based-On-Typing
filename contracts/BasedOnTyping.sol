// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title BasedOnTyping
 * @notice A blockchain-enhanced typing game on Base network
 * @dev Implements multiple game modes with developer fees and leaderboard
 */
contract BasedOnTyping {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    // ============ State Variables ============
    
    address public immutable developer;
    address public signer; // Server-side signer
    AggregatorV3Interface internal priceFeed;

    uint256 public constant GAME_FEE_USD = 20; // $0.20 USD in cents
    uint256 public ethPriceInCents; // Legacy/Fallback
    uint256 public lastPriceUpdate;
    uint256 public constant PRICE_UPDATE_INTERVAL = 1 hours;
    
    // Game mode enumeration
    enum GameMode {
        TimeLimit,      // Type as many words as possible in given time
        WordCount,      // Type fixed number of words
        Survival,       // Survive by not missing too many words
        DailyChallenge, // Daily unique challenge
        Paragraph       // Type AI-generated paragraph within time limit
    }
    
    // Game session structure
    struct GameSession {
        address player;
        GameMode mode;
        uint256 startTime;
        uint256 endTime;
        uint256 timeLimit;      // For TimeLimit and Paragraph modes (seconds)
        uint256 wordCount;      // For WordCount mode
        uint256 wordsTyped;
        uint256 correctWords;
        uint256 mistakes;
        uint256 accuracy;       // Percentage (0-10000 for 0.00% - 100.00%)
        uint256 wpm;            // Words Per Minute (industry standard calculation)
        uint256 duration;       // Actual duration in seconds
        uint256 correctCharacters; // Total correct characters typed
        bool completed;
        bytes32 wordSetHash;    // Hash of words used in this session
        bytes32 paragraphHash;  // Hash of paragraph for Paragraph mode
    }
    
    // Daily challenge structure
    struct DailyChallenge {
        uint256 challengeDate;  // Unix timestamp (day start)
        bytes32 challengeHash;  // Unique challenge identifier
        uint256 wordCount;
        uint256 timeLimit;
        uint256 participantCount;
    }
    
    // Leaderboard entry structure
    struct LeaderboardEntry {
        address player;
        GameMode mode;
        uint256 wpm;
        uint256 accuracy;
        uint256 duration;
        uint256 timestamp;
        uint256 score; // Combined score for ranking
    }
    
    // ============ Storage ============
    
    mapping(address => GameSession[]) public playerSessions;
    mapping(address => uint256) public playerGameCount;
    mapping(uint256 => DailyChallenge) public dailyChallenges; // day timestamp => challenge
    
    // Leaderboard mappings
    mapping(GameMode => LeaderboardEntry[]) public modeLeaderboards;
    mapping(GameMode => uint256) public modeLeaderboardLengths;
    mapping(uint256 => LeaderboardEntry[]) public dailyLeaderboards; // day timestamp => entries
    
    // Global leaderboard
    LeaderboardEntry[] public globalLeaderboard;
    uint256 public globalLeaderboardLength;
    
    uint256 public totalGamesPlayed;
    uint256 public totalFeesCollected;
    
    // ============ Events ============
    
    event GameStarted(
        address indexed player,
        uint256 indexed sessionId,
        GameMode mode,
        uint256 timestamp
    );
    
    event ModeSelected(
        address indexed player,
        GameMode mode,
        uint256 timeOrWords
    );
    
    event FeePaid(
        address indexed player,
        uint256 amount,
        uint256 timestamp
    );
    
    event GameCompleted(
        address indexed player,
        uint256 indexed sessionId,
        uint256 wordsTyped,
        uint256 accuracy,
        uint256 wpm,
        uint256 timestamp
    );
    
    event ScoreSubmitted(
        address indexed player,
        GameMode mode,
        uint256 wpm,
        uint256 accuracy,
        uint256 score,
        uint256 timestamp
    );
    
    event PriceUpdated(
        uint256 newPrice,
        uint256 timestamp
    );
    
    event DailyChallengeCreated(
        uint256 indexed challengeDate,
        bytes32 challengeHash,
        uint256 wordCount,
        uint256 timeLimit
    );
    
    // ============ Errors ============
    
    error InsufficientFee();
    error InvalidMode();
    error InvalidTimeLimit();
    error InvalidWordCount();
    error GameNotFound();
    error GameAlreadyCompleted();
    error Unauthorized();
    error PriceNotSet();
    error InvalidLeaderboardEntry();
    
    // ============ Constructor ============
    
    constructor(uint256 initialEthPriceInCents, address _priceFeed, address _signer) {
        developer = msg.sender;
        ethPriceInCents = initialEthPriceInCents;
        lastPriceUpdate = block.timestamp;
        priceFeed = AggregatorV3Interface(_priceFeed);
        signer = _signer;
    }

    function setSigner(address _signer) external {
        if (msg.sender != developer) revert Unauthorized();
        signer = _signer;
    }
    
    // ============ Price Management ============
    
    /**
     * @notice Update ETH price in cents (developer only)
     * @dev Called by developer to update price manually
     * @param newPriceInCents New ETH price (e.g., 300000 for $3000.00)
     */
    function updateEthPrice(uint256 newPriceInCents) external {
        if (msg.sender != developer) revert Unauthorized();
        ethPriceInCents = newPriceInCents;
        lastPriceUpdate = block.timestamp;
        emit PriceUpdated(newPriceInCents, block.timestamp);
    }
    
    /**
     * @notice Calculate required ETH fee based on current price
     * @return Required fee in wei
     */
    function calculateGameFee() public view returns (uint256) {
        // Try Chainlink first
        try priceFeed.latestRoundData() returns (
            uint80, /* roundId */
            int256 price,
            uint256, /* startedAt */
            uint256, /* updatedAt */
            uint80 /* answeredInRound */
        ) {
            if (price > 0) {
                // Chainlink returns 8 decimals for USD pairs (e.g. 300000000000 for $3000)
                // We want cents (2 decimals). So divide by 1e6.
                // But let's do the math carefully.
                // Fee (USD) = $0.20
                // Fee (ETH) = 0.20 / Price(USD)
                // Price is in 8 decimals. $3000 = 3000 * 10^8
                // Fee (Wei) = (0.20 * 10^18) / (Price / 10^8)
                //           = (0.20 * 10^26) / Price
                //           = (20 * 10^24) / Price
                return (uint256(GAME_FEE_USD) * 1e24) / uint256(price);
            }
        } catch {}

        // Fallback to manual price
        if (ethPriceInCents == 0) revert PriceNotSet();
        return (GAME_FEE_USD * 1e18) / ethPriceInCents;
    }
    
    // ============ Game Session Functions ============
    
    /**
     * @notice Start a Time Limit mode game
     * @param timeLimitSeconds Time allowed (15, 30, 45, 60, 90, 120, or 180 seconds)
     * @param wordSetHash Hash of the word set to be used
     */
    function startTimeLimitMode(uint256 timeLimitSeconds, bytes32 wordSetHash) 
        external 
        payable 
        returns (uint256) 
    {
        // Validate time limit
        if (
            timeLimitSeconds != 15 && 
            timeLimitSeconds != 30 && 
            timeLimitSeconds != 45 && 
            timeLimitSeconds != 60 && 
            timeLimitSeconds != 90 && 
            timeLimitSeconds != 120 && 
            timeLimitSeconds != 180
        ) revert InvalidTimeLimit();
        
        return _startGame(GameMode.TimeLimit, timeLimitSeconds, 0, wordSetHash);
    }
    
    /**
     * @notice Start a Word Count mode game
     * @param wordCount Number of words to type (10, 20, 30, 50, or 100)
     * @param wordSetHash Hash of the word set to be used
     */
    function startWordCountMode(uint256 wordCount, bytes32 wordSetHash) 
        external 
        payable 
        returns (uint256) 
    {
        // Validate word count
        if (
            wordCount != 10 && 
            wordCount != 20 && 
            wordCount != 30 && 
            wordCount != 50 && 
            wordCount != 100
        ) revert InvalidWordCount();
        
        return _startGame(GameMode.WordCount, 0, wordCount, wordSetHash);
    }

    /**
     * @notice Start a Survival mode game
     * @param wordSetHash Hash of the word set to be used
     */
    function startSurvivalMode(bytes32 wordSetHash) 
        external 
        payable 
        returns (uint256) 
    {
        return _startGame(GameMode.Survival, 0, 0, wordSetHash);
    }
    
    /**
     * @notice Start a Daily Challenge mode game
     */
    function startDailyChallengeMode() 
        external 
        payable 
        returns (uint256) 
    {
        uint256 today = _getCurrentDay();
        DailyChallenge storage challenge = dailyChallenges[today];
        
        // Create daily challenge if it doesn't exist
        if (challenge.challengeDate == 0) {
            _createDailyChallenge(today);
            challenge = dailyChallenges[today];
        }
        
        challenge.participantCount++;
        return _startGame(GameMode.DailyChallenge, challenge.timeLimit, challenge.wordCount, challenge.challengeHash);
    }
    
    /**
     * @notice Start a Paragraph mode game
     * @param timeLimitSeconds Time allowed (15, 30, 45, 60, 90, 120, or 180 seconds)
     * @param paragraphHash Keccak256 hash of the AI-generated paragraph to be typed
     */
    function startParagraphMode(uint256 timeLimitSeconds, bytes32 paragraphHash) 
        external 
        payable 
        returns (uint256) 
    {
        // Validate time limit
        if (
            timeLimitSeconds != 15 && 
            timeLimitSeconds != 30 && 
            timeLimitSeconds != 45 && 
            timeLimitSeconds != 60 && 
            timeLimitSeconds != 90 && 
            timeLimitSeconds != 120 && 
            timeLimitSeconds != 180
        ) revert InvalidTimeLimit();
        
        return _startGameWithParagraph(timeLimitSeconds, paragraphHash);
    }
    
    /**
     * @dev Internal function to start a game session
     */
    function _startGame(
        GameMode mode,
        uint256 timeLimit,
        uint256 wordCount,
        bytes32 wordSetHash
    ) private returns (uint256) {
        // Check and collect fee
        uint256 requiredFee = calculateGameFee();
        if (msg.value < requiredFee) revert InsufficientFee();
        
        // Send fee to developer
        (bool success, ) = developer.call{value: requiredFee}("");
        require(success, "Fee transfer failed");
        
        // Refund excess
        if (msg.value > requiredFee) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - requiredFee}("");
            require(refundSuccess, "Refund failed");
        }
        
        // Create game session
        GameSession memory newSession = GameSession({
            player: msg.sender,
            mode: mode,
            startTime: block.timestamp,
            endTime: 0,
            timeLimit: timeLimit,
            wordCount: wordCount,
            wordsTyped: 0,
            correctWords: 0,
            mistakes: 0,
            accuracy: 0,
            wpm: 0,
            duration: 0,
            correctCharacters: 0,
            completed: false,
            wordSetHash: wordSetHash,
            paragraphHash: bytes32(0) // No paragraph for non-paragraph modes
        });
        
        playerSessions[msg.sender].push(newSession);
        uint256 sessionId = playerSessions[msg.sender].length - 1;
        
        playerGameCount[msg.sender]++;
        totalGamesPlayed++;
        totalFeesCollected += requiredFee;
        
        emit FeePaid(msg.sender, requiredFee, block.timestamp);
        emit ModeSelected(msg.sender, mode, timeLimit > 0 ? timeLimit : wordCount);
        emit GameStarted(msg.sender, sessionId, mode, block.timestamp);
        
        return sessionId;
    }
    
    /**
     * @dev Internal function to start a paragraph game session
     */
    function _startGameWithParagraph(
        uint256 timeLimit,
        bytes32 paragraphHash
    ) private returns (uint256) {
        // Check and collect fee
        uint256 requiredFee = calculateGameFee();
        if (msg.value < requiredFee) revert InsufficientFee();
        
        // Send fee to developer
        (bool success, ) = developer.call{value: requiredFee}("");
        require(success, "Fee transfer failed");
        
        // Refund excess
        if (msg.value > requiredFee) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - requiredFee}("");
            require(refundSuccess, "Refund failed");
        }
        
        // Create game session for paragraph mode
        GameSession memory newSession = GameSession({
            player: msg.sender,
            mode: GameMode.Paragraph,
            startTime: block.timestamp,
            endTime: 0,
            timeLimit: timeLimit,
            wordCount: 0, // Not applicable for paragraph mode
            wordsTyped: 0,
            correctWords: 0,
            mistakes: 0,
            accuracy: 0,
            wpm: 0,
            duration: 0,
            correctCharacters: 0,
            completed: false,
            wordSetHash: bytes32(0), // Not applicable for paragraph mode
            paragraphHash: paragraphHash // Store paragraph hash
        });
        
        playerSessions[msg.sender].push(newSession);
        uint256 sessionId = playerSessions[msg.sender].length - 1;
        
        playerGameCount[msg.sender]++;
        totalGamesPlayed++;
        totalFeesCollected += requiredFee;
        
        emit FeePaid(msg.sender, requiredFee, block.timestamp);
        emit ModeSelected(msg.sender, GameMode.Paragraph, timeLimit);
        emit GameStarted(msg.sender, sessionId, GameMode.Paragraph, block.timestamp);
        
        return sessionId;
    }
    
    /**
     * @notice Complete a game session with results
     * @param sessionId The session ID to complete
     * @param wordsTyped Total words typed
     * @param correctWords Number of correct words
     * @param mistakes Number of mistakes
     * @param correctCharacters Total number of correct characters typed (excluding spaces)
     * @param wpm Words Per Minute (calculated off-chain)
     * @param signature Server-side signature of the game results
     */
    function completeGame(
        uint256 sessionId,
        uint256 wordsTyped,
        uint256 correctWords,
        uint256 mistakes,
        uint256 correctCharacters,
        uint256 wpm,
        bytes calldata signature
    ) external {
        if (sessionId >= playerSessions[msg.sender].length) revert GameNotFound();
        
        GameSession storage session = playerSessions[msg.sender][sessionId];
        
        if (session.player != msg.sender) revert Unauthorized();
        if (session.completed) revert GameAlreadyCompleted();

        // Verify Signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            sessionId,
            wordsTyped,
            correctWords,
            mistakes,
            correctCharacters,
            wpm
        ));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        if (ethSignedMessageHash.recover(signature) != signer) {
            revert Unauthorized();
        }
        
        // Update session data
        session.endTime = block.timestamp;
        session.wordsTyped = wordsTyped;
        session.correctWords = correctWords;
        session.mistakes = mistakes;
        session.correctCharacters = correctCharacters;
        
        // Calculate duration in seconds
        session.duration = session.endTime - session.startTime;
        
        // Calculate accuracy (percentage with 2 decimal places)
        if (wordsTyped > 0) {
            session.accuracy = (correctWords * 10000) / wordsTyped;
        }
        
        // Use the WPM provided by the frontend (verified by signature)
        session.wpm = wpm;
        
        session.completed = true;
        
        emit GameCompleted(
            msg.sender,
            sessionId,
            wordsTyped,
            session.accuracy,
            session.wpm,
            block.timestamp
        );
    }
    
    // ============ Leaderboard Functions ============
    
    /**
     * @notice Submit score to leaderboard
     * @param mode Game mode
     * @param wpm Words per minute
     * @param accuracy Accuracy percentage (0-10000)
     * @param duration Game duration in seconds
     * @param textLength Length of text typed
     */
    function submitScore(
        GameMode mode,
        uint256 wpm,
        uint256 accuracy,
        uint256 duration,
        uint256 textLength
    ) external {
        // Validate inputs
        if (wpm == 0 || accuracy > 10000) revert InvalidLeaderboardEntry();
        
        // Calculate combined score (weighted formula)
        // Higher WPM and accuracy get better scores
        // Duration and text length are factors too
        uint256 score = (wpm * accuracy * 100) / (duration + 1);
        
        // Create leaderboard entry
        LeaderboardEntry memory entry = LeaderboardEntry({
            player: msg.sender,
            mode: mode,
            wpm: wpm,
            accuracy: accuracy,
            duration: duration,
            timestamp: block.timestamp,
            score: score
        });
        
        // Add to mode-specific leaderboard
        if (mode == GameMode.DailyChallenge) {
            uint256 today = _getCurrentDay();
            dailyLeaderboards[today].push(entry);
            // Also add to general mode leaderboard for history if desired, or skip
            modeLeaderboards[mode].push(entry);
            modeLeaderboardLengths[mode]++;
        } else {
            modeLeaderboards[mode].push(entry);
            modeLeaderboardLengths[mode]++;
        }
        
        // Add to global leaderboard
        globalLeaderboard.push(entry);
        globalLeaderboardLength++;
        
        emit ScoreSubmitted(
            msg.sender,
            mode,
            wpm,
            accuracy,
            score,
            block.timestamp
        );
    }
    
    /**
     * @notice Get leaderboard for a specific mode
     * @param mode Game mode
     * @param limit Number of entries to return
     * @return Leaderboard entries sorted by score
     */
    function getLeaderboard(GameMode mode, uint256 limit) 
        external 
        view 
        returns (LeaderboardEntry[] memory) 
    {
        LeaderboardEntry[] storage entries;
        
        if (mode == GameMode.DailyChallenge) {
            uint256 today = _getCurrentDay();
            entries = dailyLeaderboards[today];
        } else {
            entries = modeLeaderboards[mode];
        }
        
        uint256 length = entries.length;
        if (limit > length) limit = length;
        if (limit > 100) limit = 100; // Cap at 100 entries
        
        LeaderboardEntry[] memory result = new LeaderboardEntry[](limit);
        
        // Simple sorting - get top entries
        // In a production contract, you'd want a more efficient sorting algorithm
        for (uint256 i = 0; i < limit; i++) {
            uint256 highestIndex = 0;
            uint256 highestScore = 0;
            
            for (uint256 j = 0; j < entries.length; j++) {
                if (entries[j].score > highestScore) {
                    highestScore = entries[j].score;
                    highestIndex = j;
                }
            }
            
            result[i] = entries[highestIndex];
            
            // Mark this entry as used (in a real implementation, you'd use a more efficient approach)
            // This is a simplified version for demonstration
        }
        
        return result;
    }
    
    /**
     * @notice Get global leaderboard
     * @param limit Number of entries to return
     * @return Global leaderboard entries sorted by score
     */
    function getGlobalLeaderboard(uint256 limit) 
        external 
        view 
        returns (LeaderboardEntry[] memory) 
    {
        if (limit > globalLeaderboardLength) limit = globalLeaderboardLength;
        if (limit > 100) limit = 100; // Cap at 100 entries
        
        LeaderboardEntry[] memory result = new LeaderboardEntry[](limit);
        
        // Simple sorting - get top entries
        for (uint256 i = 0; i < limit; i++) {
            uint256 highestIndex = 0;
            uint256 highestScore = 0;
            
            for (uint256 j = 0; j < globalLeaderboard.length; j++) {
                if (globalLeaderboard[j].score > highestScore) {
                    highestScore = globalLeaderboard[j].score;
                    highestIndex = j;
                }
            }
            
            result[i] = globalLeaderboard[highestIndex];
        }
        
        return result;
    }
    
    // ============ Daily Challenge Functions ============
    
    /**
     * @dev Create a new daily challenge
     */
    function _createDailyChallenge(uint256 dayTimestamp) private {
        // Generate pseudo-random challenge parameters
        bytes32 randomHash = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            dayTimestamp
        ));
        
        // Determine word count (20-50 words)
        uint256 wordCount = 20 + (uint256(randomHash) % 31);
        
        // Determine time limit (60-180 seconds)
        uint256 timeLimit = 60 + (uint256(keccak256(abi.encode(randomHash, "time"))) % 121);
        
        dailyChallenges[dayTimestamp] = DailyChallenge({
            challengeDate: dayTimestamp,
            challengeHash: randomHash,
            wordCount: wordCount,
            timeLimit: timeLimit,
            participantCount: 0
        });
        
        emit DailyChallengeCreated(dayTimestamp, randomHash, wordCount, timeLimit);
    }
    
    /**
     * @dev Get current day timestamp (midnight UTC)
     */
    function _getCurrentDay() private view returns (uint256) {
        return (block.timestamp / 1 days) * 1 days;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get player's total game count
     */
    function getPlayerGameCount(address player) external view returns (uint256) {
        return playerGameCount[player];
    }
    
    /**
     * @notice Get specific game session
     */
    function getGameSession(address player, uint256 sessionId) 
        external 
        view 
        returns (GameSession memory) 
    {
        if (sessionId >= playerSessions[player].length) revert GameNotFound();
        return playerSessions[player][sessionId];
    }
    
    /**
     * @notice Get all sessions for a player
     */
    function getPlayerSessions(address player) 
        external 
        view 
        returns (GameSession[] memory) 
    {
        return playerSessions[player];
    }
    
    /**
     * @notice Get today's daily challenge
     */
    function getTodayChallenge() external view returns (DailyChallenge memory) {
        uint256 today = _getCurrentDay();
        return dailyChallenges[today];
    }
    
    /**
     * @notice Get current game fee in wei
     */
    function getCurrentGameFee() external view returns (uint256) {
        return calculateGameFee();
    }
    
    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 totalGames,
        uint256 totalFees,
        uint256 currentFeeWei
    ) {
        return (totalGamesPlayed, totalFeesCollected, calculateGameFee());
    }
}