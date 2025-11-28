import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useAccount, useConnect, useDisconnect, useWalletClient, usePublicClient } from 'wagmi';
import contractABI from '../contractABI.json';

const WalletContext = createContext();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x3D3Ad08e745B961480f919eCc23b53D34912E3d4';

function walletClientToSigner(walletClient) {
    const { account, chain, transport } = walletClient;
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    };
    const provider = new ethers.providers.Web3Provider(transport, network);
    const signer = provider.getSigner(account.address);
    return signer;
}

function publicClientToProvider(publicClient) {
    const { chain, transport } = publicClient;
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    };
    if (transport.type === 'fallback')
        return new ethers.providers.FallbackProvider(
            (transport.transports).map(
                ({ value }) => new ethers.providers.JsonRpcProvider(value?.url, network),
            ),
        );
    return new ethers.providers.JsonRpcProvider(transport.url, network);
}

export function WalletProvider({ children }) {
    const { address, isConnected, chainId } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    const [fee, setFee] = useState('0.000067');
    const [feeWeiState, setFeeWeiState] = useState(null);


    // Derive Ethers Provider and Signer from Wagmi Clients
    const provider = useMemo(() => {
        return publicClient ? publicClientToProvider(publicClient) : null;
    }, [publicClient]);

    const signer = useMemo(() => {
        return walletClient ? walletClientToSigner(walletClient) : null;
    }, [walletClient]);

    // Initialize Contract
    const contract = useMemo(() => {
        if (!signer || !CONTRACT_ADDRESS) return null;
        try {
            const abi = Array.isArray(contractABI) ? contractABI : contractABI.abi;
            return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
        } catch (err) {
            console.error("Contract init failed:", err);
            return null;
        }
    }, [signer]);

    // Fetch Fee
    useEffect(() => {
        if (contract) {
            contract.calculateGameFee().then(feeWei => {
                setFeeWeiState(feeWei);
                setFee(ethers.utils.formatEther(feeWei));
            }).catch(e => console.warn("Could not fetch fee:", e));
        }
    }, [contract]);

    const connectWallet = async () => {
        // For Farcaster Miniapps, connection is usually automatic via the connector.
        // But if we need to trigger it:
        if (connectors.length > 0) {
            connect({ connector: connectors[0] });
        }
    };

    const fixRpcConnection = async () => {
        // Wagmi handles RPCs, but if we need to force switch/add chain:
        // This might be less relevant with Farcaster connector but keeping stub for compatibility
        console.log("fixRpcConnection called - handled by Wagmi/Farcaster");
        return true;
    };

    return (
        <WalletContext.Provider value={{
            account: address,
            provider,
            signer,
            contract,
            chainId,

            fee,
            feeWei: feeWeiState,
            connectWallet,
            disconnectWallet: disconnect,
            fixRpcConnection,
            isConnected
        }}>
            {children}
        </WalletContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWallet = () => useContext(WalletContext);
