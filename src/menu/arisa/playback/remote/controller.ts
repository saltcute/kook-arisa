import { client } from "init/client";
import * as fs from "fs";
import upath from "upath";
import axios from "axios";
import crypto from "crypto";
import Kasumi, { Card, MessageType } from "kasumi.js";
import { Streamer } from "../type";
import { LocalStreamer } from "../local/player";
import { Controller } from "../type";

export class RemoteController extends Controller {
    private userStreamers: Map<string, Streamer[]> = new Map();
    private guildStreamers: Map<string, Streamer[]> = new Map();
    private streamerChannel: Map<string, string> = new Map();
    private channelStreamer: Map<string, Streamer> = new Map();
    private allStreamers: Set<Streamer> = new Set();

    private streamerPool: string[] = [];
    get allStreamerTokens() {
        return this.streamerPool;
    }
    private availableStreamers: string[] = [];
    get allAvailableStreamersTokens() {
        return this.availableStreamers;
    }

    get getAllStreamers() {
        return [...this.allStreamers];
    }

    loadStreamer() {
        try {
            const config: string[] = JSON.parse(
                fs.readFileSync(
                    upath.join(
                        __dirname,
                        "..",
                        "..",
                        "..",
                        "config",
                        "streamer.json"
                    ),
                    { encoding: "utf-8" }
                )
            ).streamers;
            let newPool: string[] = [],
                newAvailable: string[] = [];
            for (const token of config) {
                newPool.push(token);
                if (this.streamerPool.includes(token)) {
                    // Duplicate
                    if (this.availableStreamers.includes(token)) {
                        // Available
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
                client.logger.fatal(
                    "No streamer available. Arisa is shutting down!"
                );
                process.exit(0);
            }
        }
    }

    private getNextAvailableStreamer(): string | undefined {
        if (this.availableStreamers.length) {
            return this.availableStreamers.pop();
        } else return undefined;
    }

    async returnStreamer(streamer: Streamer) {
        // const { err } = await streamer.kasumi.API.guild.leave(streamer.TARGET_GUILD_ID);
        // if (err) streamer.kasumi.logger.error(err);
        await axios
            .delete(
                `https://www.kookapp.cn/api/v2/users/guild/${streamer.TARGET_GUILD_ID}`,
                {
                    headers: {
                        Authorization: (
                            await client.config.getOne("streamerMiddlemanToken")
                        ).toString(),
                    },
                }
            )
            .catch((e) => {
                streamer.kasumi.logger.error(
                    "Middleman cannot leave the server"
                );
                streamer.kasumi.logger.error(e);
            });
        this.streamerChannel.delete(streamer.STREAMER_TOKEN);
        this.channelStreamer.delete(streamer.TARGET_CHANNEL_ID);
        if (this.streamerPool.includes(streamer.STREAMER_TOKEN)) {
            this.availableStreamers.push(streamer.STREAMER_TOKEN);
        }
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
        this.allStreamers.delete(streamer);
        return true;
    }

    private tempStringGenerator(length: number) {
        const database = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let res = "";
        for (let i = 0; i < length; ++i) {
            res += database[crypto.randomInt(database.length)];
        }
        return res;
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
        textChannelId: string
    ) {
        const STREAMER_TOKEN = this.getNextAvailableStreamer();
        if (!STREAMER_TOKEN) return;

        const streamer: Streamer = new LocalStreamer(
            STREAMER_TOKEN,
            guildId,
            channelId,
            authorId,
            this
        );
        try {
            const { err, data } = await streamer.kasumi.API.user.me();
            if (err) throw err;
            let tempRoleId;
            {
                const res: true | axios.AxiosResponse = await axios
                    .post(
                        "https://www.kookapp.cn/api/v2/guilds/join",
                        {
                            id: guildId,
                        },
                        {
                            headers: {
                                Authorization: (
                                    await client.config.getOne(
                                        "streamerMiddlemanToken"
                                    )
                                ).toString(),
                            },
                        }
                    )
                    .catch((e) => {
                        return true;
                    });
                if (res === true)
                    throw "Middleman is not able to join the server.";
            }
            const streamerId = data.id,
                streamerClientId = data.client_id;
            {
                const { err, data } = await client.API.guild.role.create(
                    guildId,
                    `Arisa TEMP Role ${this.tempStringGenerator(6)}`
                );
                if (err) throw err;
                tempRoleId = data.role_id;
            }
            {
                const { err } = await client.API.guild.role.update(
                    guildId,
                    tempRoleId,
                    { permissions: 1 }
                );
                if (err) throw err;
            }
            {
                const { err } = await client.API.guild.role.grant(
                    guildId,
                    tempRoleId,
                    (
                        await client.config.getOne("streamerMiddlemanID")
                    ).toString()
                );
                if (err) throw err;
            }
            {
                const { err } = await streamer.kasumi.API.guild.nickname(
                    guildId,
                    `Arisa STRMR ${this.tempStringGenerator(6)}`
                );
                if (err) {
                    const data = await axios
                        .post(
                            `https://www.kookapp.cn/api/oauth2/authorize?response_type=code&client_id=${streamerClientId}&state=123&scope=bot&permissions=0&guild_id=${guildId}&redirect_uri=`,
                            {},
                            {
                                headers: {
                                    Cookie: `auth=${(await client.config.get("streamerMiddlemanToken")).streamerMiddlemanToken}`,
                                },
                            }
                        )
                        .catch(() => {
                            return true;
                        });
                    if (data === true) {
                        throw "Middleman is not able to invite streamer to the server.";
                    }
                }
            }
            {
                const { err } = await client.API.guild.role.delete(
                    guildId,
                    tempRoleId
                );
                if (err) throw err;
            }
            {
                const { err } = await client.API.channel.permission.createUser(
                    channelId,
                    streamerId
                );
                if (err) throw err;
            }
            {
                const { err } = await client.API.channel.permission.updateUser(
                    channelId,
                    streamerId,
                    1 << 15
                );
                if (err) throw err;
            }
            {
                const { err } = await client.API.channel.permission.createUser(
                    channelId,
                    client.me.userId
                );
                if (err) throw err;
            }
            {
                const { err } = await client.API.channel.permission.updateUser(
                    channelId,
                    client.me.userId,
                    1 << 11
                );
                if (err) throw err;
            }
            this.streamerChannel.set(STREAMER_TOKEN, channelId);
            this.allStreamers.add(streamer);
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
            return streamer.connect();
        } catch (err) {
            client.API.message.create(
                MessageType.CardMessage,
                textChannelId,
                new Card()
                    .addTitle("无法加入语音频道")
                    .addText(
                        "由于近期 KOOK 的 API 变化，机器人需要拥有「管理员」权限才能正常运行。"
                    )
            );
            streamer.kasumi.logger.error(err);
            streamer.disconnect(null);
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
        return undefined;
    }
}
