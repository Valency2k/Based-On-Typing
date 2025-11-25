import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import contractABI from '../contractABI.json';

const WalletContext = createContext();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
// if (!CONTRACT_ADDRESS) console.error("Missing VITE_CONTRACT_ADDRESS in .env");

const BASE_CHAIN_ID = 8453;
const BASE_CHAIN_ID_HEX = '0x2105';

export function WalletProvider({ children }) {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [error, setError] = useState(null);
    const [fee, setFee] = useState('0.000067'); // Default fallback
    const [feeWeiState, setFeeWeiState] = useState(null); // Store BigNumber

    // Initialize state from localStorage if available
    useEffect(() => {
        const savedAccount = localStorage.getItem('walletAddress');
        if (savedAccount) {
            eagerConnect();
        }
    }, []);

    const RPC_URLS = [
        'https://mainnet.base.org',
        'https://base.llamarpc.com',
        'https://1rpc.io/base',
        'https://base.publicnode.com'
    ];

    const fixRpcConnection = async () => {
        if (!window.ethereum) return;
        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: BASE_CHAIN_ID_HEX,
                    chainName: 'Base Mainnet',
                    rpcUrls: RPC_URLS,
                    nativeCurrency: {
                        name: 'Ether',
                        symbol: 'ETH',
                        decimals: 18
                    },
                    blockExplorerUrls: ['https://basescan.org']
                }]
            });
            return true;
        } catch (error) {
            console.error("Failed to fix RPC:", error);
            return false;
        }
    };

    const switchNetwork = async (library) => {
        try {
            await library.send('wallet_switchEthereumChain', [{ chainId: BASE_CHAIN_ID_HEX }]);
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask.
            if (switchError.code === 4902) {
                await fixRpcConnection();
            } else {
                console.error("Failed to switch network:", switchError);
                throw switchError;
            }
        }
    };

    const eagerConnect = async () => {
        if (!window.ethereum) return;
        try {
            const _provider = new ethers.providers.Web3Provider(window.ethereum);
            const accounts = await _provider.listAccounts();
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (err) {
            console.error("Eager connect failed:", err);
        }
    };

    const connectWallet = useCallback(async () => {
        if (!window.ethereum) {
            setError("MetaMask not installed");
            return;
        }

        try {
            const _provider = new ethers.providers.Web3Provider(window.ethereum);
            await _provider.send("eth_requestAccounts", []);

            const _network = await _provider.getNetwork();

            if (_network.chainId !== BASE_CHAIN_ID) {
                try {
                    await switchNetwork(_provider);
                    // After switch, the provider might need to refresh or we wait for chainChanged event
                    // But usually we can proceed or let the event handler handle the reload/update
                    // For safety, we can return here and let the event listener trigger re-connect
                    // return; 
                    // Actually, let's just continue, but the signer might be on the old chain momentarily?
                    // ethers.js usually handles this if we use the provider from window.ethereum which redirects.
                } catch (err) {
                    setError("Please switch to Base Mainnet");
                    return;
                }
            }

            const _signer = _provider.getSigner();
            const _account = await _signer.getAddress();
            // Refresh network in case it changed
            const updatedNetwork = await _provider.getNetwork();

            setProvider(_provider);
            setSigner(_signer);
            setAccount(_account);
            setChainId(updatedNetwork.chainId);

            // Persist
            localStorage.setItem('walletAddress', _account);

            // contractABI is likely the array itself if exported as JSON array
            const abi = Array.isArray(contractABI) ? contractABI : contractABI.abi;
            const _contract = new ethers.Contract(CONTRACT_ADDRESS, abi, _signer);
            setContract(_contract);

            // Fetch fee
            try {
                const feeWei = await _contract.calculateGameFee();
                setFeeWeiState(feeWei);
                setFee(ethers.utils.formatEther(feeWei));
            } catch (e) {
                console.warn("Could not fetch fee:", e);
            }

            setError(null);
        } catch (err) {
            console.error("Connection failed:", err);
            setError(err.message);
        }
    }, []);

    const disconnectWallet = useCallback(() => {
        setAccount(null);
        setSigner(null);
        setContract(null);
        localStorage.removeItem('walletAddress');
        // Do NOT reload the page
    }, []);

    // Listen for changes
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    localStorage.setItem('walletAddress', accounts[0]);
                    connectWallet();
                } else {
                    disconnectWallet();
                }
            };

            const handleChainChanged = (_chainId) => {
                console.log("Chain changed:", _chainId);
                // Reloading is recommended by MetaMask, but we can try to re-connect
                window.location.reload();
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, [connectWallet, disconnectWallet]);

    return (
        <WalletContext.Provider value={{
            account,
            provider,
            signer,
            contract,
            chainId,
            error,
            fee,
            feeWei: feeWeiState, // Expose BigNumber fee
            connectWallet,
            disconnectWallet,
            fixRpcConnection,
            isConnected: !!account
        }}>
            {children}
        </WalletContext.Provider>
    );
}

export const useWallet = () => useContext(WalletContext);
