import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Contract configuration (replace with actual ABI and address)
import contractABI from '../contractABI.json';

// Default to localhost if not set
const CONTRACT_ADDRESS = '0x3D3Ad08e745B961480f919eCc23b53D34912E3d4';
const RPC_URL = 'https://base.llamarpc.com';

export function useWeb3() {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [error, setError] = useState(null);
    const [fee, setFee] = useState('0.000067'); // Default fallback

    const connectWallet = useCallback(async () => {
        console.log("Attempting to connect wallet...");
        if (!window.ethereum) {
            console.error("MetaMask not found");
            setError("MetaMask not installed");
            return;
        }

        try {
            const _provider = new ethers.providers.Web3Provider(window.ethereum);
            console.log("Provider created", _provider);

            await _provider.send("eth_requestAccounts", []);
            console.log("Accounts requested");

            const _signer = _provider.getSigner();
            const _account = await _signer.getAddress();
            console.log("Account connected:", _account);

            const _network = await _provider.getNetwork();
            console.log("Network detected:", _network);

            setProvider(_provider);
            setSigner(_signer);
            setAccount(_account);
            setChainId(_network.chainId);

            const _contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, _signer);
            setContract(_contract);
            console.log("Contract initialized at:", CONTRACT_ADDRESS);

            // Fetch current fee
            try {
                const feeWei = await _contract.calculateGameFee();
                setFee(ethers.utils.formatEther(feeWei));
                console.log("Fee fetched:", ethers.utils.formatEther(feeWei));
            } catch (e) {
                console.warn("Could not fetch fee (contract might not exist on this network):", e);
            }

            setError(null);
        } catch (err) {
            console.error("Wallet connection failed:", err);
            setError(err.message);
        }
    }, []);

    // Listen for account changes
    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                } else {
                    setAccount(null);
                    setSigner(null);
                }
            });
            window.ethereum.on('chainChanged', () => window.location.reload());
        }
    }, []);

    return {
        account,
        provider,
        signer,
        contract,
        chainId,
        error,
        fee,
        connectWallet,
        isConnected: !!account
    };
}
