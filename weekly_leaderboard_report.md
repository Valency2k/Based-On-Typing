# Weekly Leaderboard Implementation Report

## Executive Summary
**Yes, it is entirely possible** to implement a weekly leaderboard mechanism purely in the backend. This approach is recommended as it avoids the complexity, cost, and user disruption of redeploying the smart contract.

## Technical Approach

Since your smart contract already emits a `timestamp` for every completed game, the backend has all the data it needs to filter scores by time. We do not need to delete data; we simply create a new "view" of the data that only shows this week's scores.

### 1. Data Source
Your `backend/leaderboard.json` already contains the full history of games with timestamps:
```json
{
  "playerAddress": "0x...",
  "score": 1500,
  "timestamp": 1716555555 // Unix timestamp in seconds
}
```

### 2. Logic (Backend)
We would modify `backend/leaderboard.js` to add a filtering function:
1.  **Calculate Start of Week**: Determine the timestamp for the most recent Monday (or Sunday) at 00:00 UTC.
2.  **Filter**: When the frontend requests the "Weekly" leaderboard, the backend iterates through the stored scores and returns only those where `entry.timestamp >= startOfWeek`.
3.  **Sort**: Sort the filtered list by score/WPM as usual.

### 3. API Changes
We would add a new endpoint:
*   `GET /api/leaderboard/weekly`
*   Optional: `GET /api/leaderboard/weekly/:mode` (for specific modes like Survival/Time Limit)

## Pros & Cons

| Feature | Backend-Based (Recommended) | Smart Contract-Based |
| :--- | :--- | :--- |
| **Cost** | **Free** (No gas) | **Expensive** (Deployment gas) |
| **Data Safety** | High (Derived from on-chain history) | High (Stored on-chain) |
| **Flexibility** | **High** (Can change reset day anytime) | **Low** (Hardcoded logic) |
| **User Impact** | **None** (Seamless update) | **High** (Users must switch to new contract) |
| **History** | Preserves all-time history | Might overwrite/archive old data |

## Implementation Plan (When you are ready)

1.  **Backend**:
    *   Update `leaderboard.js` to include a `getWeeklyHandler`.
    *   Implement logic to calculate `startOfWeek` timestamp.
    *   Register the new route in `server.js`.

2.  **Frontend**:
    *   Add a "Weekly" tab to the Leaderboard UI.
    *   Update the API call to fetch from `/api/leaderboard/weekly` when that tab is active.

## Conclusion
This feature is a low-risk, high-value update that can be implemented immediately without touching the blockchain. I am ready to implement this whenever you give the go-ahead.
