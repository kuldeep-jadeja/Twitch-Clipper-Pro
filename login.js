// import { useState } from 'react';
// import { useRouter } from 'next/router';

// export default function Login() {
//     const router = useRouter();
//     const { next = '/' } = router.query; // fallback to homepage
//     const [isLoading, setIsLoading] = useState(false);

//     const handleLogin = () => {
//         setIsLoading(true);
//         const params = new URLSearchParams({
//             client_id: process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
//             redirect_uri: process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI,
//             response_type: 'code',
//             scope: 'clips:edit user:read:email',
//             state: next, // use state to track post-login redirect
//         });

//         window.location.href = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
//     };

//     return (
//         <div style={{ textAlign: 'center', paddingTop: 100 }}>
//             <h1>TwitchRadar 🎯</h1>
//             <button
//                 onClick={handleLogin}
//                 disabled={isLoading}
//             >
//                 {isLoading ? 'Redirecting...' : 'Login with Twitch'}
//             </button>
//         </div>
//     );
// }
import { useState } from "react"
import { useRouter } from "next/router"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Gamepad2, Zap, Users, TrendingUp, Sparkles } from "lucide-react"

export default function Login() {
    const router = useRouter()
    const { next = "/" } = router.query
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = () => {
        setIsLoading(true)
        const params = new URLSearchParams({
            client_id: process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
            redirect_uri: process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI,
            response_type: "code",
            scope: "clips:edit user:read:email",
            state: next,
        })
        window.location.href = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0">
                <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>

            {/* Floating Gaming Icons */}
            <div className="absolute inset-0 pointer-events-none">
                <Gamepad2 className="absolute top-1/4 left-1/4 w-8 h-8 text-purple-400/30 animate-bounce delay-300" />
                <Zap className="absolute top-1/3 right-1/4 w-6 h-6 text-blue-400/30 animate-bounce delay-700" />
                <Users className="absolute bottom-1/3 left-1/3 w-7 h-7 text-indigo-400/30 animate-bounce delay-1000" />
                <TrendingUp className="absolute bottom-1/4 right-1/3 w-6 h-6 text-purple-400/30 animate-bounce delay-500" />
                <Sparkles className="absolute top-1/2 right-1/6 w-5 h-5 text-blue-400/30 animate-bounce delay-200" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-purple-500/30 shadow-2xl">
                    <CardContent className="p-8">
                        {/* Logo Section */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-4 shadow-lg">
                                <span className="text-3xl">🎯</span>
                            </div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
                                TwitchRadar
                            </h1>
                            <p className="text-gray-400 text-sm">Discover, analyze, and dominate the streaming world</p>
                        </div>

                        {/* Features Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                                <Gamepad2 className="w-5 h-5 text-purple-400 mb-1" />
                                <p className="text-xs text-gray-300">Gaming Analytics</p>
                            </div>
                            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                <TrendingUp className="w-5 h-5 text-blue-400 mb-1" />
                                <p className="text-xs text-gray-300">Trend Tracking</p>
                            </div>
                            <div className="bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20">
                                <Users className="w-5 h-5 text-indigo-400 mb-1" />
                                <p className="text-xs text-gray-300">Community Insights</p>
                            </div>
                            <div className="bg-pink-500/10 rounded-lg p-3 border border-pink-500/20">
                                <Zap className="w-5 h-5 text-pink-400 mb-1" />
                                <p className="text-xs text-gray-300">Real-time Data</p>
                            </div>
                        </div>

                        {/* Login Button */}
                        <Button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? (
                                <div className="flex items-center space-x-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Connecting to Twitch...</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                                    </svg>
                                    <span>Continue with Twitch</span>
                                </div>
                            )}
                        </Button>

                        {/* Footer */}
                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-500">Secure OAuth 2.0 authentication powered by Twitch</p>
                            <div className="flex justify-center space-x-1 mt-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-100"></div>
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-200"></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Animated Border Effect */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse delay-1000"></div>
                <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-indigo-500 to-transparent animate-pulse delay-500"></div>
                <div className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-pink-500 to-transparent animate-pulse delay-1500"></div>
            </div>
        </div>
    )
}
