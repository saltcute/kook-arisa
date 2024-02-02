import { ArisaStorage } from 'init/type';
import Kasumi from 'kasumi.js';
import { Readable } from 'stream';
import EventEmitter2 from 'eventemitter2';
import { ButtonControlPanel } from './lib/panel';

export namespace playback {
    export type source = source.playable;
    export interface meta {
        title: string,
        artists: string,
        duration: number,
        cover: string
    }
    export namespace source {
        export type none = null;
        export type cache = Buffer | Readable;
        export type playable = cache;
    }
    export type extra = extra.playable | extra.streaming;
    export namespace extra {
        export interface base {
            type: string,
            data?: any
            meta: meta
        }
        export interface netease extends base {
            type: 'netease',
            data: {
                songId: number
            }
        }
        export interface qqmusic extends base {
            type: 'qqmusic',
            data: {
                songMId: string,
                mediaId: string
            }
        }
        export interface bilibili extends base {
            type: 'bilibili',
            data: {
                bvid: string,
                part: number
            }
        }
        export interface readable extends base {
            type: 'readable'
        }
        export interface buffer extends base {
            type: 'buffer'
        }
        export interface local extends base {
            type: 'local',
            path: string
        }

        export type cache = buffer | readable;
        export type playable = local | cache;
        export type streaming = netease | bilibili | qqmusic;
    }
}


export type queueItem = {
    source?: playback.source.cache | playback.source.none,
    meta: playback.meta,
    extra: playback.extra
};


interface StreamerEmisions {
    connect: () => void;
    disconnect: () => void;
    pause: () => void;
    resume: () => void;
    play: (payload: queueItem) => void;
}
export interface Streamer extends EventEmitter2 {
    on<T extends keyof StreamerEmisions>(event: T, listener: StreamerEmisions[T]): this;
    emit<T extends keyof StreamerEmisions>(event: T, ...args: Parameters<StreamerEmisions[T]>): boolean;
}
export abstract class Streamer extends EventEmitter2 {
    readonly STREAMER_TOKEN: string;
    readonly TARGET_CHANNEL_ID: string;
    readonly TARGET_GUILD_ID: string;
    readonly INVITATION_AUTHOR_ID: string;
    readonly kasumi: Kasumi<any>;

