"use client";

import { useRouter } from "next/router";
import StreamerCard from "../components/StreamerCard";
import ViewerChart from "../components/ViewerChart";
import { startChatMonitor, stopChatMonitor } from "../utils/chatMonitor";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();

  const [token, setToken] = useState('');

  useEffect(() => {
    fetch('/api/token')
      .then(res => res.json())
      .then(data => {
        if (data.token) setToken(data.token);
        else router.push('/login');
      });
  }, [router]);

  const [streams, setStreams] = useState([]);
  const [selectedStreamer, setSelectedStreamer] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("viewers");
  const [clipWorthyOnly, setClipWorthyOnly] = useState(false);
  const [selectedGame, setSelectedGame] = useState("All Games");

  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const games = ["All Games", ...new Set(streams.map((s) => s.game))];

  const handleStreamerClick = async (streamer) => {
    setSelectedStreamer(streamer);
    setHistoryLoading(true);
    setSelectedHistory([]);

    try {
      const res = await fetch(`/api/streamer-history?name=${encodeURIComponent(streamer.name)}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setSelectedHistory(data);
    } catch (err) {
      console.error("Error fetching history:", err);
      setSelectedHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const [isMonitoring, setIsMonitoring] = useState(false);

  const ManualClip = async (streamerName) => {
    try {
      const res = await fetch('/api/token'); // This checks if token cookie exists
      if (res.status === 200) {
        // ✅ Already logged in
        window.location.href = `/clipper?streamer=${encodeURIComponent(streamerName)}`;
      } else {
        // 🔒 Not logged in → go to login and redirect back
        const next = `/clipper?streamer=${encodeURIComponent(streamerName)}`;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      }
    } catch (err) {
      console.error('Clip access check failed:', err);
      alert('Something went wrong. Try again.');
    }
  };

  const handleClipClick = async (streamerName) => {
    try {
      // Step 1: Check token
      const tokenRes = await fetch('/api/token');
      if (!tokenRes.ok) {
        const next = `/clipper?streamer=${encodeURIComponent(streamerName)}`;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }

      const { token } = await tokenRes.json();

      // Step 2: Get broadcaster ID
      const idRes = await fetch(`/api/user-id?username=${streamerName}&token=${token}`);
      const { id: broadcasterId } = await idRes.json();

      if (!broadcasterId) {
        alert('Failed to get broadcaster ID');
        return;
      }

      // Step 3: Start monitor (auto clipper)
      startChatMonitor(streamerName, token, broadcasterId, async () => {
        const res = await fetch('/api/create-clip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            broadcasterId,
            streamerName,
          }),
        });

        const data = await res.json();
        if (data.url) {
          alert(`🎉 Clip created for ${streamerName}: ${data.url}`);
        } else {
          console.error('Clip failed:', data);
        }
      });

      alert(`🚀 Chat monitor started for ${streamerName}`);

    } catch (err) {
      console.error("Clip monitor failed:", err);
      alert("Error starting monitor.");
    }
  };


  const closeModal = () => {
    setSelectedStreamer(null);
    setSelectedHistory([]);
    setHistoryLoading(false);
  };

  const handleGlobalSearch = async () => {
    if (!searchTerm || searchTerm.length < 2) return;

    setLookupLoading(true);
    setLookupResult(null);
    setLookupError(null);

    try {
      const res = await fetch(`/api/lookup?name=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error("Streamer not found");
      const data = await res.json();
      setLookupResult(data);
    } catch (err) {
      setLookupError("Streamer not found or Twitch API error.");
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setError(null);
        const res = await fetch("/api/streams");
        if (!res.ok) throw new Error("Failed to fetch streams");
        const data = await res.json();
        setStreams(data);
      } catch (err) {
        console.error("Error fetching streams:", err);
        setError("Failed to load streams. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
    const interval = setInterval(fetchStreams, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredAndSortedStreams = streams
    .filter((stream) => {
      const matchesSearch =
        stream.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stream.game.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGame = selectedGame === "All Games" || stream.game === selectedGame;
      const isClipWorthy = !clipWorthyOnly || Number(stream.clip_score) >= 1;

      return matchesSearch && matchesGame && isClipWorthy;
    })
    .sort((a, b) => {
      if (clipWorthyOnly) return Number(b.clip_score) - Number(a.clip_score);
      switch (sortBy) {
        case "viewers": return b.viewers - a.viewers;
        case "name": return a.name.localeCompare(b.name);
        case "game": return a.game.localeCompare(b.game);
        default: return 0;
      }
    });

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-8">

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search streamers or games..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Filter */}
          <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            {games.map((game) => <option key={game}>{game}</option>)}
          </select>

          {/* Clip-worthy toggle */}
          <button onClick={() => setClipWorthyOnly(!clipWorthyOnly)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${clipWorthyOnly ? "bg-purple-600" : "bg-gray-300 dark:bg-gray-600"}`}>
            <span className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${clipWorthyOnly ? "translate-x-6" : "translate-x-1"}`} />
          </button>

          {/* Sort */}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option value="viewers">Viewers</option>
            <option value="name">Name</option>
            <option value="game">Game</option>
          </select>
        </div>

        {/* 🔍 Global Lookup */}
        {filteredAndSortedStreams.length === 0 && (
          <div className="mt-4">
            <button onClick={handleGlobalSearch}
              className="text-sm text-purple-600 underline hover:text-purple-700">
              Can’t find the streamer? Try global search →
            </button>
          </div>
        )}

        {/* Global Lookup Result */}
        {lookupLoading && <p className="text-sm text-gray-500 mt-4">Looking up streamer...</p>}
        {lookupError && <p className="text-sm text-red-500 mt-4">{lookupError}</p>}
        {lookupResult && (
          <div className="mt-6 p-4 border rounded-lg bg-white dark:bg-gray-800">
            <div className="flex items-center gap-4">
              <img src={lookupResult.profile.profile_image_url} className="w-16 h-16 rounded-full" />
              <div>
                <h2 className="text-lg font-bold">{lookupResult.profile.display_name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{lookupResult.profile.description}</p>
              </div>
              <span className={`ml-auto text-xs px-2 py-1 rounded-full ${lookupResult.live ? "bg-green-200 text-green-800" : "bg-gray-300 text-gray-700"}`}>
                {lookupResult.live ? "LIVE" : "Offline"}
              </span>
            </div>
            {lookupResult.live && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Playing <strong>{lookupResult.stream.game_name}</strong> • {lookupResult.stream.viewer_count} viewers
                </p>
                <p className="italic mt-1">{lookupResult.stream.title}</p>
                <a href={`https://twitch.tv/${lookupResult.profile.login}`} target="_blank"
                  className="mt-3 inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                  Watch Stream
                </a>
              </div>
            )}
          </div>
        )}

        {/* Streamers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {filteredAndSortedStreams.map((stream, i) => (
            <StreamerCard key={i} {...stream} onClick={() => handleStreamerClick(stream)} />
          ))}
        </div>

        {/* Modal with ViewerChart */}
        {selectedStreamer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="flex justify-between mb-4">
                <h2 className="text-lg font-bold">
                  {selectedStreamer.name} – {selectedStreamer.viewers} viewers
                </h2>
                <button onClick={closeModal}>✖</button>
              </div>

              {historyLoading ? (
                <p>Loading history...</p>
              ) : (
                <>
                  <>
                    <ViewerChart data={selectedHistory} />

                    <div className="mt-4 flex justify-end gap-4">
                      <div className="text-right">
                        <button
                          onClick={() => ManualClip(selectedStreamer.name)}
                          className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          🎬 Clip This Stream
                        </button>
                      </div>
                      <button
                        onClick={async () => {
                          const tokenRes = await fetch('/api/token');
                          const { token } = await tokenRes.json();

                          const idRes = await fetch(`/api/user-id?username=${selectedStreamer.name}&token=${token}`);
                          const { id: broadcasterId } = await idRes.json();

                          if (!isMonitoring) {
                            startChatMonitor(selectedStreamer.name, token, broadcasterId, async () => {
                              await fetch('/api/create-clip', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ token, broadcasterId, streamerName: selectedStreamer.name }),
                              });
                            });
                            setIsMonitoring(true);
                          } else {
                            stopChatMonitor(selectedStreamer.name);
                            setIsMonitoring(false);
                          }
                        }}
                        className={`inline-block px-4 py-2 rounded ${isMonitoring ? "bg-red-600" : "bg-green-600"} text-white hover:opacity-90`}
                      >
                        {isMonitoring ? "🛑 Stop Monitor" : "📡 Start Monitor"}
                      </button>
                    </div>
                  </>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


// "use client"

// import { useRouter } from "next/router"
// import { useEffect, useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Badge } from "@/components/ui/badge"
// import {
//   Search,
//   Users,
//   Eye,
//   Play,
//   Square,
//   Scissors,
//   Radio,
//   Star,
//   Gamepad2,
//   Zap,
//   Globe,
//   X,
//   ChevronDown,
//   Activity,
// } from "lucide-react"
// import ViewerChart from "../components/ViewerChart"
// import { startChatMonitor, stopChatMonitor } from "../utils/chatMonitor"

// export default function Home() {
//   const router = useRouter()
//   const [token, setToken] = useState("")

//   // All your existing state variables
//   const [streams, setStreams] = useState([])
//   const [selectedStreamer, setSelectedStreamer] = useState(null)
//   const [selectedHistory, setSelectedHistory] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [historyLoading, setHistoryLoading] = useState(false)
//   const [error, setError] = useState(null)
//   const [searchTerm, setSearchTerm] = useState("")
//   const [sortBy, setSortBy] = useState("viewers")
//   const [clipWorthyOnly, setClipWorthyOnly] = useState(false)
//   const [selectedGame, setSelectedGame] = useState("All Games")
//   const [lookupResult, setLookupResult] = useState(null)
//   const [lookupLoading, setLookupLoading] = useState(false)
//   const [lookupError, setLookupError] = useState(null)
//   const [isMonitoring, setIsMonitoring] = useState(false)

//   // Your existing useEffect for token
//   useEffect(() => {
//     fetch("/api/token")
//       .then((res) => res.json())
//       .then((data) => {
//         if (data.token) setToken(data.token)
//         else router.push("/login")
//       })
//   }, [router])

//   // Your existing functions (keeping them exactly the same)
//   const games = ["All Games", ...new Set(streams.map((s) => s.game))]

//   const handleStreamerClick = async (streamer) => {
//     setSelectedStreamer(streamer)
//     setHistoryLoading(true)
//     setSelectedHistory([])
//     try {
//       const res = await fetch(`/api/streamer-history?name=${encodeURIComponent(streamer.name)}`)
//       if (!res.ok) throw new Error("Failed to fetch history")
//       const data = await res.json()
//       setSelectedHistory(data)
//     } catch (err) {
//       console.error("Error fetching history:", err)
//       setSelectedHistory([])
//     } finally {
//       setHistoryLoading(false)
//     }
//   }

//   const ManualClip = async (streamerName) => {
//     try {
//       const res = await fetch("/api/token")
//       if (res.status === 200) {
//         window.location.href = `/clipper?streamer=${encodeURIComponent(streamerName)}`
//       } else {
//         const next = `/clipper?streamer=${encodeURIComponent(streamerName)}`
//         window.location.href = `/login?next=${encodeURIComponent(next)}`
//       }
//     } catch (err) {
//       console.error("Clip access check failed:", err)
//       alert("Something went wrong. Try again.")
//     }
//   }

//   const handleClipClick = async (streamerName) => {
//     try {
//       const tokenRes = await fetch("/api/token")
//       if (!tokenRes.ok) {
//         const next = `/clipper?streamer=${encodeURIComponent(streamerName)}`
//         window.location.href = `/login?next=${encodeURIComponent(next)}`
//         return
//       }
//       const { token } = await tokenRes.json()

//       const idRes = await fetch(`/api/user-id?username=${streamerName}&token=${token}`)
//       const { id: broadcasterId } = await idRes.json()
//       if (!broadcasterId) {
//         alert("Failed to get broadcaster ID")
//         return
//       }

//       startChatMonitor(streamerName, token, broadcasterId, async () => {
//         const res = await fetch("/api/create-clip", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ token, broadcasterId, streamerName }),
//         })
//         const data = await res.json()
//         if (data.url) {
//           alert(`🎉 Clip created for ${streamerName}: ${data.url}`)
//         } else {
//           console.error("Clip failed:", data)
//         }
//       })
//       alert(`🚀 Chat monitor started for ${streamerName}`)
//     } catch (err) {
//       console.error("Clip monitor failed:", err)
//       alert("Error starting monitor.")
//     }
//   }

//   const closeModal = () => {
//     setSelectedStreamer(null)
//     setSelectedHistory([])
//     setHistoryLoading(false)
//   }

//   const handleGlobalSearch = async () => {
//     if (!searchTerm || searchTerm.length < 2) return
//     setLookupLoading(true)
//     setLookupResult(null)
//     setLookupError(null)
//     try {
//       const res = await fetch(`/api/lookup?name=${encodeURIComponent(searchTerm)}`)
//       if (!res.ok) throw new Error("Streamer not found")
//       const data = await res.json()
//       setLookupResult(data)
//     } catch (err) {
//       setLookupError("Streamer not found or Twitch API error.")
//     } finally {
//       setLookupLoading(false)
//     }
//   }

//   // Your existing useEffect for fetching streams
//   useEffect(() => {
//     const fetchStreams = async () => {
//       try {
//         setError(null)
//         const res = await fetch("/api/streams")
//         if (!res.ok) throw new Error("Failed to fetch streams")
//         const data = await res.json()
//         setStreams(data)
//       } catch (err) {
//         console.error("Error fetching streams:", err)
//         setError("Failed to load streams. Please try again.")
//       } finally {
//         setLoading(false)
//       }
//     }
//     fetchStreams()
//     const interval = setInterval(fetchStreams, 60000)
//     return () => clearInterval(interval)
//   }, [])

//   // Your existing filtering logic
//   const filteredAndSortedStreams = streams
//     .filter((stream) => {
//       const matchesSearch =
//         stream.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         stream.game.toLowerCase().includes(searchTerm.toLowerCase())
//       const matchesGame = selectedGame === "All Games" || stream.game === selectedGame
//       const isClipWorthy = !clipWorthyOnly || Number(stream.clip_score) >= 1
//       return matchesSearch && matchesGame && isClipWorthy
//     })
//     .sort((a, b) => {
//       if (clipWorthyOnly) return Number(b.clip_score) - Number(a.clip_score)
//       switch (sortBy) {
//         case "viewers":
//           return b.viewers - a.viewers
//         case "name":
//           return a.name.localeCompare(b.name)
//         case "game":
//           return a.game.localeCompare(b.game)
//         default:
//           return 0
//       }
//     })

//   // Calculate stats
//   const totalViewers = streams.reduce((sum, stream) => sum + stream.viewers, 0)
//   const clipWorthyStreams = streams.filter((s) => Number(s.clip_score) >= 1).length

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
//       {/* Animated Background */}
//       <div className="absolute inset-0">
//         <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
//         <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
//         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
//       </div>

//       {/* Header */}
//       <div className="relative z-10 border-b border-purple-500/20 bg-black/20 backdrop-blur-xl">
//         <div className="container mx-auto px-6 py-6">
//           <div className="flex items-center justify-between mb-6">
//             <div className="flex items-center space-x-4">
//               <div className="flex items-center space-x-3">
//                 <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
//                   <span className="text-2xl">🎯</span>
//                 </div>
//                 <div>
//                   <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
//                     TwitchRadar
//                   </h1>
//                   <p className="text-gray-400 text-sm">Command Center</p>
//                 </div>
//               </div>
//             </div>

//             {/* Live Stats */}
//             <div className="flex items-center space-x-6">
//               <div className="text-center">
//                 <div className="text-2xl font-bold text-white">{streams.length}</div>
//                 <div className="text-xs text-gray-400 flex items-center">
//                   <Radio className="w-3 h-3 mr-1" />
//                   Live Streams
//                 </div>
//               </div>
//               <div className="text-center">
//                 <div className="text-2xl font-bold text-purple-400">{totalViewers.toLocaleString()}</div>
//                 <div className="text-xs text-gray-400 flex items-center">
//                   <Users className="w-3 h-3 mr-1" />
//                   Total Viewers
//                 </div>
//               </div>
//               <div className="text-center">
//                 <div className="text-2xl font-bold text-blue-400">{clipWorthyStreams}</div>
//                 <div className="text-xs text-gray-400 flex items-center">
//                   <Star className="w-3 h-3 mr-1" />
//                   Clip Worthy
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Enhanced Controls */}
//           <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
//             {/* Search */}
//             <div className="lg:col-span-2">
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//                 <Input
//                   type="text"
//                   placeholder="Search streamers, games, or categories..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="pl-10 bg-black/40 border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400"
//                 />
//               </div>
//             </div>

//             {/* Game Filter */}
//             <div className="relative">
//               <select
//                 value={selectedGame}
//                 onChange={(e) => setSelectedGame(e.target.value)}
//                 className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white appearance-none focus:border-purple-400 focus:outline-none"
//               >
//                 {games.map((game) => (
//                   <option key={game} value={game} className="bg-gray-900">
//                     {game}
//                   </option>
//                 ))}
//               </select>
//               <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
//             </div>

//             {/* Sort */}
//             <div className="relative">
//               <select
//                 value={sortBy}
//                 onChange={(e) => setSortBy(e.target.value)}
//                 className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white appearance-none focus:border-purple-400 focus:outline-none"
//               >
//                 <option value="viewers" className="bg-gray-900">
//                   👥 Viewers
//                 </option>
//                 <option value="name" className="bg-gray-900">
//                   📝 Name
//                 </option>
//                 <option value="game" className="bg-gray-900">
//                   🎮 Game
//                 </option>
//               </select>
//               <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
//             </div>
//           </div>

//           {/* Clip Worthy Toggle */}
//           <div className="flex items-center justify-between mt-4">
//             <Button
//               onClick={() => setClipWorthyOnly(!clipWorthyOnly)}
//               variant={clipWorthyOnly ? "default" : "outline"}
//               className={`${clipWorthyOnly
//                   ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
//                   : "border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
//                 }`}
//             >
//               <Star className="w-4 h-4 mr-2" />
//               {clipWorthyOnly ? "Showing Clip Worthy" : "Show Clip Worthy Only"}
//             </Button>

//             {/* Global Search Button */}
//             {filteredAndSortedStreams.length === 0 && searchTerm && (
//               <Button
//                 onClick={handleGlobalSearch}
//                 disabled={lookupLoading}
//                 className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
//               >
//                 <Globe className="w-4 h-4 mr-2" />
//                 {lookupLoading ? "Searching..." : "Global Search"}
//               </Button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="relative z-10 container mx-auto px-6 py-8">
//         {/* Global Lookup Result */}
//         {lookupResult && (
//           <Card className="mb-8 bg-black/40 backdrop-blur-xl border-purple-500/30">
//             <CardContent className="p-6">
//               <div className="flex items-center gap-6">
//                 <img
//                   src={lookupResult.profile.profile_image_url || "/placeholder.svg"}
//                   className="w-20 h-20 rounded-full border-2 border-purple-500/50"
//                   alt="Profile"
//                 />
//                 <div className="flex-1">
//                   <h2 className="text-2xl font-bold text-white mb-2">{lookupResult.profile.display_name}</h2>
//                   <p className="text-gray-400 mb-3">{lookupResult.profile.description}</p>
//                   {lookupResult.live && (
//                     <div className="space-y-2">
//                       <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
//                         <Activity className="w-3 h-3 mr-1" />
//                         LIVE
//                       </Badge>
//                       <p className="text-sm text-gray-300">
//                         Playing <strong>{lookupResult.stream.game_name}</strong> •{" "}
//                         {lookupResult.stream.viewer_count.toLocaleString()} viewers
//                       </p>
//                       <p className="italic text-gray-400">{lookupResult.stream.title}</p>
//                     </div>
//                   )}
//                 </div>
//                 <div className="flex flex-col gap-3">
//                   <Badge
//                     className={lookupResult.live ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}
//                   >
//                     {lookupResult.live ? "LIVE" : "Offline"}
//                   </Badge>
//                   {lookupResult.live && (
//                     <Button
//                       onClick={() => window.open(`https://twitch.tv/${lookupResult.profile.login}`, "_blank")}
//                       className="bg-purple-600 hover:bg-purple-700"
//                     >
//                       <Play className="w-4 h-4 mr-2" />
//                       Watch
//                     </Button>
//                   )}
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Error State */}
//         {lookupError && (
//           <Card className="mb-8 bg-red-500/10 border-red-500/30">
//             <CardContent className="p-4">
//               <p className="text-red-400">{lookupError}</p>
//             </CardContent>
//           </Card>
//         )}

//         {/* Loading State */}
//         {loading ? (
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//             {[...Array(8)].map((_, i) => (
//               <Card key={i} className="bg-black/40 backdrop-blur-xl border-purple-500/30 animate-pulse">
//                 <CardContent className="p-6">
//                   <div className="w-full h-32 bg-gray-700 rounded-lg mb-4"></div>
//                   <div className="h-4 bg-gray-700 rounded mb-2"></div>
//                   <div className="h-3 bg-gray-700 rounded w-2/3"></div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         ) : (
//           /* Streamers Grid */
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//             {filteredAndSortedStreams.map((stream, i) => (
//               <div
//                 key={i}
//                 className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
//                 onClick={() => handleStreamerClick(stream)}
//               >
//                 <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 overflow-hidden">
//                   <CardContent className="p-0">
//                     <div className="relative">
//                       <div className="w-full h-48 bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
//                         <Gamepad2 className="w-16 h-16 text-purple-400/50" />
//                       </div>
//                       <div className="absolute top-3 right-3">
//                         <Badge className="bg-red-500 text-white">
//                           <Activity className="w-3 h-3 mr-1" />
//                           LIVE
//                         </Badge>
//                       </div>
//                       {Number(stream.clip_score) >= 1 && (
//                         <div className="absolute top-3 left-3">
//                           <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
//                             <Star className="w-3 h-3 mr-1" />
//                             Clip Worthy
//                           </Badge>
//                         </div>
//                       )}
//                     </div>
//                     <div className="p-4">
//                       <h3 className="font-bold text-white text-lg mb-2 group-hover:text-purple-400 transition-colors">
//                         {stream.name}
//                       </h3>
//                       <p className="text-gray-400 text-sm mb-3">{stream.game}</p>
//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center text-gray-300">
//                           <Eye className="w-4 h-4 mr-1" />
//                           <span className="text-sm">{stream.viewers.toLocaleString()}</span>
//                         </div>
//                         {Number(stream.clip_score) >= 1 && (
//                           <div className="flex items-center text-yellow-400">
//                             <Zap className="w-4 h-4 mr-1" />
//                             <span className="text-sm font-bold">{stream.clip_score}</span>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* Enhanced Modal */}
//         {selectedStreamer && (
//           <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
//             <Card className="bg-black/90 backdrop-blur-xl border-purple-500/30 max-w-6xl w-full max-h-[90vh] overflow-auto">
//               <CardHeader className="border-b border-purple-500/20">
//                 <div className="flex justify-between items-center">
//                   <div className="flex items-center space-x-4">
//                     <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
//                       <Gamepad2 className="w-8 h-8 text-white" />
//                     </div>
//                     <div>
//                       <CardTitle className="text-2xl text-white">{selectedStreamer.name}</CardTitle>
//                       <p className="text-gray-400 flex items-center">
//                         <Users className="w-4 h-4 mr-1" />
//                         {selectedStreamer.viewers.toLocaleString()} viewers
//                       </p>
//                     </div>
//                   </div>
//                   <Button onClick={closeModal} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
//                     <X className="w-5 h-5" />
//                   </Button>
//                 </div>
//               </CardHeader>

//               <CardContent className="p-6">
//                 {historyLoading ? (
//                   <div className="flex items-center justify-center py-12">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
//                     <span className="ml-3 text-gray-400">Loading analytics...</span>
//                   </div>
//                 ) : (
//                   <>
//                     <ViewerChart data={selectedHistory} />
//                     <div className="mt-8 flex justify-end gap-4">
//                       <Button
//                         onClick={() => ManualClip(selectedStreamer.name)}
//                         className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
//                       >
//                         <Scissors className="w-4 h-4 mr-2" />
//                         Create Clip
//                       </Button>
//                       <Button
//                         onClick={async () => {
//                           const tokenRes = await fetch("/api/token")
//                           const { token } = await tokenRes.json()
//                           const idRes = await fetch(`/api/user-id?username=${selectedStreamer.name}&token=${token}`)
//                           const { id: broadcasterId } = await idRes.json()

//                           if (!isMonitoring) {
//                             startChatMonitor(selectedStreamer.name, token, broadcasterId, async () => {
//                               await fetch("/api/create-clip", {
//                                 method: "POST",
//                                 headers: { "Content-Type": "application/json" },
//                                 body: JSON.stringify({ token, broadcasterId, streamerName: selectedStreamer.name }),
//                               })
//                             })
//                             setIsMonitoring(true)
//                           } else {
//                             stopChatMonitor(selectedStreamer.name)
//                             setIsMonitoring(false)
//                           }
//                         }}
//                         className={`${isMonitoring
//                             ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
//                             : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
//                           }`}
//                       >
//                         {isMonitoring ? (
//                           <>
//                             <Square className="w-4 h-4 mr-2" />
//                             Stop Monitor
//                           </>
//                         ) : (
//                           <>
//                             <Radio className="w-4 h-4 mr-2" />
//                             Start Monitor
//                           </>
//                         )}
//                       </Button>
//                     </div>
//                   </>
//                 )}
//               </CardContent>
//             </Card>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }
