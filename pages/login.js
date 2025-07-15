// export default function Login() {
//     const handleLogin = () => {
//         const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
//         const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI);
//         const scopes = 'clips:edit user:read:email';

//         window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}`;
//     };

//     return (
//         <div style={{ textAlign: 'center', paddingTop: 100 }}>
//             <h1>TwitchRadar 🎯</h1>
//             <button onClick={handleLogin}>Login with Twitch</button>
//         </div>
//     );
// }

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
    const router = useRouter();
    const { next = '/' } = router.query; // fallback to homepage

    useEffect(() => {
        const params = new URLSearchParams({
            client_id: process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
            redirect_uri: process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI,
            response_type: 'code',
            scope: 'clips:edit user:read:email',
            state: next, // use state to track post-login redirect
        });

        window.location.href = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
    }, [next]);

    return <p>Redirecting to Twitch login...</p>;
}