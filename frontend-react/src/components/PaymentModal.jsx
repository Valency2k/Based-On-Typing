import React from 'react';


export function PaymentModal({ fee, gasFee, totalCost, onConfirm, onCancel, isProcessing }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div
                className="glass p-8 rounded-modern-lg max-w-md w-full border border-primary/30 shadow-glow-blue"
            >
                <h3 className="text-2xl font-bold mb-6 text-center">Confirm Game Entry</h3>

                <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-text-muted">
                        <span>Game Fee</span>
                        <span>{fee} ETH</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                        <span>Gas Fee (Est.)</span>
                        <span>{gasFee} ETH</span>
                    </div>
                    <div className="flex justify-between text-text-muted text-sm pl-4">
                        <span>↳ Dev Fee (25%)</span>
                        <span>Included</span>
                    </div>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex justify-between text-xl font-bold text-primary">
                        <span>Total</span>
                        <span>{totalCost} ETH</span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="flex-1 glass py-3 rounded-modern hover:bg-white/10 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="flex-1 bg-primary text-white py-3 rounded-modern font-bold shadow-glow-blue hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <span className="animate-spin">⚡</span> Processing...
                            </>
                        ) : (
                            <>
                                <span>⚡</span> Pay & Play
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
