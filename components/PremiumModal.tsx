import React from 'react';
import { X, Crown, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    remainingDownloads: number;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, remainingDownloads }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header with Gradient */}
                <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50"></div>

                    <div className="relative">
                        <div className="inline-block p-4 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
                            <Crown className="w-12 h-12 text-yellow-300" />
                        </div>
                        <h2 className="font-display text-3xl font-bold text-white mb-2">Upgrade to Premium</h2>
                        <p className="text-purple-100">Unlock unlimited prints & downloads</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    {remainingDownloads > 0 ? (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                            <p className="text-sm text-yellow-800 text-center font-bold">
                                ⚠️ You have <span className="text-yellow-900">{remainingDownloads}</span> free {remainingDownloads === 1 ? 'download' : 'downloads'} remaining
                            </p>
                        </div>
                    ) : (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                            <p className="text-sm text-red-800 text-center font-bold">
                                ❌ You've used all your free downloads
                            </p>
                        </div>
                    )}

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <span className="text-sm font-bold text-gray-700">Unlimited prints & downloads</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <span className="text-sm font-bold text-gray-700">Priority support</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <span className="text-sm font-bold text-gray-700">Early access to new features</span>
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        className="w-full h-12 gap-2 shadow-lg shadow-purple-100"
                        onClick={() => window.open('https://billing.stripe.com/p/login/your-link-here', '_blank')}
                    >
                        <Crown className="w-5 h-5" />
                        Upgrade Now
                    </Button>

                    <button
                        onClick={onClose}
                        className="w-full mt-3 py-3 text-gray-500 hover:text-gray-700 font-bold text-sm transition-colors"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};
