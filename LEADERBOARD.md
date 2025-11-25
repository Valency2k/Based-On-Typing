# Based on Typing Leaderboard System

## Overview

This document describes the leaderboard system implemented for the Based on Typing blockchain typing game. The system tracks player performance across all game modes and provides ranked leaderboards.

## Architecture

The leaderboard system uses a hybrid approach:
1. **On-chain events** - The smart contract emits `LeaderboardUpdate` events when games are completed
2. **Off-chain processing** - The backend server listens for these events and stores leaderboard data in a SQLite database
3. **Scoring algorithms** - Different game modes use different scoring algorithms for fair ranking

## Smart Contract Changes

### New Event

```solidity
event LeaderboardUpdate(
    address indexed player,
    GameMode indexed mode,
    uint256 sessionId,
    uint256 wordsTyped,
    uint256 correctWords,
    uint256 mistakes,
    uint256 accuracy,
    uint256 durationSeconds,
    uint256 timestamp
);
```

### Modified Function

The `completeGame` function now emits the `LeaderboardUpdate` event with all necessary data for leaderboard calculations.

## Backend Implementation

### Storage

The leaderboard system uses a simple JSON file ([leaderboard.json](file:///C:/Users/DALLASCOMPUTER/Desktop/Typing game/backend/leaderboard.json)) for storing leaderboard data. This approach avoids the complexity of database dependencies while still providing persistent storage.

### Data Structure

```json
[
  {
    "player_address": "0x...",
    "mode": 0,
    "session_id": 123,
    "words_typed": 50,
    "correct_words": 45,
    "mistakes": 5,
    "accuracy": 9000,
    "duration_seconds": 60,
    "timestamp": 1234567890,
    "score": 85.5,
    "rank": 1
  }
]
```

### Scoring Algorithms

#### Time Limit Mode
- **Ranking criteria**: Accuracy, then Words Per Minute (WPM)
- **Scoring formula**: `70% accuracy + 30% WPM`

#### Word Count Mode
- **Ranking criteria**: Completion time, then accuracy
- **Scoring formula**: `70% time bonus + 30% accuracy`
- Time bonus: `10000 / duration_seconds`

#### Survival Mode
- **Ranking criteria**: Duration and correct words
- **Scoring formula**: `duration_seconds + (correct_words * 10)`

#### Daily Challenge Mode
- **Ranking criteria**: Fastest clean completion (fewest mistakes)
- **Scoring formula**: `time bonus + accuracy - mistake penalty`
- Time bonus: `10000 / duration_seconds`
- Mistake penalty: `mistakes * 100`

#### Paragraph Mode
- **Ranking criteria**: Accuracy, then time remaining
- **Scoring formula**: `80% accuracy + 20% time bonus`
- Time bonus: `10000 / duration_seconds`

#### Global Leaderboard
- **Ranking criteria**: Composite score across all modes
- **Scoring formula**: 
  - 40% accuracy
  - 20% low mistakes
  - 20% fast completion
  - 20% many words typed

### API Endpoints

#### Global Leaderboard
```
GET /api/leaderboard/global
```
Returns the combined leaderboard for all game modes.

#### Mode-Specific Leaderboard
```
GET /api/leaderboard/:mode
```
Where `:mode` can be:
- `time-limit`
- `word-count`
- `survival`
- `daily-challenge`
- `paragraph`

#### Player History
```
GET /api/leaderboard/player/:address
```
Returns a player's history across all game modes.

## Frontend Implementation

A standalone leaderboard page is provided at `leaderboard.html` with:
- Tabbed interface for different leaderboards
- Player search functionality
- Responsive design for mobile devices
- Real-time data from backend API

## Deployment

1. Ensure the backend server is running
2. The SQLite database will be automatically created
3. The system will automatically listen for blockchain events
4. Leaderboards update in real-time as games are completed

## Security Considerations

- All data is sourced from on-chain events, preventing tampering
- Player addresses are validated before database insertion
- Duplicate submissions are prevented with UNIQUE constraints
- Rate limiting is implemented through the blockchain itself

## Performance Optimization

- Pagination for large result sets
- Efficient scoring algorithms
- Event-driven updates rather than polling
- JSON file storage for simplicity (may need optimization for high-traffic applications)