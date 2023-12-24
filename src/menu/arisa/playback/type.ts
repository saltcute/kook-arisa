import { ArisaStorage } from 'init/type';
import Kasumi from 'kasumi.js';
import { Readable } from 'stream';

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
        export type streaming = netease | bilibili;
    }
}


export type queueItem = {
    source?: playback.source.cache | playback.source.none,
    meta: playback.meta,
    extra: playback.extra
};
export abstract class Streamer {
    readonly STREAMER_TOKEN: string;
    readonly TARGET_CHANNEL_ID: string;
    readonly TARGET_GUILD_ID: string;
    readonly INVITATION_AUTHOR_ID: string;
    readonly kasumi: Kasumi<any>;

    constructor(token: string, guildId: string, channelId: string, authorId: string, controller: Controller) {
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
    }

    /**
     * Connect the streamer to KOOK server.
     */
    abstract connect(): Promise<this>;
    /**
     * Disconnect the stream. End playback.
     */
    abstract disconnect(): Promise<boolean>;

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
    abstract pause(): void
    /**
     * Resueme the playback. Does nothing when already playing.
     */
    abstract resume(): void

    /**
     * Move a item up one level
     * @param index Index of the item in the queue
     */
    abstract queueMoveUp(index: number): void;
    /**
     * Move a item down one level
     * @param index Index of the item in the queue
     */
    abstract queueMoveDown(index: number): void;
    /**
     * Delete an item from the queue
     * @param index Index of the item in the queue
     */
    abstract queueDelete(index: number): void;

    /**
     * Set the cycle mode for the current user.
     * @param payload Desired cycle mode.
     */
    abstract setCycleMode(payload: 'repeat_one' | 'repeat' | 'no_repeat'): void;
    /**
     * Get the cycle mode of the current channel.
     */
    abstract getCycleMode(): 'repeat_one' | 'repeat' | 'no_repeat';

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
    abstract playback(payload: queueItem): Promise<void>
}


export abstract class Controller {
    client: Kasumi<ArisaStorage>;

    protected controllerToken: string;

    constructor(client: Kasumi<any>) {
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
}