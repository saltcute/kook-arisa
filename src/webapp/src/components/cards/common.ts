import { playback } from "menu/arisa/controller/music";
import { streamerDetail } from "./types";
import { ref } from 'vue';
export let ws: WebSocket;
export interface auth {
    access_token: string,
    expires_in: number,
    token_type: string,
    scope: string,
    expires: number
}

export let auth: auth, streamers = ref<streamerDetail[]>([]);
const authRaw = localStorage.getItem('auth');
if (authRaw && (auth = JSON.parse(authRaw)) && auth.expires - Date.now() > 3600 * 1000) { // Have auth
    function connect() {
        ws = new WebSocket(window.location.protocol.replace('http', 'ws') + location.hostname);
        ws.onopen = function () {
            ws.send(JSON.stringify({
                t: 0,
                d: {
                    access_token: auth.access_token
                }
            }));
        };

        ws.onmessage = function (data) {
            try {
                if (data.data) {
                    streamers.value = JSON.parse(data.data.toString());
                    // console.log(streamers.value[currentStreamerIndex].nowPlaying);
                }
            } catch (e) { console.error(e) }
        };

        ws.onclose = function (e) {
            console.log('Socket is closed. Reconnect will be attempted in 5 second.', e.reason);
            setTimeout(connect, 5000);
        };

        ws.onerror = function (err) {
            console.error('Socket encountered error: ', err, 'Closing socket');
            ws.close();
        };
    }

    connect();
}

export let currentStreamerIndex = 0;
export function setStreamerIndex(index: number) {
    currentStreamerIndex = index;
}

export function setPlayback(paused: boolean) {
    ws.send(JSON.stringify({
        t: 1,
        d: {
            streamerIndex: currentStreamerIndex,
            paused,
        }
    }))
}

export function changeTrack(next: boolean) {
    ws.send(JSON.stringify({
        t: 2,
        d: {
            streamerIndex: currentStreamerIndex,
            next
        }
    }))
}

export function changeQueueEntry(index: number, action: 'up' | 'down' | 'delete') {
    ws.send(JSON.stringify({
        t: 3,
        d: {
            streamerIndex: currentStreamerIndex,
            queueIndex: index - 1,
            action
        }
    }))
}

export function sendShuffleQueue() {
    ws.send(JSON.stringify({
        t: 4,
        d: {
            streamerIndex: currentStreamerIndex,
        }
    }))
}

export function sendChangeCycleMode(mode: 'repeat_one' | 'repeat' | 'no_repeat') {
    ws.send(JSON.stringify({
        t: 5,
        d: {
            streamerIndex: currentStreamerIndex,
            cycleMode: mode
        }
    }))
}

export function addTrack(data: playback.extra.streaming) {
    ws.send(JSON.stringify({
        t: 6,
        d: {
            streamerIndex: currentStreamerIndex,
            data
        }
    }))
}

export function jumpToPercentage(percent: number) {
    ws.send(JSON.stringify({
        t: 7,
        d: {
            streamerIndex: currentStreamerIndex,
            percent
        }
    }))
}

// export function sendSelectServer(guildId: string) {
//     ws.send(JSON.stringify({
//         t: 8,
//         d: {
//             guildId
//         }
//     }))
// }