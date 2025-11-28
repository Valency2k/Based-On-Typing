import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { Header } from './components/Header';
import { GameModeCard } from './components/GameModeCard';
import { GameArea } from './components/GameArea';
import { Leaderboard } from './components/Leaderboard';
import { Achievements } from './components/Achievements';
import { PaymentModal } from './components/PaymentModal';
import { WalletProvider, useWallet } from './context/WalletContext';
import { StatsProvider, useStats } from './context/StatsContext';
import { paymentUtils } from './utils/paymentLogic';
import { Toaster, toast } from 'react-hot-toast';
import { api } from './services/api';

import DailyChallengePage from './pages/DailyChallengePage';
import AIParagraphPage from './pages/AIParagraphPage';
import { ResetModal } from './components/ResetModal';

const MenuPage = () => {
  const { fee, isConnected, connectWallet, account } = useWallet();
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [mintedAchievements, setMintedAchievements] = useState([]);
  const [practiceDisabled, setPracticeDisabled] = useState(false);
  const [practiceCooldownLeft, setPracticeCooldownLeft] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkPracticeStatus = () => {
      const attempts = parseInt(localStorage.getItem('practiceAttempts') || '0');
      const cooldownStart = parseInt(localStorage.getItem('practiceCooldownStart') || '0');
      const now = Date.now();
      const COOLDOWN = 15 * 60 * 60 * 1000; // 15 hours

      if (attempts >= 2) {
        if (now - cooldownStart > COOLDOWN) {
          // Reset
          localStorage.setItem('practiceAttempts', '0');
          localStorage.removeItem('practiceCooldownStart');
          setPracticeDisabled(false);
          setPracticeCooldownLeft('');
        } else {
          setPracticeDisabled(true);
          const remaining = COOLDOWN - (now - cooldownStart);
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          setPracticeCooldownLeft(`${hours}h ${minutes}m`);
        }
      } else {
        setPracticeDisabled(false);
        setPracticeCooldownLeft('');
      }
    };

    checkPracticeStatus();
    const interval = setInterval(checkPracticeStatus, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (account) {
        const data = await api.fetchAchievements(account);
        if (data.success) {
          setUnlockedAchievements(data.unlocked);
          setMintedAchievements(data.minted);
        }
      } else {
        setUnlockedAchievements([]);
        setMintedAchievements([]);
      }
    };

    fetchAchievements();
  }, [account]);

  const handleStartGame = (mode) => {
    navigate(`/game/${mode}`);
  };

  return (
    <div className="space-y-8 md:space-y-16 animate-fadeIn">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple to-gold animate-fadeIn">
          Master Your Typing
        </h2>
        <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto px-4">
          Dive into exciting typing battles on Base! Lock in your score on-chain and compete your way to the top of the leaderboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <GameModeCard mode="timeLimit" icon="⏱️" title="Time Limit" description="Race against the clock! 60s." onSelect={() => handleStartGame('timeLimit')} />
        <GameModeCard mode="wordCount" icon="📝" title="Word Count" description="Speed run! 50 words." onSelect={() => handleStartGame('wordCount')} />
        <GameModeCard mode="survival" icon="🔥" title="Survival" description="Don't make mistakes!" onSelect={() => handleStartGame('survival')} />
        <GameModeCard mode="dailyChallenge" icon="🏆" title="Daily Challenge" description="One chance per day." onSelect={() => navigate('/daily-challenge')} />
        <GameModeCard mode="paragraph" icon="🤖" title="AI Paragraph" description="Type AI-generated text." onSelect={() => navigate('/ai-paragraph')} />
        <GameModeCard
          mode="practice"
          icon="🎮"
          title="Practice Mode"
          description={practiceDisabled ? `Cooldown active (${practiceCooldownLeft} left)` : "Free training. (Limit: 2/day)"}
          onSelect={() => handleStartGame('practice')}
          disabled={practiceDisabled}
        />
      </div>

      <Achievements unlocked={unlockedAchievements} minted={mintedAchievements} account={account} />
      <Leaderboard />
    </div>
  );
};

