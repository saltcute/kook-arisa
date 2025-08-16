import { ArisaStorage } from "init/type";
import Kasumi, { Card, MessageType } from "kasumi.js";
import { Controller, queueItem, Streamer } from "menu/arisa/playback/type";
import { Time } from "menu/arisa/playback/lib/time";
import hash from "object-hash";
import type { ArisaNote } from "menu/arisa/command/note";

interface PanelDetail {
    id: string;
    channelId: string;
    targetUsers: string[];
}

export class ButtonControlPanel {
    controller: Controller;
    streamer: Streamer;
    client: Kasumi<ArisaStorage>;
    sessionId: string;

    private panels: Set<PanelDetail> = new Set();
    private readonly MAX_CONCURRENT_PANEL_NUMBER = 2;
    get panelArray() {
        return [...this.panels];
    }
    get panelMessageArray() {
        const array = this.panelArray.map((v) => v.id);
        return array.slice(-this.MAX_CONCURRENT_PANEL_NUMBER);
    }
    get panelChannelArray() {
        const array = [...new Set(this.panelArray.map((v) => v.channelId))];
        return array.slice(-this.MAX_CONCURRENT_PANEL_NUMBER);
    }

    constructor(
        controller: Controller,
        streamer: Streamer,
        client: Kasumi<any>
    ) {
        this.controller = controller;
        this.streamer = streamer;
        this.client = client;
        this.sessionId = hash(
            streamer.TARGET_CHANNEL_ID + streamer.TARGET_GUILD_ID,
            { algorithm: "sha256", encoding: "hex", ignoreUnknown: true }
        );

        this.client.events.button.registerActivator(
            `/control/${this.sessionId}/next`,
            async () => {
                await streamer.next();
            }
        );
        this.client.events.button.registerActivator(
            `/control/${this.sessionId}/previous`,
            async () => {
                await streamer.previous();
            }
        );
        this.client.events.button.registerActivator(
            `/control/${this.sessionId}/pause`,
            async () => {
                streamer.pause();
            }
        );
        this.client.events.button.registerActivator(
            `/control/${this.sessionId}/resume`,
            async () => {
                streamer.resume();
            }
        );
        this.client.events.button.registerActivator(
            `/control/${this.sessionId}/showqueue`,
            async (event) => {
                const card = new Card().addTitle("正在播放");
                const queue = streamer.getQueue();
                if (streamer.nowPlaying) {
                    card.addText(
                        `${this.getTitle(streamer.nowPlaying)} ${
                            streamer.playbackStart
                                ? `(font)${Time.timeToString(
                                      streamer.playedTime
                                  )} / (font)[secondary]`
                                : ""
                        }(font)${Time.timeToString(
                            streamer.duration
                        )}(font)[secondary]`
                    ).addContext(streamer.nowPlaying.meta.artists);
                } else {
                    card.addText("无");
                }
                let flg = true;

                if (queue.length) {
                    let count = 0;
                    for (const song of queue) {
                        count++;
                        if (count > 6) break;
                        if (flg) {
                            card.addDivider()
                                .addText("**即将播放**")
                                .addText(
                                    `${this.getTitle(
                                        song
                                    )} (font)${Time.timeToString(
                                        song.meta.duration / 1000
                                    )} (font)[secondary]`
                                )
                                .addContext(song.meta.artists);
                            flg = false;
                        } else {
                            card.addDivider()
                                .addText(
                                    `${this.getTitle(
                                        song
                                    )} (font)${Time.timeToString(
                                        song.meta.duration / 1000
                                    )} (font)[secondary]`
                                )
                                .addContext(song.meta.artists);
                        }
                    }
                    if (count < queue.length) {
                        card.addDivider().addText(
                            `...And ${queue.length - count} more`
                        );
                    }
                } else {
                    card.addText("**播放列表为空**");
                }
                this.maintainPanel(true, card, [event.authorId]);
            }
        );

        this.previousButton = this.client.events.button.createSession(
            `/control/${this.sessionId}/previous`,
            {}
        );
        this.nextButton = this.client.events.button.createSession(
            `/control/${this.sessionId}/next`,
            {}
        );
        this.pauseButton = this.client.events.button.createSession(
            `/control/${this.sessionId}/pause`,
            {}
        );
        this.resumeButton = this.client.events.button.createSession(
            `/control/${this.sessionId}/resume`,
            {}
        );
        this.showqueueButton = this.client.events.button.createSession(
            `/control/${this.sessionId}/showqueue`,
            {}
        );

        this.maintainPanel();

        this.streamer.on("disconnect", () => {
            this.close();
        });
        this.streamer.on("play", () => {
            this.maintainPanel();
        });
        this.streamer.on("connect", () => {
            this.maintainPanel();
        });
        this.streamer.on("pause", () => {
            this.maintainPanel();
        });
        this.streamer.on("resume", () => {
            this.maintainPanel();
        });
    }