    /**
     * Decorator function to set if a method is overridable
     * @param value Boolean
     */
    private static writable(value: boolean) {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            descriptor.writable = value;
        };
    }

    panel?: ButtonControlPanel;

    private _streamStart = 0;
    public get streamStart() { return this._streamStart; }
    protected set streamStart(payload: number) { this._streamStart = payload };

    constructor(token: string, guildId: string, channelId: string, authorId: string, controller: Controller) {
        super({ wildcard: true });
        this.STREAMER_TOKEN = token;
        this.TARGET_CHANNEL_ID = channelId;
        this.TARGET_GUILD_ID = guildId
        this.INVITATION_AUTHOR_ID = authorId;
        this.kasumi = new Kasumi({
            type: 'websocket',
            token: this.STREAMER_TOKEN,
            disableSnOrderCheck: true,
            customEnpoint: controller.client.config.getSync('kasumi::config.customEndpoint')
        }, false, false);
        this.kasumi.fetchMe();
        this.streamStart = Date.now();
    }

    /**
     * Connect the streamer to KOOK server.
     */
    protected abstract doConnect(): Promise<this>;

    /**
     * Connect the streamer to KOOK server.
     */
    @Streamer.writable(false)
    async connect(): Promise<this> {
        const res = this.doConnect();
        this.emit('connect');
        return res;
    }
    /**
     * Disconnect the stream. End playback.
     */
    protected abstract doDisconnect(message?: string | null): Promise<boolean>;

    /**
     * Disconnect the stream. End playback.
     */
    @Streamer.writable(false)
    async disconnect(message?: string | null): Promise<boolean> {
        const res = await this.doDisconnect(message);
        this.emit('disconnect');
        return res;
    }

    /**
     * Available streaming services.
     */
    abstract readonly streamingServices: string[];

    /**
     * Play a sound from a supported streaming service.
     * @param meta Sound metadata.
     * @param extra Extra data useful for the streaming service.
     * @param forceSwitch Switch to this sound immediately and drop current sound.
     */
    abstract playStreaming(meta: playback.meta, extra: playback.extra.streaming, forceSwitch: boolean): Promise<void>;
    /**
     * Play a sound from Buffer.
     * @param input Sound Buffer.
     * @param meta Sound metadata.
     * @param forceSwitch Switch to this sound immediately and drop current sound.
     */
    abstract playBuffer(input: playback.source.cache, meta: playback.meta, forceSwitch: boolean): Promise<void>
    /**
     * Play a sound from a local file.
     * @param input Sound Buffer.
     * @param forceSwitch Switch to this sound immediately and drop current sound.
     */
    abstract playLocal(input: playback.extra.local, forceSwitch: boolean): Promise<void>

    /**
     * Shuffle the queue.
     */
    abstract shuffle(): void;
    /**
     * Get the queue.
     */
    abstract getQueue(): queueItem[];
    /**
     * Clear the queue.
     */
    abstract clearQueue(): void

    /**
     * A set of id of users who are connected to the same voice channel with the streamer.
     */
    abstract audienceIds: Set<string>;

    /**
     * How long did the last pause elapsed in ms.
     */
    abstract get pausedTime(): number;
    /**
     * Total length of the sound file.
     */
    abstract get duration(): number;
    /**
     * Current position of playback in the sound file.
     */
    abstract get playedTime(): number;

    /**
     * If the playback is paused currently.
     */
    abstract isPaused(): boolean;

    /**
     * Pause the playback. Does nothing when already paused.
     */
    protected abstract doPause(): void;
    /**
     * Pause the playback. Does nothing when already paused.
     */
    @Streamer.writable(false)
    pause(): void {
        this.doPause();
        this.emit('pause');
    }

    /**
     * Resueme the playback. Does nothing when already playing.
     */
    protected abstract doResume(): void
    /**
     * Resueme the playback. Does nothing when already playing.
     */
    @Streamer.writable(false)
    resume(): void {
        this.doResume();
        this.emit('resume');
    }

    protected queue: Array<queueItem> = [];

    /**
     * Move a item up one level
     * @param index Index of the item in the queue
     */
    queueMoveUp(index: number): void {
        if (index) {
            const item = this.queue[index], previous = this.queue[index - 1];
            if (item && previous) {
                this.queue[index] = previous;
                this.queue[index - 1] = item;
            }
        } else {
            const item = this.queue.shift();
            if (item) {
                this.queue.push(item);
            }
        }
    }
    /**
     * Move a item down one level
     * @param index Index of the item in the queue
     */
    queueMoveDown(index: number): void {
        if (index != this.queue.length - 1) {
            const item = this.queue[index], next = this.queue[index + 1];
            if (item && next) {
                this.queue[index] = next;
                this.queue[index + 1] = item;
            }
        } else {
            const item = this.queue.pop();
            if (item) {
                this.queue.unshift(item);
            }
        }
    }
    /**
     * Delete an item from the queue
     * @param index Index of the item in the queue
     */
    queueDelete(index: number): void {
        const item = this.queue[index];
        this.queue = this.queue.filter(v => v != item);
    }

    protected cycleMode: 'repeat_one' | 'repeat' | 'no_repeat' = 'no_repeat';
    /**
     * Set the cycle mode for the current user.
     * @param payload Desired cycle mode.
     */
    setCycleMode(payload: 'repeat_one' | 'repeat' | 'no_repeat'): void {
        if (payload !== 'repeat_one' && payload !== 'repeat' && payload != 'no_repeat') payload = 'no_repeat';
        this.cycleMode = payload;
    }
    /**
     * Get the cycle mode of the current channel.
     */
    getCycleMode(): 'repeat_one' | 'repeat' | 'no_repeat' {
        return this.cycleMode;
    }

    /**
     * The sound that is playing at the moment.
     */
    nowPlaying?: queueItem;

    /**
     * Play the previous sound in the queue. Usually be the last sound in the queue.
     * @returns The sound that will be played.
     */
    abstract previous(): Promise<queueItem | undefined>
    /**
     * Play the next sound in the queue.
     * @returns The sound that will be played.
     */
    abstract next(): Promise<queueItem | undefined>

    /**
     * Timestamp when current playback started.
     */
    playbackStart?: number;

    /**
     * Force end current playback. Does not disconnect streamer from the voice channel.
     */
    abstract endPlayback(): Promise<void>;

    /**
     * Jump to the percentage position of the sound.
     * @param percent The desired position.
     */
    abstract jumpToPercentage(percent: number): void

    /**
     * Play a item.
     * @param payload The item to be played.
     */
    abstract doPlayback(payload: queueItem): Promise<void>
    /**
     * Resueme the playback. Does nothing when already playing.
     */
    @Streamer.writable(false)
    playback(payload: queueItem): void {
        this.doPlayback(payload);
        this.emit('play', payload);
    }
}


export abstract class Controller extends EventEmitter2 {
    client: Kasumi<ArisaStorage>;

    protected controllerToken: string;

    constructor(client: Kasumi<any>) {
        super({ wildcard: true });
        this.controllerToken = client.TOKEN
        this.client = client;
    }

    /**
     * Get the token of all the streamers.
     */
    abstract get allStreamerTokens(): string[];
    /**
     * Get the token of all available streamers.
     */
    abstract get allAvailableStreamersTokens(): string[];

    /**
     * Load streamer list.
     */
    abstract loadStreamer(): void;

    /**
     * Return a streamer to the controller and make it available for other user.
     * @param streamer The sreamer to be returned.
     * @returns If the operation was successful.
     */
    abstract returnStreamer(streamer: Streamer): Promise<boolean>

    /**
     * Assign a streamer to a channel.
     * 
     * Bot token should be auto assigned.
     * @param channelId ChannelID
     * @returns The assigned streamer if successful, or undefined if not,
     */
    abstract joinChannel(guildId: string, channelId: string, authorId: string, textChannelId: string): Promise<Streamer | undefined>;

    /**
     * Abort a ongoing playback in a voice channel.
     * @param channelId The target channel.
     * @returns If the operation was successful.
     */
    abstract abortStream(channelId: string): Promise<boolean>

    /**
     * Get all the active streamers in a server.
     * @param guildId The target server.
     */
    abstract getGuildStreamers(guildId: string): Streamer[] | undefined;
    /**
     * Get the active streamers in a channel.
     * @param channelId The target channel.
     */
    abstract getChannelStreamer(channelId: string): Streamer | undefined;
    /**
     * Get all the active streamers invited by a user.
     * @param userId The target user.
     */
    abstract getUserStreamers(userId: string): Streamer[] | undefined;
    /**
     * Get the channel the streamer is in.
     * @param token Token of the target streamer.
     */
    abstract getStreamerChannel(token: string): string | undefined;
    /**
     * Get the streamer instance by user id. Can only get active streamers.
     * @param id User id of the streamer.
     */
    abstract getStreamerById(id: string): Streamer | undefined;
}