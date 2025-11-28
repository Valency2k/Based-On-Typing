import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameArea } from '../components/GameArea';
import { api } from '../services/api';
import { useWallet } from '../context/WalletContext';
import { useStats } from '../context/StatsContext';
import { PaymentModal } from '../components/PaymentModal';
import { paymentUtils } from '../utils/paymentLogic';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';

export default function DailyChallengePage() {
    const { isConnected, connectWallet, contract, fee, feeWei, provider, account, fixRpcConnection } = useWallet();
    const { updateStats } = useStats();
    const [loading, setLoading] = useState(true);
    const [challengeData, setChallengeData] = useState(null);
    const [gameState, setGameState] = useState('intro'); // intro, payment, playing, results
    const [lastStats, setLastStats] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const navigate = useNavigate();

    // Payment State
    const [showPayment, setShowPayment] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState({ gasFee: '0', total: '0' });
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Check localStorage first
                const today = new Date().toISOString().split('T')[0];
                const saved = localStorage.getItem('dailyChallengeData');
                const savedDate = localStorage.getItem('dailyChallengeDate');

                if (saved && savedDate === today) {
                    setChallengeData(JSON.parse(saved));
                    setLoading(false);
                } else {
                    const data = await api.fetchDailyChallenge();
                    if (data && (data.error || data.success === false)) {
                        console.error("Daily Challenge API Error:", data.error);
                        setChallengeData(null); // Keep null to show error state
                    } else {
                        setChallengeData(data);
                        localStorage.setItem('dailyChallengeData', JSON.stringify(data));
                        localStorage.setItem('dailyChallengeDate', today);
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to load daily challenge:", err);
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleStart = async () => {
        if (!isConnected) {
            connectWallet();
            return;
        }

        // Prepare payment
        try {
            const gasPrice = await paymentUtils.getGasPrice(provider);
            const gameFeeEth = feeWei || ethers.utils.parseEther(fee || '0.000067');
            const { adjustedGasPrice, total } = paymentUtils.calculateTotalCost(gameFeeEth, gasPrice);

            setPaymentDetails({
                gasFee: ethers.utils.formatEther(adjustedGasPrice.mul(200000)),
                total: ethers.utils.formatEther(total),
                adjustedGasPrice
            });
            setGameState('payment');
        } catch (err) {
            console.error("Payment prep failed:", err);
            toast.error("Could not calculate gas fees");
        }
    };

    const handlePaymentConfirm = async () => {
        setIsProcessing(true);
        try {
            if (contract) {
                // Fetch fresh fee with buffer to prevent "InsufficientFee"
                let finalFee = feeWei || ethers.utils.parseEther(fee || '0.000067');
                try {
                    const freshFee = await contract.calculateGameFee();
                    // Add 10% buffer for price fluctuations (contract refunds excess)
                    finalFee = freshFee.mul(110).div(100);
                    console.log("Fetched fresh fee:", ethers.utils.formatEther(freshFee), "Buffered:", ethers.utils.formatEther(finalFee));
                } catch (err) {
                    console.warn("Failed to fetch fresh fee, using stored/default:", err);
                }

                const tx = await contract.startDailyChallengeMode({
                    value: finalFee,
                    gasPrice: paymentDetails.adjustedGasPrice,
                    gasLimit: 500000
                });
                const receipt = await tx.wait();
                const event = receipt.events?.find(e => e.event === 'GameStarted');
                if (event) {
                    setSessionId(event.args.sessionId);
                }

                toast.success("Payment Successful! Starting Challenge...");
                setGameState('playing');
            } else {
                throw new Error("Contract not initialized");
            }
        } catch (err) {
            console.error("Payment failed:", err);

            // Check for RPC rate limit error
            if (err.code === -32002 || err.message?.includes('RPC endpoint returned too many errors')) {
                toast.error(
                    (t) => (
                        <div className="flex flex-col gap-2">
                            <span>Connection Issues?</span>
                            <button
                                onClick={async () => {
                                    toast.dismiss(t.id);
                                    const success = await fixRpcConnection();
                                    if (success) toast.success("Network updated! Try again.");
                                }}
                                className="bg-white/20 px-3 py-1 rounded text-sm hover:bg-white/30"
                            >
                                Fix Connection
                            </button>
                        </div>
                    ),
                    { duration: 8000 }
                );
            } else {
                toast.error("Payment failed: " + (err.reason || err.message));
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleComplete = async (stats) => {
        setLastStats(stats);
        updateStats(stats);
        setGameState('results');

        // Mark as played today
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('lastDailyChallengePlayed', today);

        // Call completeGame on contract
        if (contract && sessionId) {
            try {
                // 1. Get signature from backend
                const signData = await api.signGame({
                    player: account,
                    sessionId: sessionId.toString(),
                    wordsTyped: stats.wordsTyped,
                    correctWords: stats.correctWords,
                    mistakes: stats.mistakes,
                    correctCharacters: stats.correctCharacters,
                    wpm: stats.wpm
                });

                if (!signData.success) throw new Error(signData.error || "Signing failed");

                const signature = signData.signature;

                const tx = await contract.completeGame(
                    sessionId,
                    stats.wordsTyped,
                    stats.correctWords,
                    stats.mistakes,
                    stats.correctCharacters,
                    signature
                );
                await tx.wait();
                toast.success("Score saved to blockchain!");
            } catch (err) {
                console.error("Failed to save game:", err);
                toast.error("Failed to save to blockchain");
            }
        }
    };

    if (loading) {
        return <div className="text-center py-20">Loading Daily Challenge...</div>;
    }

    if (!challengeData) {
        return <div className="text-center py-20 text-error">Failed to load challenge. Please try again later.</div>;
    }

    if (gameState === 'payment') {
        return (
            <PaymentModal
                mode="dailyChallenge"
                fee={fee}
                gasFee={paymentDetails.gasFee}
                totalCost={paymentDetails.total}
                onConfirm={handlePaymentConfirm}
                onCancel={() => setGameState('intro')}
                isProcessing={isProcessing}
            />
        );
    }

    if (gameState === 'intro') {
        const today = new Date().toISOString().split('T')[0];
        const lastPlayed = localStorage.getItem('lastDailyChallengePlayed');
        const hasPlayed = lastPlayed === today;

        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
                <div className="text-center space-y-4">
                    <h2 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gold to-orange-500">
                        Daily Challenge
                    </h2>
                    <p className="text-xl text-text-muted">
                        Compete against everyone on the same text. One chance only.
                    </p>
                </div>

                <div className="glass p-8 rounded-modern-lg border border-gold/20">
                    <div className="grid grid-cols-3 gap-4 text-center mb-8">
                        <div>
                            <div className="text-sm text-text-muted">Difficulty</div>
                            <div className="text-xl font-bold capitalize">{challengeData.difficulty}</div>
                        </div>
                        <div>
                            <div className="text-sm text-text-muted">Time Limit</div>
                            <div className="text-xl font-bold">{challengeData.timeLimit}s</div>
                        </div>
                        <div>
                            <div className="text-sm text-text-muted">Word Count</div>
                            <div className="text-xl font-bold">{challengeData.wordCount}</div>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        {hasPlayed ? (
                            <div className="text-center space-y-4">
                                <div className="text-2xl font-bold text-success">You've already played today!</div>
                                <div className="text-text-muted">Come back tomorrow for a new challenge.</div>
                                <button onClick={() => navigate('/')} className="glass px-8 py-3 rounded-modern">
                                    Back to Menu
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleStart}
                                className="px-12 py-4 bg-gold text-black font-bold text-xl rounded-modern hover:scale-105 transition-transform shadow-glow-gold"
                            >
                                Start Challenge
                            </button>
                        )}
                    </div>
                </div>

                {/* Leaderboard Preview */}
                <div className="glass p-6 rounded-modern-lg">
                    <h3 className="text-xl font-bold mb-4">Today's Top Players</h3>
                    <div className="space-y-2">
                        {challengeData.leaderboard?.map((entry, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="text-gold font-bold">#{i + 1}</span>
                                    <span className="font-mono text-sm">{entry.address}</span>
                                </div>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-primary">{entry.wpm} WPM</span>
                                    <span className="text-success">{entry.accuracy}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === 'results') {
        return (
            <div className="max-w-3xl mx-auto text-center space-y-8 animate-fadeIn">
                <div className="glass rounded-modern-lg p-8 border-2 border-gold shadow-glow-gold">
                    <h2 className="text-5xl font-bold mb-6 text-gold">Challenge Complete!</h2>
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <div className="text-sm text-text-muted">WPM</div>
                            <div className="text-4xl font-bold text-primary">{lastStats?.wpm}</div>
                        </div>
                        <div>
                            <div className="text-sm text-text-muted">Accuracy</div>
                            <div className="text-4xl font-bold text-success">{lastStats?.accuracy}%</div>
                        </div>
                    </div>
                    <button onClick={() => navigate('/')} className="glass px-8 py-3 rounded-modern">
                        Back to Menu
                    </button>
                </div>
            </div>
        );
    }

    return (
        <GameArea
            mode="dailyChallenge"
            config={{
                timeLimit: challengeData.timeLimit,
                words: challengeData.words, // Pass words directly if GameArea supports it, or handle in logic
                date: challengeData.date
            }}
            onComplete={handleComplete}
            onQuit={() => navigate('/')}
        />
    );
}
