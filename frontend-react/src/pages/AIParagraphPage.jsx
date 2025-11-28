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

export default function AIParagraphPage() {
    const navigate = useNavigate();
    const { isConnected, connectWallet, contract, fee, feeWei, provider, account } = useWallet();
    const { updateStats } = useStats();

    // State
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [gameState, setGameState] = useState('intro'); // intro, payment, playing, results
    const [lastStats, setLastStats] = useState(null);
    const [sessionId, setSessionId] = useState(null);

    // Payment State
    const [paymentDetails, setPaymentDetails] = useState({ gasFee: '0', total: '0', adjustedGasPrice: null });
    const [isProcessing, setIsProcessing] = useState(false);

    // Initial Load
    useEffect(() => {
        loadParagraph();
    }, []);

    const loadParagraph = async () => {
        setLoading(true);
        try {
            // Check local storage first
            const savedText = localStorage.getItem('aiModeText');
            if (savedText) {
                setText(savedText);
            } else {
                const newText = await api.fetchAIText();
                if (newText) {
                    setText(newText);
                    localStorage.setItem('aiModeText', newText);
                } else {
                    throw new Error("No text received from API");
                }
            }
        } catch (err) {
            console.error("Failed to load paragraph:", err);
            toast.error("Failed to load paragraph. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const [timeLimit, setTimeLimit] = useState(60);

    const handleStartClick = async () => {
        if (!isConnected) {
            connectWallet();
            return;
        }

        // Calculate fees
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
            console.error("Fee calculation error:", err);
            toast.error("Could not calculate fees. Check connection.");
        }
    };

    const handlePaymentConfirm = async () => {
        setIsProcessing(true);
        try {
            if (!contract) throw new Error("Contract not initialized");

            // Generate a dummy hash for the paragraph since we don't strictly validate it on-chain yet
            const paragraphHash = ethers.utils.id(text || "default");

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

            const tx = await contract.startParagraphMode(timeLimit, paragraphHash, {
                value: finalFee,
                gasPrice: paymentDetails.adjustedGasPrice,
                gasLimit: 500000
            });

            const receipt = await tx.wait();
            const event = receipt.events?.find(e => e.event === 'GameStarted');
            if (event) {
                setSessionId(event.args.sessionId);
            }

            toast.success("Payment Successful!");
            setGameState('playing');
        } catch (err) {
            console.error("Payment failed:", err);
            toast.error("Payment failed: " + (err.reason || err.message));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGameComplete = async (stats) => {
        setLastStats(stats);
        updateStats(stats);
        setGameState('results');
        localStorage.removeItem('aiModeText'); // Clear used text

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
                    stats.wpm,
                    signature
                );
                await tx.wait();
                toast.success("Score saved to blockchain!");
            } catch (err) {
                console.error("Save score failed:", err);
                toast.error("Failed to save score to blockchain");
            }
        }
    };

    const handleNextParagraph = async () => {
        setGameState('intro');
        setLastStats(null);
        localStorage.removeItem('aiModeText');
        await loadParagraph();
    };

    if (loading) {
        return <div className="text-center py-20">Loading AI Paragraph...</div>;
    }

    if (gameState === 'intro') {
        return (
            <div className="max-w-4xl mx-auto text-center space-y-8 animate-fadeIn">
                <h2 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple">
                    AI Paragraph Mode
                </h2>
                <div className="glass p-8 rounded-modern-lg border border-primary/20">
                    <div className="mb-8 p-6 bg-black/20 rounded-lg text-left font-mono text-lg opacity-80 h-48 overflow-y-auto">
                        {text ? text : "No text loaded."}
                    </div>

                    <div className="mb-8">
                        <h3 className="text-xl text-text-muted mb-4">Select Time Limit</h3>
                        <div className="flex justify-center gap-4">
                            {[30, 45, 60, 120, 180].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTimeLimit(t)}
                                    className={`px-4 py-2 rounded-modern transition-all ${timeLimit === t
                                        ? 'bg-primary text-white shadow-glow-blue'
                                        : 'glass text-text-muted hover:text-text'
                                        }`}
                                >
                                    {t < 60 ? `${t}s` : `${t / 60}m`}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleStartClick}
                        className="px-12 py-4 bg-primary text-white font-bold text-xl rounded-modern hover:scale-105 transition-transform shadow-glow-blue"
                    >
                        Start Game
                    </button>
                </div>
            </div>
        );
    }

    if (gameState === 'payment') {
        return (
            <PaymentModal
                mode="paragraph"
                fee={fee}
                gasFee={paymentDetails.gasFee}
                totalCost={paymentDetails.total}
                onConfirm={handlePaymentConfirm}
                onCancel={() => setGameState('intro')}
                isProcessing={isProcessing}
            />
        );
    }

    if (gameState === 'playing') {
        return (
            <GameArea
                mode="paragraph"
                config={{ paragraphText: text, timeLimit: timeLimit }}
                onComplete={handleGameComplete}
                onQuit={() => navigate('/')}
            />
        );
    }

    if (gameState === 'results') {
        return (
            <div className="max-w-3xl mx-auto text-center space-y-8 animate-fadeIn">
                <div className="glass rounded-modern-lg p-8 border-2 border-primary shadow-glow-blue">
                    <h2 className="text-5xl font-bold mb-6">Paragraph Complete!</h2>
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
                    <div className="flex justify-center gap-4">
                        <button onClick={() => navigate('/')} className="glass px-8 py-3 rounded-modern">
                            Back to Menu
                        </button>
                        <button onClick={handleNextParagraph} className="px-8 py-3 bg-primary text-white rounded-modern shadow-glow-blue">
                            Next Paragraph
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