    addPanel(id: string, channelId: string, targetUsers: string[] = []) {
        this.panels.add({ id, channelId, targetUsers });
    }
    async newPanel(targetChannel: string): Promise<boolean> {
        if (this.panelChannelArray.includes(targetChannel)) {
            await Promise.all(
                this.panelArray
                    .filter((v) => v.channelId == targetChannel)
                    .map((v) => this.deletePanel(v.id))
            );
        }
        const { data: channel } = await this.client.API.channel.view(
            this.streamer.TARGET_CHANNEL_ID
        );
        const { data: link } = await this.client.API.invite.create({
            guildId: this.streamer.TARGET_GUILD_ID,
            channelId: this.streamer.TARGET_CHANNEL_ID,
        });
        const arisaNote: ArisaNote = require("menu/arisa/command/note").default;
        const { err, data } = await this.client.API.message.create(
            MessageType.CardMessage,
            targetChannel,
            new Card()
                .addText("正在播放")
                .addTitle("未知乐曲")
                .addText(
                    `加入${channel ? ` 🔈 ${link ? `[#${channel.name}](${link.url})` : `#${channel.name}`} ` : "语音频道"}以查看内容`
                )
                .addDivider()
                .addContext(
                    `发送 \`${this.client.plugin.primaryPrefix}${arisaNote.hierarchyName}\` 查看更新日志与帮助\n` +
                        `推荐使用[网页面板](${this.client.config.getSync("webuiUrl")})，功能更加完善。问题、建议→[KOOK服务器](https://kook.top/iOOsLu)\n`
                )
        );
        if (err) {
            this.client.logger.error(err);
            return false;
        }
        this.addPanel(data.msg_id, targetChannel);
        this.maintainPanel();
        return true;
    }
    async deletePanel(id: string) {
        const panel = this.panelArray.find((v) => v.id == id);
        if (panel) {
            this.panels.delete(panel);
            await this.client.API.message.delete(panel.id);
        }
    }

    readonly MAINTAIN_INTERVAL = 5 * 1000;
    readonly BOARDCAST_MAINTAIN_INTERVAL = 2 * 60 * 1000;
    async maintainPanel(
        temporary = true,
        customCard?: Card,
        targetUserOverride?: string[]
    ) {
        if (temporary) {
            if (this.maintain) {
                if (Date.now() - this.maintain.lastTime < 1000) return;
                clearTimeout(this.maintain.counter);
            }
        } else {
            if (this.boardcastMaintain) {
                if (Date.now() - this.boardcastMaintain.lastTime < 1000) return;
                clearTimeout(this.boardcastMaintain.counter);
            }
        }

        const promises: Promise<any>[] = [];

        if (temporary) {
            promises.push(
                ...this.panelMessageArray.flatMap((panelMessageId) =>
                    (targetUserOverride || [...this.streamer.audienceIds]).map(
                        (userId) =>
                            this.client.API.message.update(
                                panelMessageId,
                                customCard || this.toCard(),
                                undefined,
                                userId
                            )
                    )
                )
            );
        } else {
            promises.push(
                ...this.panelMessageArray.map((panelMessageId) =>
                    this.client.API.message.update(
                        panelMessageId,
                        customCard || this.toCard()
                    )
                )
            );
        }

        await Promise.all(promises);

        if (temporary) {
            this.maintain = {
                lastTime: Date.now(),
                counter: setTimeout(() => {
                    this.maintainPanel();
                }, this.MAINTAIN_INTERVAL),
            };
        } else {
            this.boardcastMaintain = {
                lastTime: Date.now(),
                counter: setTimeout(() => {
                    this.maintainPanel(false);
                }, this.BOARDCAST_MAINTAIN_INTERVAL),
            };
        }
    }
    private maintain?: {
        counter: NodeJS.Timeout;
        lastTime: number;
    };
    private boardcastMaintain?: {
        counter: NodeJS.Timeout;
        lastTime: number;
    };

    async close() {
        clearTimeout(this.maintain?.counter);
        clearTimeout(this.boardcastMaintain?.counter);

        const promises = this.panelMessageArray.map((id) =>
            this.client.API.message.delete(id)
        );
        await Promise.all(promises);

        this.panels.clear();

        this.client.events.button.removeActivator(
            `/control/${this.sessionId}/previous`
        );
        this.client.events.button.removeActivator(
            `/control/${this.sessionId}/next`
        );
        this.client.events.button.removeActivator(
            `/control/${this.sessionId}/pause`
        );
        this.client.events.button.removeActivator(
            `/control/${this.sessionId}/resume`
        );
        this.client.events.button.removeActivator(
            `/control/${this.sessionId}/showqueue`
        );
    }

    private getProgressBar(playedTime: number, duration: number) {
        const EMOJI_COUNT = 16;
        const dotPos = Math.floor((playedTime / duration) * EMOJI_COUNT) || 0;
        let res = "";
        for (let i = 0; i < EMOJI_COUNT; ++i) {
            if (i == 0) {
                if (dotPos == i)
                    res += this.client.config.getSync(
                        "arisa::config.assets.progress.start-dot"
                    );
                else
                    res += this.client.config.getSync(
                        "arisa::config.assets.progress.start"
                    );
            } else if (i == EMOJI_COUNT - 1) {
                if (dotPos == i)
                    res += this.client.config.getSync(
                        "arisa::config.assets.progress.end-dot"
                    );
                else
                    res += this.client.config.getSync(
                        "arisa::config.assets.progress.end"
                    );
            } else {
                if (dotPos == i)
                    res += this.client.config.getSync(
                        "arisa::config.assets.progress.bar-dot"
                    );
                else
                    res += this.client.config.getSync(
                        "arisa::config.assets.progress.bar"
                    );
            }
        }
        return res;
    }

