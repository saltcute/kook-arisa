import { streamers } from "config";
import { client } from "init/client";
import { Streamer } from "./music";


export class Controller {
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
        const { err, data } = await streamer.kasumi.API.user.me();
        if (err) {
            streamer.kasumi.logger.error(err);
            return false;
        }
        const streamerId = data.id; {
            const { err } = await client.API.guild.kick(streamer.targetGuildId, streamerId);
            if (err) {
                streamer.kasumi.logger.error(err);
                return false;
            }
        }
        this.guildChannel.delete(streamer.targetGuildId);
        this.streamerChannel.delete(streamer.streamerToken);
        this.channelStreamer.delete(streamer.targetChannelId);
        this.availableStreamers.push(streamer.streamerToken);
        return true;
    }

    /**
     * Assign a streamer bot to a channel.
     * 
     * Bot token is auto assigned.
     * @param channelId ChannelID
     */
    async joinChannel(guildId: string, channelId: string) {
        const streamerToken = this.getNextAvailableStreamer();
        if (!streamerToken) return;

        const streamer = new Streamer(streamerToken, guildId, channelId, this);
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
        }
        this.streamerChannel.set(streamerToken, channelId);
        this.guildChannel.set(guildId, channelId);
        this.channelStreamer.set(channelId, streamer);
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
}