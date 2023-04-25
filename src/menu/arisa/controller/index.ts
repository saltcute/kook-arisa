import { client } from "init/client";
import { Streamer } from "./music";
import * as fs from 'fs';
import upath from 'upath';


export class Controller {
    private userStreamers: Map<string, Streamer[]> = new Map();
    private guildStreamers: Map<string, Streamer[]> = new Map();
    private streamerChannel: Map<string, string> = new Map();
    private channelStreamer: Map<string, Streamer> = new Map();

    private controllerToken: string;

    private streamerPool: string[] = [];
    get allStreamerTokens() {
        return this.streamerPool;
    }
    private availableStreamers: string[] = [];
    get allAvailableStreamersTokens() {
        return this.availableStreamers;
    }

    constructor(token: string) {
        this.controllerToken = structuredClone(token);

        this.loadStreamer();
    }

    loadStreamer() {
        try {
            const config: string[] = JSON.parse(fs.readFileSync(upath.join(__dirname, '..', '..', '..', 'config', 'streamer.json'), { encoding: 'utf-8' })).streamers;
            let newPool: string[] = [], newAvailable: string[] = [];
            for (const token of config) {
                newPool.push(token);
                if (this.streamerPool.includes(token)) { // Duplicate
                    if (this.availableStreamers.includes(token)) { // Available
                        newAvailable.push(token);
                    }
                } else {
                    newAvailable.push(token);
                }
            }
            this.streamerPool = structuredClone(newPool);
            this.availableStreamers = structuredClone(newAvailable);
        } catch (e) {
            client.logger.error(e);
            if (!this.streamerPool.length) {
                client.logger.fatal("No streamer available. Arisa is shutting down!");
                process.exit(0);
            }
        }
    }

    private getNextAvailableStreamer(): string | undefined {
        if (this.availableStreamers.length) {
            return this.availableStreamers.pop();
        }
        else return undefined;
    }

    async returnStreamer(streamer: Streamer) {
        const { err } = await streamer.kasumi.API.guild.leave(streamer.TARGET_GUILD_ID);
        if (err) {
            streamer.kasumi.logger.error(err);
            return false;
        }
        this.streamerChannel.delete(streamer.STREAMER_TOKEN);
        this.channelStreamer.delete(streamer.TARGET_CHANNEL_ID);
        if (this.streamerPool.includes(streamer.STREAMER_TOKEN)) {
            this.availableStreamers.push(streamer.STREAMER_TOKEN);
        } {
            const streamers = (this.userStreamers.get(streamer.INVITATION_AUTHOR_ID) || []).filter(v => v != streamer);
            this.userStreamers.set(streamer.INVITATION_AUTHOR_ID, streamers);
        } {
            const streamers = (this.guildStreamers.get(streamer.TARGET_GUILD_ID) || []).filter(v => v != streamer);
            this.guildStreamers.set(streamer.INVITATION_AUTHOR_ID, streamers);
        }
        return true;
    }

    /**
     * Assign a streamer bot to a channel.
     * 
     * Bot token is auto assigned.
     * @param channelId ChannelID
     */
    async joinChannel(guildId: string, channelId: string, authorId: string) {
        const STREAMER_TOKEN = this.getNextAvailableStreamer();
        if (!STREAMER_TOKEN) return;

        const streamer = new Streamer(STREAMER_TOKEN, guildId, channelId, authorId, this);
        const { err, data } = await streamer.kasumi.API.user.me();
        if (err) {
            streamer.kasumi.logger.error(err);
            return;
        }
        const streamerId = data.id; {
            const { err } = await streamer.kasumi.API.rest.get('/guild/join', { id: guildId });
            if (err) {
                streamer.kasumi.logger.error(err);
                return;
            }
        } {
            const { err } = await client.API.channel.permission.createUser(channelId, streamerId);
            if (err) {
                client.logger.error(err);
                return;
            }
        } {
            const { err } = await client.API.channel.permission.updateUser(channelId, streamerId, 1 << 15);
            if (err) {
                client.logger.error(err);
                return;
            }
        } {
            const { err } = await client.API.channel.permission.createUser(channelId, client.me.userId);
            if (err) {
                client.logger.error(err);
                return;
            }
        } {
            const { err } = await client.API.channel.permission.updateUser(channelId, client.me.userId, 1 << 11);
            if (err) {
                client.logger.error(err);
                return;
            }
        }
        this.streamerChannel.set(STREAMER_TOKEN, channelId);
        this.channelStreamer.set(channelId, streamer); {
            const streamers = this.userStreamers.get(authorId) || [];
            streamers.push(streamer);
            this.userStreamers.set(authorId, streamers);
        } {
            const streamers = this.guildStreamers.get(guildId) || [];
            streamers.push(streamer);
            this.guildStreamers.set(guildId, streamers);
        }
        return streamer.connect();
    }

    async abortStream(channelId: string) {
        const streamer = this.getChannelStreamer(channelId);
        if (!streamer) return false;
        await streamer.disconnect();
        return true;
    }

    getGuildStreamers(guildId: string): Streamer[] | undefined {
        return this.guildStreamers.get(guildId);
    }

    getChannelStreamer(channelId: string): Streamer | undefined {
        return this.channelStreamer.get(channelId);
    }

    getUserStreamers(userId: string): Streamer[] | undefined {
        return this.userStreamers.get(userId);
    }

    getStreamerChannel(token: string): string | undefined {
        return this.streamerChannel.get(token);
    }
}