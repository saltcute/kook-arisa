import { playback } from "menu/arisa/playback/type";
import { streamerDetail } from "./types";
import EventEmitter2 from "eventemitter2";
import { computed } from "vue";
export interface auth {
    access_token: string,
    expires_in: number,
    token_type: string,
    scope: string,
    expires: number
}

class Backend extends EventEmitter2 {
    streamers: streamerDetail[] = []
    ws?: WebSocket;
    nowPlaying?: playback.extra;
    currentStreamerIndex = 0;

    set streamerIndex(index: number) {
        this.currentStreamerIndex = index;
    }
    get streamerIndex() {
        return this.currentStreamerIndex;
    }
    get currentStreamer() {
        return this.streamers.at(this.streamerIndex);
    }

    static getNowPlayingHash(payload?: playback.extra) {
        if (!payload) return undefined;
        return payload.meta.title + payload.meta.artists + payload.meta.duration;
    }

    get currentNowPlaying() {
        const streamer = this.currentStreamer;
        if (streamer) {
            return streamer.nowPlaying;
        } else return undefined;
    }


    connect() {
        const self = this;
        this.ws = new WebSocket(window.location.protocol.replace('http', 'ws') + location.hostname);
        this.ws.onopen = function () {
            self.ws?.send(JSON.stringify({
                t: 0,
                d: {
                    access_token: auth.access_token
                }
            }));
        };

        this.ws.onmessage = function (data) {
            try {
                self.emit("wsEvent");
                if (data.data) {
                    self.streamers = JSON.parse(data.data.toString());
                    if (Backend.getNowPlayingHash(self.nowPlaying) != Backend.getNowPlayingHash(self.currentStreamer?.nowPlaying)) {
                        self.nowPlaying = self.currentStreamer?.nowPlaying;
                        self.emit("newTrack", self.currentNowPlaying);
                    }
                    // console.log(streamers.value[currentStreamerIndex].nowPlaying);
                }
            } catch (e) { console.error(e) }
        };

        this.ws.onclose = function (e) {
            console.log('Socket is closed. Attempting to reconnect in 5 second.', e.reason);
            setTimeout(self.connect, 5000);
        };

        this.ws.onerror = function (err) {
            console.error('Socket encountered error: ', err, 'Closing socket');
            self.ws?.close();
        };
    }

    setPlayback(paused: boolean) {
        this.ws?.send(JSON.stringify({
            t: 1,
            d: {
                streamerIndex: this.currentStreamerIndex,
                paused,
            }
        }))
    }

    changeTrack(next: boolean) {
        this.ws?.send(JSON.stringify({
            t: 2,
            d: {
                streamerIndex: this.currentStreamerIndex,
                next
            }
        }))
    }

    changeQueueEntry(index: number, amount = 1, action: 'up' | 'down' | 'delete') {
        this.ws?.send(JSON.stringify({
            t: 3,
            d: {
                streamerIndex: this.currentStreamerIndex,
                queueIndex: index - 1,
                amount,
                action
            }
        }))
    }

    sendShuffleQueue() {
        this.ws?.send(JSON.stringify({
            t: 4,
            d: {
                streamerIndex: this.currentStreamerIndex,
            }
        }))
    }

    sendChangeCycleMode(mode: 'repeat_one' | 'repeat' | 'no_repeat') {
        this.ws?.send(JSON.stringify({
            t: 5,
            d: {
                streamerIndex: this.currentStreamerIndex,
                cycleMode: mode
            }
        }))
    }

    public addTrack(data: playback.extra.streaming) {
        this.ws?.send(JSON.stringify({
            t: 6,
            d: {
                streamerIndex: this.currentStreamerIndex,
                data
            }
        }))
    }

    jumpToPercentage(percent: number) {
        this.ws?.send(JSON.stringify({
            t: 7,
            d: {
                streamerIndex: this.currentStreamerIndex,
                percent
            }
        }))
    }


    get currentStreamerName() {
        const streamer = this.currentStreamer;
        if (streamer) {
            return `${streamer.name}#${streamer.identifyNum}`;
        } else {
            return "Select a Streamer";
        }
    }

    selectStreamer(event: Event) {
        const value = (event.target as HTMLElement).getAttribute('index');
        if (value) {
            const index = parseInt(value);
            backend.streamerIndex = index;
            (event.target as HTMLInputElement).parentElement?.parentElement?.removeAttribute('open');
        }
    }

    switchPlayback() {
        const streamer = this.currentStreamer;
        if (streamer) {
            if (streamer.isPaused) {
                this.setPlayback(false);
            } else {
                this.setPlayback(true);
            }
        }
    }

    playPrevious() {
        const streamer = this.currentStreamer;
        if (streamer) {
            this.changeTrack(false);
        }
    }

    playNext() {
        const streamer = this.currentStreamer;
        if (streamer) {
            this.changeTrack(true);
        }
    }

    queueMoveEntryUp(index: number, amount = 1) {
        const streamer = this.currentStreamer;
        if (streamer) {
            return this.changeQueueEntry(index, amount, 'up');
        }
    }
    queueMoveEntryDown(index: number, amount = 1) {
        const streamer = this.currentStreamer;
        if (streamer) {
            return this.changeQueueEntry(index, amount, 'down');
        }
    }
    queueDeleteEntry(index: number) {
        const streamer = this.currentStreamer;
        if (streamer) {
            return this.changeQueueEntry(index, 0, 'delete');
        }
    }

    shuffleQueue() {
        const streamer = this.currentStreamer;
        if (streamer) {
            return this.sendShuffleQueue();
        }
    }

    switchCycleMode(mode: 'repeat_one' | 'repeat' | 'no_repeat') {
        const streamer = this.currentStreamer;
        if (streamer) {
            return this.sendChangeCycleMode(mode);
        }
    }


    // sendSelectServer(guildId: string) {
    //    this.ws?.send(JSON.stringify({
    //         t: 8,
    //         d: {
    //             guildId
    //         }
    //     }))
    // }
}

export let auth: auth;
const authRaw = localStorage.getItem('auth');

const backend = new Backend();
if (authRaw && (auth = JSON.parse(authRaw)) && auth.expires - Date.now() > 3600 * 1000) { // Have auth
    backend.connect();
}

export default backend