import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { api } from '../services/api';
import { useWallet } from '../context/WalletContext';
import achievementABI from '../achievementABI.json';

const handleMint = async (achievementId) => {
    if (!account || !signer) {
        toast.error("Please connect your wallet");
        return;
    }
    setMintingId(achievementId);
    const toastId = toast.loading("Preparing to mint...");

    try {
        // 1. Get Signature & Fee from Backend
        const result = await api.mintAchievement(account, achievementId);
        if (!result.success) {
            throw new Error(result.error || "Failed to get mint signature");
        }

        const { signature, fee } = result;

        // Add 10% buffer to fee to handle price fluctuations
        const feeBN = ethers.BigNumber.from(fee);
        const bufferedFee = feeBN.mul(110).div(100);

        console.log("Minting Details:", {
            account,
            achievementId,
            signature,
            originalFee: ethers.utils.formatEther(feeBN),
            bufferedFee: ethers.utils.formatEther(bufferedFee)
        });

        // 2. Mint on Contract
        toast.loading(`Please confirm transaction (~$0.60 fee)`, { id: toastId });

        const contract = new ethers.Contract(ACHIEVEMENT_CONTRACT_ADDRESS, achievementABI.abi || achievementABI, signer);

        const tx = await contract.mintAchievement(account, achievementId, signature, {
            value: bufferedFee,
            gasLimit: 500000 // Force gas limit to avoid estimation errors
        });

        toast.loading("Minting in progress...", { id: toastId });
        await tx.wait();

        toast.success("NFT Minted Successfully!", { id: toastId });
    } catch (err) {
        console.error("Minting error:", err);
        // Handle user rejection specifically
        if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
            toast.error("Transaction rejected", { id: toastId });
        } else {
            toast.error("Minting Failed: " + (err.reason || err.message), { id: toastId });
        }
    } finally {
        setMintingId(null);
    }
};

return (
    <div className="bg-surface rounded-2xl border border-white/5 p-6">
        <h3 className="text-xl font-bold mb-6">🏅 Achievements</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {ACHIEVEMENTS.map((achievement) => {
                const isUnlocked = unlocked.includes(achievement.id);
                const isMinted = minted.includes(achievement.id);
                const isMinting = mintingId === achievement.id;

                return (
                    <motion.div
                        key={achievement.id}
                        whileHover={{ scale: 1.05 }}
                        className={`p-4 rounded-xl border transition-all relative group overflow-hidden ${isUnlocked
                            ? 'bg-primary/10 border-primary/50 opacity-100'
                            : 'bg-white/5 border-white/5 opacity-50 grayscale'
                            }`}
                    >
                        <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-black/20">
                            <img
                                src={achievement.image}
                                alt={achievement.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=NFT'; }}
                            />
                        </div>
                        <div className="font-bold text-sm">{achievement.name}</div>
                        <div className="text-xs text-text-muted mt-1">{achievement.description}</div>

                        {isMinted && (
                            <div className="absolute top-2 right-2 text-xs bg-gold text-black px-2 py-0.5 rounded-full font-bold">
                                NFT
                            </div>
                        )}

                        {isUnlocked && !isMinted && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMint(achievement.id);
                                }}
                                disabled={isMinting}
                                className="mt-3 w-full py-1 text-xs bg-primary hover:bg-primary-hover text-white rounded transition-colors disabled:opacity-50"
                            >
                                {isMinting ? "Minting..." : "Mint NFT"}
                            </button>
                        )}
                    </motion.div>
                );
            })}
        </div>
    </div>
);
}