const GamePage = () => {
  const { mode } = useLocation().pathname.split('/').pop();
  const location = useLocation();
  const currentMode = location.pathname.split('/').pop();
  const navigate = useNavigate();

  const { isConnected, connectWallet, contract, fee, feeWei, provider, account } = useWallet();
  const [gameState, setGameState] = useState('init'); // init, payment, playing, results
  const [config, setConfig] = useState({});
  const [lastStats, setLastStats] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // Payment State
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({ gasFee: '0', total: '0' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Set initial config defaults but don't start payment yet
    if (currentMode === 'timeLimit') setConfig({ timeLimit: 60 });
    if (currentMode === 'wordCount') setConfig({ wordCount: 50 });
    if (currentMode === 'survival') setConfig({ survivalLevel: 1 });
    if (currentMode === 'practice') setConfig({ timeLimit: 60 });

    // Determine starting state
    if (['timeLimit', 'wordCount', 'practice'].includes(currentMode)) {
      setGameState('setup');
    } else if (currentMode === 'survival' || currentMode === 'dailyChallenge' || currentMode === 'paragraph') {
      // These modes have fixed config or handle it differently
      if (currentMode !== 'practice') {
        setGameState('payment');
        preparePayment();
      } else {
        setGameState('playing');
      }
    }
  }, [currentMode]);

  const preparePayment = async () => {
    if (!provider) {
      setPaymentDetails({
        gasFee: '---',
        total: fee,
        adjustedGasPrice: null
      });
      setShowPayment(true);
      return;
    }

    try {
      const gasPrice = await paymentUtils.getGasPrice(provider);
      const gameFeeEth = feeWei || ethers.utils.parseEther(fee || '0.000067');
      const { adjustedGasPrice, total } = paymentUtils.calculateTotalCost(gameFeeEth, gasPrice);

      setPaymentDetails({
        gasFee: ethers.utils.formatEther(adjustedGasPrice.mul(200000)), // Est gas limit
        total: ethers.utils.formatEther(total),
        adjustedGasPrice
      });
      setShowPayment(true);
    } catch (err) {
      console.error("Payment prep failed:", err);
      setPaymentDetails({
        gasFee: '?',
        total: fee,
        adjustedGasPrice: null
      });
      setShowPayment(true);
    }
  };

  const handleSetupContinue = () => {
    if (currentMode === 'practice') {
      setGameState('playing');
    } else {
      setGameState('payment');
      preparePayment();
    }
  };

  const handlePaymentConfirm = async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }

    setIsProcessing(true);
    try {
      if (contract) {
        let tx;
        console.log("Starting payment transaction for mode:", currentMode, "Config:", config);

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

        // Determine which function to call
        if (currentMode === 'timeLimit') {
          const wordSetHash = ethers.utils.id("default");
          tx = await contract.startTimeLimitMode(config.timeLimit, wordSetHash, {
            value: finalFee,
            gasPrice: paymentDetails.adjustedGasPrice,
            gasLimit: 500000
          });
        } else if (currentMode === 'wordCount') {
          const wordSetHash = ethers.utils.id("default");
          tx = await contract.startWordCountMode(config.wordCount, wordSetHash, {
            value: finalFee,
            gasPrice: paymentDetails.adjustedGasPrice,
            gasLimit: 500000
          });
        } else if (currentMode === 'survival') {
          const wordSetHash = ethers.utils.id("default");
          tx = await contract.startSurvivalMode(wordSetHash, {
            value: finalFee,
            gasPrice: paymentDetails.adjustedGasPrice,
            gasLimit: 500000
          });
        }

        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Transaction confirmed:", receipt);

        // Find GameStarted event
        const event = receipt.events?.find(e => e.event === 'GameStarted');
        if (event) {
          console.log("GameStarted event found, Session ID:", event.args.sessionId.toString());
          setSessionId(event.args.sessionId);
        } else {
          console.error("GameStarted event NOT found in receipt!");
          toast.error("Warning: Game session ID not found. Score might not save.");
        }

        toast.success("Payment Successful! Starting Game...");
        setShowPayment(false);
        setGameState('playing');
      } else {
        throw new Error("Contract not initialized");
      }
    } catch (err) {
      console.error("Payment failed:", err);
      toast.error("Payment failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const { updateStats } = useStats();

  // Achievement State
  const [initialAchievements, setInitialAchievements] = useState([]);

  useEffect(() => {
    if (account) {
      api.fetchAchievements(account)
        .then(data => {
          if (data.success) setInitialAchievements(data.unlocked);
        })
        .catch(err => console.error("Failed to fetch initial achievements:", err));
    }
  }, [account]);

  const handleComplete = async (stats) => {
    setLastStats(stats);
    // Pass mode to updateStats for streak logic
    updateStats({ ...stats, mode: currentMode });
    setGameState('results');

    // Handle Practice Mode Cooldown
    if (currentMode === 'practice') {
      const attempts = parseInt(localStorage.getItem('practiceAttempts') || '0') + 1;
      localStorage.setItem('practiceAttempts', attempts.toString());

      if (attempts >= 2) {
        localStorage.setItem('practiceCooldownStart', Date.now().toString());
      }
    }

    // Call completeGame on contract
    if (contract && sessionId) {
      try {
        console.log("Submitting score for Session:", sessionId.toString());
        // 1. Get signature from backend
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
        console.log("Submission tx sent:", tx.hash);
        await tx.wait();
        toast.success("Game saved to blockchain!");

        // CHECK FOR NEW ACHIEVEMENTS
        toast.loading("Checking for achievements...", { duration: 3000 });
        setTimeout(async () => {
          try {
            const data = await api.fetchAchievements(account);
            if (data.success) {
              const newUnlocked = data.unlocked;
              const newlyEarned = newUnlocked.filter(id => !initialAchievements.includes(id));

              if (newlyEarned.length > 0) {
                const ACHIEVEMENT_NAMES = {
                  1: "First Steps",
                  2: "Speed Demon",
                  3: "Perfectionist",
                  4: "Marathon Runner",
                  5: "Survivor",
                  6: "Daily Champion"
                };

                newlyEarned.forEach(id => {
                  const name = ACHIEVEMENT_NAMES[id] || "Unknown Achievement";
                  toast.success(`🏆 Achievement Unlocked: ${name}!`, {
                    duration: 6000,
                    style: { border: '2px solid #FFD700', color: '#FFD700' }
                  });
                });
                // Update local state so we don't show it again immediately
                setInitialAchievements(newUnlocked);
              }
            }
          } catch (err) {
            console.error("Error checking new achievements:", err);
          }
        }, 4000); // Wait 4s for backend to process event

      } catch (err) {
        console.error("Failed to save game:", err);
        toast.error("Failed to save to blockchain: " + (err.reason || err.message));
      }
    } else {
      console.warn("Cannot save game: Contract or SessionId missing", { contract: !!contract, sessionId });
      if (!sessionId && currentMode !== 'practice') {
        toast.error("Error: No active session found. Did payment succeed?");
      }
    }
  };

  if (gameState === 'setup') {
    const modeTitle = currentMode === 'timeLimit' ? 'Time Limit' : currentMode === 'wordCount' ? 'Word Count' : 'Practice Mode';

    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold">{modeTitle}</h2>
          <p className="text-text-muted">Select your preferred option</p>
        </div>

        <div className="glass p-8 rounded-modern-lg space-y-8">
          {(currentMode === 'timeLimit' || currentMode === 'practice') && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[30, 60, 90, 120].map(t => (
                  <button
                    key={t}
                    onClick={() => setConfig({ ...config, timeLimit: t })}
                    className={`p-4 rounded-modern font-bold transition-all ${config.timeLimit === t
                      ? 'bg-primary text-white shadow-glow-blue scale-105'
                      : 'bg-white/5 hover:bg-white/10'
                      }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentMode === 'wordCount' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[20, 50, 100].map(w => (
                  <button
                    key={w}
                    onClick={() => setConfig({ ...config, wordCount: w })}
                    className={`p-4 rounded-modern font-bold transition-all ${config.wordCount === w
                      ? 'bg-primary text-white shadow-glow-blue scale-105'
                      : 'bg-white/5 hover:bg-white/10'
                      }`}
                  >
                    {w} Words
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSetupContinue}
            className="w-full py-4 bg-gold text-black font-bold text-xl rounded-modern hover:scale-105 transition-transform shadow-glow-gold"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'payment' && showPayment) {
    return (
      <PaymentModal
        mode={currentMode}
        fee={fee}
        gasFee={paymentDetails.gasFee}
        totalCost={paymentDetails.total}
        onConfirm={handlePaymentConfirm}
        onCancel={() => navigate('/')}
        isProcessing={isProcessing}
      />
    );
  }

  if (gameState === 'results') {
    return (
      <div className="max-w-3xl mx-auto text-center space-y-8 animate-fadeIn">
        <div className="glass rounded-modern-lg p-8 border-2 border-primary shadow-glow-blue">
          <h2 className="text-5xl font-bold mb-6">Game Complete!</h2>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>WPM: {lastStats?.wpm}</div>
            <div>Accuracy: {lastStats?.accuracy}%</div>
          </div>
          <button onClick={() => navigate('/')} className="glass px-8 py-3 rounded-modern">Back to Menu</button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <GameArea
        mode={currentMode}
        config={config}
        onComplete={handleComplete}
        onQuit={() => navigate('/')}
      />
    );
  }

  return <div className="text-center py-20">Loading...</div>;
};

function AppLayout() {
  const { account, connectWallet, isConnected, disconnectWallet } = useWallet();
  const { quickStats } = useStats();
  const [resetQueue, setResetQueue] = useState([]);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const lastShown = localStorage.getItem('lastResetModalShown');

      if (lastShown !== today) {
        // Determine if it's Monday (Day 1)
        const isMonday = now.getUTCDay() === 1;
        // On Mondays, show Daily first, then Weekly. On other days, just Daily.
        setResetQueue(isMonday ? ['daily', 'weekly'] : ['daily']);
        localStorage.setItem('lastResetModalShown', today);
      }
    };

    // Check immediately on mount, and then every minute
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-text font-sans selection:bg-primary/30">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
      }} />

      {resetQueue.length > 0 && (
        <ResetModal
          type={resetQueue[0]}
          onClose={() => setResetQueue(prev => prev.slice(1))}
        />
      )}

      <Header
        account={account}
        connectWallet={connectWallet}
        isConnected={isConnected}
        quickStats={quickStats}
        onDisconnect={disconnectWallet}
      />

      <main className="container mx-auto px-4 py-6 md:py-12">
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/game/:mode" element={<GamePage />} />
          <Route path="/daily-challenge" element={<DailyChallengePage />} />
          <Route path="/ai-paragraph" element={<AIParagraphPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <StatsProvider>
        <Router>
          <AppLayout />
        </Router>
      </StatsProvider>
    </WalletProvider>
  );
}
