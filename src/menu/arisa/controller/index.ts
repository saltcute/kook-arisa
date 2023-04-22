import { streamers } from "config";
import { client } from "init/client";
import { Streamer } from "./music";


export class Controller {
    private userStreamers: Map<string, Streamer[]> = new Map();
    private streamerChannel: Map<string, string> = new Map();
    private channelStreamer: Map<string, Streamer> = new Map();
    private guildChannel: Map<string, string> = new Map();

    private controllerToken: string;


    private shuffle(array: any[]) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    private readonly streamerPool: string[];
    private availableStreamers: string[];

    constructor(token: string) {
        this.controllerToken = structuredClone(token);

        this.streamerPool = this.shuffle(structuredClone(streamers));
        this.availableStreamers = structuredClone(this.streamerPool);
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
        this.guildChannel.delete(streamer.TARGET_GUILD_ID);
        this.streamerChannel.delete(streamer.STREAMER_TOKEN);
        this.channelStreamer.delete(streamer.TARGET_CHANNEL_ID);
        this.availableStreamers.push(streamer.STREAMER_TOKEN);
        const streamers = (this.userStreamers.get(streamer.INVITATION_AUTHOR_ID) || []).filter(v => v != streamer);
        this.userStreamers.set(streamer.INVITATION_AUTHOR_ID, streamers);
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
        this.guildChannel.set(guildId, channelId);
        this.channelStreamer.set(channelId, streamer);

        let streamers = this.userStreamers.get(authorId) || [];
        streamers.push(streamer);
        this.userStreamers.set(authorId, streamers);
        return streamer.connect();
    }

    async abortStream(channelId: string) {
        const streamer = this.getChannelStreamer(channelId);
        if (!streamer) return false;
        await streamer.disconnect();
        return true;
    }

    getGuildChannel(guildId: string): string | undefined {
        return this.guildChannel.get(guildId);
    }

    getChannelStreamer(channelId: string): Streamer | undefined {
        return this.channelStreamer.get(channelId);
    }

    getUserStreamers(userId: string): Streamer[] | undefined {
        return this.userStreamers.get(userId);
    }
}