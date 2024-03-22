import { client } from "init/client";
import axios from "axios";
import crypto from 'crypto';
import Kasumi, { Card, MessageType } from "kasumi.js";
import { Streamer } from "../type";
import { LocalStreamer } from "./player";
import { Controller } from "../type";

class JoinChannelError extends Error {
    constructor(step: number | string, message: string, public err: unknown) {
        super(`Failed to join channel at step ${step}. ${message}`);
    }
}

export class LocalController extends Controller {
    private userStreamers: Map<string, Streamer[]> = new Map();
    private guildStreamers: Map<string, Streamer[]> = new Map();
    private streamerChannel: Map<string, string> = new Map();
    private streamerIdToInstance: Map<string, Streamer> = new Map();
    private channelStreamer: Map<string, Streamer> = new Map();
    private allActiveStreamers: Set<Streamer> = new Set();

    constructor(client: Kasumi<any>) {
        super(client);

        this.loadStreamer();
    }

    private streamerPool: string[] = [];
    get allStreamerTokens() {
        return this.streamerPool;
    }
    private availableStreamers: string[] = [];
    get allAvailableStreamersTokens() {
        return this.availableStreamers;
    }

    get activeStreamersArray() {
        return [...this.allActiveStreamers];
    }

    loadStreamer() {
        try {
            const config: string[] = client.config.getSync("streamers");
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
        let sessions = await this.client.config.getOne("arisa::session.ongoing") || [];
        sessions = sessions.filter(v => {
            return !(v.targetGuildId == streamer.TARGET_GUILD_ID &&
                v.targetChannelId == streamer.TARGET_CHANNEL_ID &&
                v.invitationAuthorId == streamer.INVITATION_AUTHOR_ID)
        })
        this.client.config.set("arisa::session.ongoing", sessions);
        // const { err } = await streamer.kasumi.API.guild.leave(streamer.TARGET_GUILD_ID);
        // if (err) streamer.kasumi.logger.error(err);
        await axios.delete(`https://www.kookapp.cn/api/v2/users/guild/${streamer.TARGET_GUILD_ID}`, {
            headers: {
                Authorization: (await client.config.getOne("streamerMiddlemanToken")).toString()
            }
        }).catch((e) => {
            streamer.kasumi.logger.error("Middleman cannot leave the server");
            streamer.kasumi.logger.error(e);
        });
        this.streamerIdToInstance.delete(streamer.kasumi.me.userId);
        this.streamerChannel.delete(streamer.STREAMER_TOKEN);
        this.channelStreamer.delete(streamer.TARGET_CHANNEL_ID);
        if (this.streamerPool.includes(streamer.STREAMER_TOKEN)) {
            this.availableStreamers.push(streamer.STREAMER_TOKEN);
        } {
            const streamers = (this.userStreamers.get(streamer.INVITATION_AUTHOR_ID) || []).filter(v => v != streamer);
            this.userStreamers.set(streamer.INVITATION_AUTHOR_ID, streamers);
        } {
            const streamers = (this.guildStreamers.get(streamer.TARGET_GUILD_ID) || []).filter(v => v != streamer);
            this.guildStreamers.set(streamer.TARGET_GUILD_ID, streamers);
        }
        this.allActiveStreamers.delete(streamer);
        return true;
    }
    private getRandomNickname() {
        if (this.isAprilFools()) {
            return `${this.aprilFoolsTempStringGenerator()} Arisa`;
        }
        return `Arisa Type ${this.tempStringGenerator(6)} `
    }
    private tempStringGenerator(length: number) {
        const dictionary: string[] = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        let res = "";
        for (let i = 0; i < length; ++i) {
            res += this.getRandomFromArray(dictionary);
        }
        return res;
    }
    private isAprilFools() {
        const date = new Date();
        return date.getMonth() === 4 && date.getDate() === 1;
    }
    private getRandomFromArray(arr: any[]) {
        return arr[crypto.randomInt(arr.length)];
    }
    private aprilFoolsTempStringGenerator() {
        const prefix: string[] = ["传统", "赛博", "拆腻子", "背叛", "超级自我"];
        const affix: string[] = ["丁真", "王源", "昊京", "弗拉夫", "席蓝"];
        return this.getRandomFromArray(prefix) + this.getRandomFromArray(affix);
    }

    /**
     * Assign a streamer bot to a channel.
     * 
     * Bot token is auto assigned.
     * @param channelId ChannelID
     */
    async joinChannel(guildId: string, channelId: string, authorId: string, textChannelId?: string) {
        const STREAMER_TOKEN = this.getNextAvailableStreamer();
        if (!STREAMER_TOKEN) return;

        const streamer: Streamer = new LocalStreamer(STREAMER_TOKEN, guildId, channelId, authorId, this);
        try {
            const { err, data } = await streamer.kasumi.API.user.me();
            if (err) throw new JoinChannelError(1, "Cannot fetch streamer profile.", err);
            let tempRoleId; {
                (await axios.post('https://www.kookapp.cn/api/v2/guilds/join', {
                    id: guildId
                }, {
                    headers: {
                        Authorization: (await client.config.getOne("streamerMiddlemanToken")).toString()
                    }
                }).catch((e) => {
                    throw new JoinChannelError(2, "Middleman is not able to join the server.", e);
                }));

            }
            const streamerId = data.id, streamerClientId = data.client_id; {
                const { err, data } = await client.API.guild.role.create(guildId, this.getRandomNickname());
                if (err) throw new JoinChannelError(3, "Cannot create temp role for middleman.", err);
                tempRoleId = data.role_id;
            } {
                const { err } = await client.API.guild.role.update(guildId, tempRoleId, { permissions: 1 });
                if (err) throw new JoinChannelError(4, "Cannot assing permission to temp role for middleman.", err);
            } {
                const { err } = await client.API.guild.role.grant(guildId, tempRoleId, (await client.config.getOne("streamerMiddlemanID")).toString());
                if (err) throw new JoinChannelError(5, "Cannot grant temp role to middleman.", err);
            } {
                const { err } = await streamer.kasumi.API.guild.nickname(guildId, this.getRandomNickname());
                if (err) {
                    if (textChannelId) {
                        const e = new JoinChannelError("6-1", "Cannot change nickname for streamer.", err)
                        const card = new Card()
                            .addText(`错误信息：${e} `)
                            .addText(`\`\`\`plain\n${e.err}\n\`\`\``);
                        await client.API.message.create(MessageType.CardMessage, textChannelId, card)
                    }
                    (await axios.post(`https://www.kookapp.cn/api/oauth2/authorize?response_type=code&client_id=${streamerClientId}&state=123&scope=bot&permissions=0&guild_id=${guildId}&redirect_uri=`, {}, {
                        headers: {
                            Cookie: `auth=${(await client.config.get("streamerMiddlemanToken")).streamerMiddlemanToken}`
                        }
                    }).catch((e) => {
                        throw new JoinChannelError("6-2", "Middleman is not able to join the server.", e);
                    }));
                }
            }
            {
                const { err } = await client.API.guild.role.delete(guildId, tempRoleId);
                if (err) throw new JoinChannelError(7, "Cannot delete temp role for middleman.", err);
            } {
                const { err } = await client.API.channel.permission.createUser(channelId, streamerId);
                if (err) throw new JoinChannelError(8, "Cannot assign channel permission to streamer.", err);
            } {
                const { err } = await client.API.channel.permission.updateUser(channelId, streamerId, 1 << 15);
                if (err) throw new JoinChannelError(9, "Cannot update permission for streamer.", err);
            } {
                const { err } = await client.API.channel.permission.createUser(channelId, client.me.userId);
                if (err) throw new JoinChannelError(10, "Cannot assign channel permission to bot.", err);
            } {
                const { err } = await client.API.channel.permission.updateUser(channelId, client.me.userId, 1 << 11);
                if (err) throw new JoinChannelError(11, "Cannot update permission for bot.", err);
            }
            this.streamerIdToInstance.set(streamerId, streamer);
            this.streamerChannel.set(STREAMER_TOKEN, channelId);
            this.allActiveStreamers.add(streamer);
            this.channelStreamer.set(channelId, streamer); {
                const streamers = this.userStreamers.get(authorId) || [];
                streamers.push(streamer);
                this.userStreamers.set(authorId, streamers);
            } {
                const streamers = this.guildStreamers.get(guildId) || [];
                streamers.push(streamer);
                this.guildStreamers.set(guildId, streamers);
            }
            const sessions = await this.client.config.getOne("arisa::session.ongoing") || [];
            sessions.push({
                targetChannelId: channelId,
                targetGuildId: guildId,
                invitationAuthorId: authorId,
                invitationTextChannelId: textChannelId
            })
            this.client.config.set("arisa::session.ongoing", sessions);
            return streamer.connect();
        } catch (err: JoinChannelError | unknown) {
            if (textChannelId) {
                const card = new Card()
                    .addTitle("无法加入语音频道")
                    .addText("可能原因：由于近期 KOOK 的 API 变化，机器人需要拥有「管理员」权限才能正常运行。");
                if (err instanceof JoinChannelError) {
                    card.addText(`错误信息：${err}`)
                        .addText(`\`\`\`plain\n${err.err}\n\`\`\``);
                }
                await client.API.message.create(MessageType.CardMessage, textChannelId, card)
            }
            streamer.kasumi.logger.error(err);
            await streamer.disconnect(null);
            return;
        }
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

    getStreamerById(id: string): Streamer | undefined {
        return this.streamerIdToInstance.get(id);
    }
}