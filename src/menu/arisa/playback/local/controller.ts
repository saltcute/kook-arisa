import { client } from "init/client";
import Kasumi, { Card, MessageType } from "kasumi.js";
import { Streamer } from "../type";
import { LocalStreamer } from "./player";
import { Controller } from "../type";

export class LocalController extends Controller {
    private userStreamers: Map<string, Streamer[]> = new Map();
    private guildStreamers: Map<string, Streamer[]> = new Map();
    private streamerChannel: Map<string, string> = new Map();
    private channelStreamer: Map<string, Streamer> = new Map();
    private allActiveStreamers: Set<Streamer> = new Set();

    constructor(client: Kasumi<any>) {
        super(client);
    }

    get activeStreamersArray() {
        return [...this.allActiveStreamers];
    }
    async returnStreamer(streamer: Streamer) {
        let sessions =
            (await this.client.config.getOne("arisa::session.ongoing")) || [];
        sessions = sessions.filter((v) => {
            return !(
                v.targetGuildId == streamer.TARGET_GUILD_ID &&
                v.targetChannelId == streamer.TARGET_CHANNEL_ID &&
                v.invitationAuthorId == streamer.INVITATION_AUTHOR_ID
            );
        });
        this.client.config.set("arisa::session.ongoing", sessions);
        this.channelStreamer.delete(streamer.TARGET_CHANNEL_ID);
        this.allActiveStreamers.delete(streamer);
        {
            const streamers = (
                this.userStreamers.get(streamer.INVITATION_AUTHOR_ID) || []
            ).filter((v) => v != streamer);
            this.userStreamers.set(streamer.INVITATION_AUTHOR_ID, streamers);
        }
        {
            const streamers = (
                this.guildStreamers.get(streamer.TARGET_GUILD_ID) || []
            ).filter((v) => v != streamer);
            this.guildStreamers.set(streamer.TARGET_GUILD_ID, streamers);
        }
        return true;
    }

    /**
     * Assign a streamer bot to a channel.
     *
     * Bot token is auto assigned.
     * @param channelId ChannelID
     */
    async joinChannel(
        guildId: string,
        channelId: string,
        authorId: string,
        textChannelId?: string
    ) {
        const streamer: Streamer = new LocalStreamer(
            guildId,
            channelId,
            authorId,
            this
        );
        this.allActiveStreamers.add(streamer);
        this.channelStreamer.set(channelId, streamer);
        {
            const streamers = this.userStreamers.get(authorId) || [];
            streamers.push(streamer);
            this.userStreamers.set(authorId, streamers);
        }
        {
            const streamers = this.guildStreamers.get(guildId) || [];
            streamers.push(streamer);
            this.guildStreamers.set(guildId, streamers);
        }
        const sessions =
            (await this.client.config.getOne("arisa::session.ongoing")) || [];
        sessions.push({
            targetChannelId: channelId,
            targetGuildId: guildId,
            invitationAuthorId: authorId,
            invitationTextChannelId: textChannelId,
        });
        this.client.config.set("arisa::session.ongoing", sessions);
        if (await streamer.connect()) return streamer;
    }

    async abortStream(channelId: string) {
        const streamer = this.getChannelStreamer(channelId);
        if (!streamer) return false;
        await streamer.disconnect(null);
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
