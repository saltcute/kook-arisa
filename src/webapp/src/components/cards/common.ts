import { playback } from "menu/arisa/playback/type";
import { ClientEvents, ServerEvents, ServerPayload, streamerDetail } from "./types";
import EventEmitter2 from "eventemitter2";
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


    isWsAlive = true;
    isWsClosed = true;
    checkWsAliveTimeout?: NodeJS.Timeout;
    checkWsAlive() {
        if (!this.isWsClosed) {
            if (!this.isWsAlive) {
                this.ws?.close();
                this.isWsClosed = true;
                this.reconnect();
            } else {
                this.isWsAlive = false;
                this.ws?.send(JSON.stringify({
                    t: ClientEvents.CLIENT_PING,
                    d: {
                        time: Date.now()
                    }
                }))
            }
        }
        clearTimeout(this.checkWsAliveTimeout);
        this.checkWsAliveTimeout = setTimeout(() => { this.checkWsAlive() }, 5 * 1000);
    }
    /**
     * Lantency with server in ms
     */
    serverLatency = 0;
    now() {
        return Date.now() - this.serverLatency;
    }
    connect() {
        try {
            const self = this;
            this.ws = new WebSocket(window.location.protocol.replace('http', 'ws') + location.hostname);
            this.isWsAlive = true;
            this.isWsClosed = false;
            this.ws.onopen = function () {
                self.ws?.send(JSON.stringify({
                    t: 0,
                    d: {
                        access_token: auth.access_token
                    }
                }));
                self.checkWsAlive();
            };

            this.ws.onmessage = function (data) {
                try {
                    self.currentReconnectLatency = 1000;
                    self.emit("wsEvent", data);
                    if (data.data) {
                        const event: ServerPayload = JSON.parse(data.data.toString());
                        switch (event.t) {
                            case ServerEvents.STREAMER_DATA: {
                                self.streamers = event.d;
                                if (Backend.getNowPlayingHash(self.nowPlaying) != Backend.getNowPlayingHash(self.currentStreamer?.nowPlaying)) {
                                    self.nowPlaying = self.currentStreamer?.nowPlaying;
                                    self.emit("newTrack", self.currentNowPlaying);
                                }
                                // console.log(streamers.value[currentStreamerIndex].nowPlaying);
                                break;
                            }
                            case ServerEvents.SERVER_PONG: {
                                self.isWsAlive = true;
                                self.serverLatency = Date.now() - event.d.time;
                            }
                        }
                    }
                } catch (e) { console.error(e) }
            };

            this.ws.onerror = function (err) {
                console.error('Socket encountered error: ', err, 'Closing socket');
                self.ws?.close();
                self.isWsClosed = true;
                self.reconnect();
            };
        } catch (e) {
            console.error(e);
            this.ws?.close();
            this.isWsClosed = true;
            this.reconnect();
        }
    }
    reconnectTimeout?: NodeJS.Timeout;
    currentReconnectLatency = 1000;
    reconnect() {
        this.currentReconnectLatency = 1.5 * this.currentReconnectLatency;
        console.log(`Socket is closed. Attempting to reconnect in ${this.currentReconnectLatency / 1000} seconds.`);
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => { this.connect() }, this.currentReconnectLatency);
    }

    setPlayback(paused: boolean) {
        this.ws?.send(JSON.stringify({
            t: ClientEvents.PLAYBACK_PAUSE_RESUME,
            d: {
                streamerIndex: this.currentStreamerIndex,
                paused,
            }
        }))
    }

    changeTrack(next: boolean) {
        this.ws?.send(JSON.stringify({
            t: ClientEvents.PLAYBACK_NEXT_PREVIOUS,
            d: {
                streamerIndex: this.currentStreamerIndex,
                next
            }
        }))
    }

    changeQueueEntry(index: number, amount = 1, action: 'up' | 'down' | 'delete') {
        this.ws?.send(JSON.stringify({
            t: ClientEvents.PLAYBACK_MOVE_QUEUE,
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
            t: ClientEvents.PLAYBACK_SHUFFLE_QUEUE,
            d: {
                streamerIndex: this.currentStreamerIndex,
            }
        }))
    }

    sendChangeCycleMode(mode: 'repeat_one' | 'repeat' | 'no_repeat' | 'random') {
        this.ws?.send(JSON.stringify({
            t: ClientEvents.PLAYBACK_CYCLE_MODE,
            d: {
                streamerIndex: this.currentStreamerIndex,
                cycleMode: mode
            }
        }))
    }

    private lastSentGain = -1;
    changeVolumeGain(value: number) {
        if (typeof value != 'number') return;
        if (value >= 0.5) value = 0.5;
        if (value <= 0.15) value = 0;
        if (Date.now() - this.lastSentGain > 50) {
            this.lastSentGain = Date.now();
            this.ws?.send(JSON.stringify({
                t: ClientEvents.PLAYBACK_VOLUME,
                d: {
                    streamerIndex: this.currentStreamerIndex,
                    value
                }
            }))
        }
    }

    public addTrack(data: playback.extra.streaming) {
        this.ws?.send(JSON.stringify({
            t: ClientEvents.PLAYBACK_PLAY_SONG,
            d: {
                streamerIndex: this.currentStreamerIndex,
                data
            }
        }))
    }

    jumpToPercentage(percent: number) {
        this.ws?.send(JSON.stringify({
            t: ClientEvents.PLAYBACK_JUMP_TO_PERCENT,
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
            return "";
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

    switchCycleMode(mode: 'repeat_one' | 'repeat' | 'no_repeat' | 'random') {
        const streamer = this.currentStreamer;
        if (streamer) {
            return this.sendChangeCycleMode(mode);
        }
    }


    // sendSelectServer(guildId: string) {
    //    this.ws?.send(JSON.stringify({
    // t: ClientEvents.SELECT_GUILD,
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