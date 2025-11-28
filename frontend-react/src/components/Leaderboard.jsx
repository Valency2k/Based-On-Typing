import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';

export function Leaderboard() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('all'); // 'all' or 'weekly'
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const ITEMS_PER_PAGE = 10;

    const fetchLeaderboard = async () => {
        if (isSearching) return; // Don't auto-refresh if searching
        try {
            const offset = page * ITEMS_PER_PAGE;
            const data = await api.fetchLeaderboard('global', period, ITEMS_PER_PAGE, offset);
            if (data.success && Array.isArray(data.entries)) {
                setLeaders(data.entries);
                setTotal(data.total || 0);
            }
        } catch (err) {
            console.error("Failed to fetch leaderboard", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
        const interval = setInterval(fetchLeaderboard, 30000);
        return () => clearInterval(interval);
    }, [period, isSearching, page]);

    // Reset page when period changes
    useEffect(() => {
        setPage(0);
    }, [period]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        // Basic address validation
        if (!searchQuery.startsWith('0x') || searchQuery.length !== 42) {
            toast.error("Please enter a valid wallet address");
            return;
        }

        setLoading(true);
        setIsSearching(true);
        try {
            const data = await api.fetchPlayerScores(searchQuery.trim());
            if (data.success) {
                setLeaders(data.entries);
                setTotal(data.entries.length);
                if (data.entries.length === 0) {
                    toast.error("No scores found for this address");
                }
            } else {
                setLeaders([]);
                setTotal(0);
                toast.error("Failed to fetch player scores");
            }
        } catch (err) {
            console.error("Search failed", err);
            toast.error("Search failed");
        } finally {
            setLoading(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setIsSearching(false);
        setPage(0);
        setLoading(true);
    };

    const handleNextPage = () => {
        if ((page + 1) * ITEMS_PER_PAGE < total) {
            setPage(p => p + 1);
            setLoading(true);
        }
    };

    const handlePrevPage = () => {
        if (page > 0) {
            setPage(p => p - 1);
            setLoading(true);
        }
    };

    const MODE_LABELS = {
        0: 'Time Limit',
        1: 'Word Count',
        2: 'Survival',
        3: 'Daily Challenge',
        4: 'AI Paragraph'
    };

    return (
        <div className="glass rounded-modern-lg p-8 border border-white/5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                    <span>🏆</span> {isSearching ? 'Player Results' : 'Global Leaderboard'}
                </h3>

                <div className="flex flex-col md:flex-row items-end gap-4 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Search Wallet (0x...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm w-full md:w-64 focus:outline-none focus:border-primary"
                        />
                        {isSearching ? (
                            <button
                                onClick={clearSearch}
                                className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors"
                            >
                                Clear
                            </button>
                        ) : (
                            <button
                                onClick={handleSearch}
                                className="px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg text-sm font-medium transition-colors"
                            >
                                Search
                            </button>
                        )}
                    </div>

                    {!isSearching && (
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex bg-black/40 p-1 rounded-lg">
                                <button
                                    onClick={() => setPeriod('weekly')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${period === 'weekly'
                                        ? 'bg-primary text-black shadow-lg'
                                        : 'text-text-muted hover:text-white'
                                        }`}
                                >
                                    Weekly
                                </button>
                                <button
                                    onClick={() => setPeriod('all')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${period === 'all'
                                        ? 'bg-primary text-black shadow-lg'
                                        : 'text-text-muted hover:text-white'
                                        }`}
                                >
                                    All Time
                                </button>
                            </div>
                            {period === 'weekly' && (
                                <span className="text-xs text-text-muted flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                    Resets Monday 00:00 UTC
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {leaders.length > 0 ? leaders.map((entry, i) => (
                        <div key={i} className="grid grid-cols-12 items-center gap-4 p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
                            {/* Rank & Address */}
                            <div className="col-span-4 flex items-center gap-4">
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0
                                    ${!isSearching && (page * ITEMS_PER_PAGE + i) === 0 ? 'bg-yellow-500 text-black shadow-glow-gold' : !isSearching && (page * ITEMS_PER_PAGE + i) === 1 ? 'bg-slate-400 text-black' : !isSearching && (page * ITEMS_PER_PAGE + i) === 2 ? 'bg-orange-600 text-white' : 'bg-white/10'}
                                `}>
                                    {page * ITEMS_PER_PAGE + i + 1}
                                </div>
                                <span className="font-mono text-sm opacity-80 truncate">
                                    {entry.playerAddress ? `${entry.playerAddress.slice(0, 6)}...${entry.playerAddress.slice(-4)}` : 'Unknown'}
                                </span>
                            </div>

                            {/* Game Mode - Centered */}
                            <div className="col-span-4 text-center">
                                <span className="px-3 py-1 rounded-full bg-white/5 text-xs md:text-sm font-medium text-primary border border-white/5">
                                    {MODE_LABELS[entry.mode] || 'Unknown'}
                                </span>
                            </div>

                            {/* Stats */}
                            <div className="col-span-4 flex justify-end gap-6 text-sm">
                                <div className="flex flex-col items-end">
                                    <span className="text-text-muted text-xs">WPM</span>
                                    <span className="font-bold text-primary">{entry.wpm}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-text-muted text-xs">ACC</span>
                                    <span className="font-bold text-success">{entry.accuracyPercent}%</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-text-muted">
                            {isSearching ? "No scores found for this wallet." : "No scores yet. Be the first!"}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {!isSearching && total > ITEMS_PER_PAGE && (
                        <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-white/5">
                            <button
                                onClick={handlePrevPage}
                                disabled={page === 0}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded-lg text-sm transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-text-muted">
                                Page {page + 1} of {Math.ceil(total / ITEMS_PER_PAGE)}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={(page + 1) * ITEMS_PER_PAGE >= total}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded-lg text-sm transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
