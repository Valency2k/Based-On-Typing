# How to Add Environment Variables on Vercel

Since you are deploying to Vercel, you need to add your environment variables in the Vercel Dashboard.

## Steps

1.  Go to your Vercel Dashboard: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2.  Select your project (**Based On Typing**).
3.  Click on the **Settings** tab.
4.  Click on **Environment Variables** in the left sidebar.
5.  Add the following variables one by one.

### Frontend Variables
These are needed for the React website to work.

| Name | Value | Note |
| :--- | :--- | :--- |
| `VITE_RPC_URL` | `https://mainnet.base.org` | |
| `VITE_API_URL` | ` ` (Leave Empty) | **Important**: Leave this value empty so it uses relative paths (`/api/...`) which Vercel handles automatically. |
| `VITE_CONTRACT_ADDRESS` | `0x82ca85c51d6018888fD3A9281156E8e358BFcb42` | |
| `VITE_ACHIEVEMENT_CONTRACT_ADDRESS` | `0x3BF06869Dae75c7742054096339E81dAAaacDA99` | |

### Backend Variables
These are needed for the serverless functions (database, signing transactions).

| Name | Value | Note |
| :--- | :--- | :--- |
| `MONGODB_URI` | `mongodb+srv://Valency:Josh1129@basedontyping0.1dcyrek.mongodb.net/?appName=BasedOnTyping0` | Your new MongoDB URI. |
| `PRIVATE_KEY` | *(Your Wallet Private Key)* | **Keep this secret!** Do not share it. |
| `ACHIEVEMENT_CONTRACT_ADDRESS` | `0x3BF06869Dae75c7742054096339E81dAAaacDA99` | Same as the frontend one, but without `VITE_`. |

### After Adding Variables
Once you have added all variables:
1.  Go to the **Deployments** tab.
2.  Click the **three dots** (...) on your latest deployment.
3.  Select **Redeploy**.

This ensures the new variables are applied to your live site.