    private getIcon(item?: queueItem) {
        if (!item) return "";
        let icon = "";
        switch (item.extra.type) {
            case "bilibili":
                icon = this.client.config.getSync(
                    "arisa::config.assets.logo.bilibili"
                );
                break;
            case "qqmusic":
                icon = this.client.config.getSync(
                    "arisa::config.assets.logo.qqmusic"
                );
                break;
            case "netease":
                icon = this.client.config.getSync(
                    "arisa::config.assets.logo.neteasecloud"
                );
                break;
            case "spotify":
                icon = this.client.config.getSync(
                    "arisa::config.assets.logo.spotify"
                );
                break;
        }
        return icon;
    }

    private getTitle(item?: queueItem, isWithIcon = true) {
        if (!item) return "无";
        const icon = this.getIcon(item);
        if (isWithIcon && icon) return `${icon} ${item.meta.title}`;
        else return item.meta.title;
    }

    private previousButton;
    private nextButton;
    private pauseButton;
    private resumeButton;
    private showqueueButton;
    toCard(): Card {
        const upNext = this.streamer.getQueue().at(0);
        const card = new Card();
        card.addText(`正在播放 ${this.getIcon(this.streamer.nowPlaying)}`)
            .addTitle(this.getTitle(this.streamer.nowPlaying, false))
            .addText(
                `(font)下一首：(font)[secondary]${
                    upNext
                        ? `${this.getIcon(upNext)} (font)${this.getTitle(
                              upNext,
                              false
                          )}${
                              upNext?.meta.artists
                                  ? ` - ${upNext?.meta.artists}`
                                  : ""
                          }(font)[secondary]`
                        : "(font)无(font)[secondary]"
                }`
            )
            .addContext(
                `${Time.timeToShortString(
                    this.streamer.playedTime
                )} ${this.getProgressBar(
                    this.streamer.playedTime,
                    this.streamer.duration
                )} ${Time.timeToShortString(this.streamer.duration)}`
            );

        card.addModule({
            type: Card.Modules.Types.ACTION_GROUP,
            elements: [
                {
                    type: Card.Parts.AccessoryType.BUTTON,
                    theme: Card.Theme.PRIMARY,
                    click: Card.Parts.ButtonClickType.RETURN_VALUE,
                    value: JSON.stringify({ sessionId: this.previousButton }),
                    text: {
                        type: Card.Parts.TextType.PLAIN_TEXT,
                        content: "上一首",
                    },
                },
                this.streamer.isPaused()
                    ? {
                          type: Card.Parts.AccessoryType.BUTTON,
                          theme: Card.Theme.WARNING,
                          click: Card.Parts.ButtonClickType.RETURN_VALUE,
                          value: JSON.stringify({
                              sessionId: this.resumeButton,
                          }),
                          text: {
                              type: Card.Parts.TextType.PLAIN_TEXT,
                              content: "继续",
                          },
                      }
                    : {
                          type: Card.Parts.AccessoryType.BUTTON,
                          theme: Card.Theme.SECONDARY,
                          click: Card.Parts.ButtonClickType.RETURN_VALUE,
                          value: JSON.stringify({
                              sessionId: this.pauseButton,
                          }),
                          text: {
                              type: Card.Parts.TextType.PLAIN_TEXT,
                              content: "暂停",
                          },
                      },
                {
                    type: Card.Parts.AccessoryType.BUTTON,
                    theme: Card.Theme.PRIMARY,
                    click: Card.Parts.ButtonClickType.RETURN_VALUE,
                    value: JSON.stringify({ sessionId: this.nextButton }),
                    text: {
                        type: Card.Parts.TextType.PLAIN_TEXT,
                        content: "下一首",
                    },
                },
                {
                    type: Card.Parts.AccessoryType.BUTTON,
                    theme: Card.Theme.WARNING,
                    click: Card.Parts.ButtonClickType.RETURN_VALUE,
                    value: JSON.stringify({ sessionId: this.showqueueButton }),
                    text: {
                        type: Card.Parts.TextType.PLAIN_TEXT,
                        content: "查看队列",
                    },
                },
            ],
        });
        const arisaNote: ArisaNote = require("menu/arisa/command/note").default;
        card.addDivider().addContext(
            `发送 \`${this.client.plugin.primaryPrefix}${arisaNote.hierarchyName}\` 查看更新日志与帮助\n` +
                `推荐使用[网页面板](${this.client.config.getSync("webuiUrl")})，功能更加完善。问题、建议→[KOOK服务器](https://kook.top/iOOsLu)\n`
        );
        return card;
    }
}
