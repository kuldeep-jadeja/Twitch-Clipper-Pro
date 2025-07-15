// import tmi from 'tmi.js';

// // Track running monitors to avoid duplication
// const activeMonitors = {};

// /**
//  * Starts monitoring Twitch chat for a specific streamer.
//  * Triggers onClip() callback when a spike is detected.
//  *
//  * @param {string} streamerUsername
//  * @param {string} token - Twitch user OAuth token
//  * @param {string} broadcasterId
//  * @param {Function} onClip - called when a clip should be created
//  */
// export function startChatMonitor(streamerUsername, token, broadcasterId, onClip) {
//     if (activeMonitors[streamerUsername]) {
//         console.log(`🔁 Already monitoring ${streamerUsername}`);
//         return;
//     }

//     let baselineRate = 0;
//     let messageTimestamps = [];
//     let cooldown = false;
//     const INTERVAL = 10_000;

//     const client = new tmi.Client({
//         connection: { reconnect: true, secure: true },
//         channels: [streamerUsername],
//     });

//     client.connect()
//         .then(() => console.log(`📡 Monitoring started for ${streamerUsername}`))
//         .catch(err => console.error(`❌ Failed to connect to ${streamerUsername}'s chat`, err));

//     client.on('message', (_, __, ___, self) => {
//         if (!self) messageTimestamps.push(Date.now());
//     });

//     const interval = setInterval(() => {
//         const now = Date.now();
//         messageTimestamps = messageTimestamps.filter(ts => now - ts <= INTERVAL);
//         const currentRate = messageTimestamps.length;

//         // Exponential moving average
//         const alpha = 0.2;
//         baselineRate = baselineRate === 0 ? currentRate : (1 - alpha) * baselineRate + alpha * currentRate;

//         const spikeDetected = currentRate > baselineRate * 2.5 && currentRate > 10;

//         console.log(`[${streamerUsername}] Rate: ${currentRate}/10s | Baseline: ${baselineRate.toFixed(2)} | Spike: ${spikeDetected}`);

//         if (spikeDetected && !cooldown) {
//             console.log(`🚀 Clipping ${streamerUsername}`);
//             onClip();
//             cooldown = true;
//             setTimeout(() => cooldown = false, 60_000); // 1 min cooldown
//         }
//     }, INTERVAL);

//     // Save for future reference or stopping
//     activeMonitors[streamerUsername] = { client, interval };
// }

// /**
//  * Optionally, stop a monitor manually (not used yet)
//  */
// export function stopChatMonitor(streamerUsername) {
//     const monitor = activeMonitors[streamerUsername];
//     if (monitor) {
//         clearInterval(monitor.interval);
//         monitor.client.disconnect();
//         delete activeMonitors[streamerUsername];
//         console.log(`🛑 Monitoring stopped for ${streamerUsername}`);
//     }
// }

import tmi from 'tmi.js';

const activeMonitors = {};

/**
 * Starts monitoring Twitch chat for a specific streamer.
 * Triggers onClip() callback when a spike is detected.
 * Triggers onStatsUpdate() every interval with rate/baseline/spike info.
 *
 * @param {string} streamerUsername
 * @param {string} token - Twitch user OAuth token
 * @param {string} broadcasterId
 * @param {Function} onClip - called when a clip should be created
 * @param {Function} onStatsUpdate - called with stats each interval
 */
export function startChatMonitor(streamerUsername, token, broadcasterId, onClip, onStatsUpdate) {
    if (activeMonitors[streamerUsername]) {
        console.log(`🔁 Already monitoring ${streamerUsername}`);
        return;
    }

    let baselineRate = 0;
    let messageTimestamps = [];
    let cooldown = false;
    const INTERVAL = 10_000;

    const client = new tmi.Client({
        connection: { reconnect: true, secure: true },
        channels: [streamerUsername],
    });

    client.connect()
        .then(() => console.log(`📡 Monitoring started for ${streamerUsername}`))
        .catch(err => console.error(`❌ Failed to connect to ${streamerUsername}'s chat`, err));

    client.on('message', (_, __, ___, self) => {
        if (!self) messageTimestamps.push(Date.now());
    });

    const interval = setInterval(() => {
        const now = Date.now();
        messageTimestamps = messageTimestamps.filter(ts => now - ts <= INTERVAL);
        const currentRate = messageTimestamps.length;

        // Exponential moving average
        const alpha = 0.2;
        baselineRate = baselineRate === 0 ? currentRate : (1 - alpha) * baselineRate + alpha * currentRate;

        const spikeDetected = currentRate > baselineRate * 2.5 && currentRate > 10;

        const message = `[${streamerUsername}] Rate: ${currentRate}/10s | Baseline: ${baselineRate.toFixed(2)} | Spike: ${spikeDetected}`;
        console.log(message);

        // ✅ Send to frontend
        if (onStatsUpdate) {
            onStatsUpdate({ streamer: streamerUsername, count: currentRate, baseline: baselineRate, spike: spikeDetected });
        }

        if (spikeDetected && !cooldown) {
            console.log(`🚀 Clipping ${streamerUsername}`);
            onClip();
            cooldown = true;
            setTimeout(() => cooldown = false, 60_000);
        }
    }, INTERVAL);

    activeMonitors[streamerUsername] = { client, interval };
}

export function stopChatMonitor(streamerUsername) {
    const monitor = activeMonitors[streamerUsername];
    if (monitor) {
        clearInterval(monitor.interval);
        monitor.client.disconnect();
        delete activeMonitors[streamerUsername];
        console.log(`🛑 Monitoring stopped for ${streamerUsername}`);
    }
}
