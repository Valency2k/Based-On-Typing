# How to Add Environment Variables to GitHub

Since you cannot push `.env` files to GitHub (for security), you must add them as **Repository Secrets** or **Variables** if you plan to use GitHub Actions for deployment.

> **Note**: If you are deploying via **Vercel**, **Netlify**, or **Heroku**, you should set these variables in *their* dashboard, not GitHub.

## Steps to Add Secrets on GitHub

1.  Go to your repository on GitHub: [https://github.com/Valency2k/Based-On-Typing](https://github.com/Valency2k/Based-On-Typing)
2.  Click on **Settings** (top right tab).
3.  In the left sidebar, scroll down to **Secrets and variables** and click **Actions**.
4.  Click the green button **New repository secret**.
5.  Add the following secrets one by one:

| Name | Value |
| :--- | :--- |
| `VITE_RPC_URL` | `https://mainnet.base.org` |
| `VITE_API_URL` | `http://localhost:3001` (Change this to your real backend URL if deployed!) |
| `VITE_CONTRACT_ADDRESS` | `0x82ca85c51d6018888fD3A9281156E8e358BFcb42` |
| `VITE_ACHIEVEMENT_CONTRACT_ADDRESS` | `0x3BF06869Dae75c7742054096339E81dAAaacDA99` |

## If You Are Just Cloning Locally

If you (or someone else) clones this repo, GitHub Secrets won't help. You must manually create a `.env` file in the `frontend-react` folder and paste the values there.

1.  Navigate to `frontend-react/`.
2.  Create a file named `.env`.
3.  Paste the content:
    ```env
    VITE_RPC_URL=https://mainnet.base.org
    VITE_API_URL=http://localhost:3001
    VITE_CONTRACT_ADDRESS=0x82ca85c51d6018888fD3A9281156E8e358BFcb42
    VITE_ACHIEVEMENT_CONTRACT_ADDRESS=0x3BF06869Dae75c7742054096339E81dAAaacDA99
    ```
