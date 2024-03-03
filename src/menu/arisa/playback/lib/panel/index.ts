import { ArisaStorage } from "init/type";
import Kasumi, { Card, MessageType } from "kasumi.js";
import { Controller, Streamer } from "menu/arisa/playback/type";
import { Time } from "menu/arisa/playback/lib/time";
import hash from 'object-hash';

interface PanelDetail {
    id: string,
    channelId: string
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
        const array = this.panelArray.map(v => v.id);
        return array.slice(-this.MAX_CONCURRENT_PANEL_NUMBER);
    }
    get panelChannelArray() {
        const array = [...new Set(this.panelArray.map(v => v.channelId))];
        return array.slice(-this.MAX_CONCURRENT_PANEL_NUMBER);
    }

    constructor(controller: Controller, streamer: Streamer, client: Kasumi<any>) {
        this.controller = controller;
        this.streamer = streamer;
        this.client = client;
        this.sessionId = hash((streamer.TARGET_CHANNEL_ID + streamer.STREAMER_TOKEN), { algorithm: 'sha256', encoding: 'hex', ignoreUnknown: true });

        this.client.events.button.registerActivator(`/control/${this.sessionId}/next`, async (event) => {
            await streamer.next();
        })
        this.client.events.button.registerActivator(`/control/${this.sessionId}/previous`, async (event) => {
            await streamer.previous();
        })
        this.client.events.button.registerActivator(`/control/${this.sessionId}/pause`, async (event) => {
            streamer.pause();
        })
        this.client.events.button.registerActivator(`/control/${this.sessionId}/resume`, async (event) => {
            streamer.resume();
        })
        this.client.events.button.registerActivator(`/control/${this.sessionId}/showqueue`, async (event) => {
            const card = new Card()
                .addTitle("正在播放");
            const queue = streamer.getQueue();
            if (streamer.nowPlaying) {
                card.addText(`${streamer.nowPlaying.meta.title} ${streamer.playbackStart ? `(font)${Time.timeToString((Date.now() - streamer.playbackStart) / 1000)} / (font)[secondary]` : ''}(font)${Time.timeToString(streamer.nowPlaying.meta.duration / 1000)}(font)[secondary]`)
                    .addContext(streamer.nowPlaying.meta.artists)
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
                        card
                            .addDivider()
                            .addText('**即将播放**')
                            .addText(`${song.meta.title} (font)${Time.timeToString(song.meta.duration / 1000)} (font)[secondary]`)
                            .addContext(song.meta.artists)
                        flg = false;
                    } else {
                        card
                            .addDivider()
                            .addText(`${song.meta.title} (font)${Time.timeToString(song.meta.duration / 1000)} (font)[secondary]`)
                            .addContext(song.meta.artists)
                    }
                }
                if (count < queue.length) {
                    card
                        .addDivider()
                        .addText(`...And ${queue.length - count} more`);
                }
            } else {
                card.addText("**播放列表为空**");
            }
            this.maintainPanel(card);
        })

        this.previousButton = this.client.events.button.createSession(`/control/${this.sessionId}/previous`, {});
        this.nextButton = this.client.events.button.createSession(`/control/${this.sessionId}/next`, {});
        this.pauseButton = this.client.events.button.createSession(`/control/${this.sessionId}/pause`, {});
        this.resumeButton = this.client.events.button.createSession(`/control/${this.sessionId}/resume`, {});
        this.showqueueButton = this.client.events.button.createSession(`/control/${this.sessionId}/showqueue`, {});

        this.maintainPanel();

        this.streamer.on('disconnect', () => {
            this.close();
        })
        this.streamer.on('play', () => { this.maintainPanel(); });
        this.streamer.on('connect', () => { this.maintainPanel(); });
        this.streamer.on('pause', () => { this.maintainPanel(); });
        this.streamer.on('resume', () => { this.maintainPanel(); });
    }


    addPanel(id: string, channelId: string) {
        this.panels.add({ id, channelId });
    }
    async newPanel(targetChannel: string): Promise<boolean> {
        if (this.panelChannelArray.includes(targetChannel)) {
            await Promise.all(this.panelArray.filter(v => v.channelId == targetChannel).map(v => this.deletePanel(v.id)));
        }
        const { err, data } = await this.client.API.message.create(MessageType.CardMessage, targetChannel, new Card());
        if (err) {
            this.client.logger.error(err);
            return false;
        }
        this.addPanel(data.msg_id, targetChannel);
        this.maintainPanel();
        return true;
    }
    async deletePanel(id: string) {
        const panel = this.panelArray.find(v => v.id == id);
        if (panel) {
            this.panels.delete(panel);
            await this.client.API.message.delete(panel.id);
        }
    }

    readonly MAINTAIN_INTERVAL = 5 * 1000;
    async maintainPanel(customCard?: Card) {
        if (Date.now() - this.lastMaintain < 500) return;
        clearTimeout(this.maintainCounter);
        const promises = this.panelMessageArray.map(id => this.client.API.message.update(id, customCard || this.toCard()));
        await Promise.all(promises);
        this.lastMaintain = Date.now();
        this.maintainCounter = setTimeout(() => {
            this.maintainPanel();
        }, this.MAINTAIN_INTERVAL)
    }
    private maintainCounter?: NodeJS.Timeout;
    private lastMaintain = -1;

    async close() {
        clearTimeout(this.maintainCounter);

        const promises = this.panelMessageArray.map(id => this.client.API.message.delete(id));
        await Promise.all(promises);

        this.panels.clear();

        this.client.events.button.removeActivator(`/control/${this.sessionId}/previous`);
        this.client.events.button.removeActivator(`/control/${this.sessionId}/next`);
        this.client.events.button.removeActivator(`/control/${this.sessionId}/pause`);
        this.client.events.button.removeActivator(`/control/${this.sessionId}/resume`);
        this.client.events.button.removeActivator(`/control/${this.sessionId}/showqueue`);
    }

    private previousButton;
    private nextButton;
    private pauseButton;
    private resumeButton;
    private showqueueButton;
    toCard(): Card {
        const upNext = this.streamer.getQueue().at(0);
        const card = new Card();
        card.addText("正在播放")
            .addTitle(this.streamer.nowPlaying?.meta.title || "无")
            .addContext(`下一首：${`${upNext?.meta.title} - ${upNext?.meta.artists}` || "无"}`)
            .addText(`${Time.timeToShortString(this.streamer.playedTime)}/${Time.timeToShortString(this.streamer.duration)}`);

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
                        content: "上一首"
                    }
                },
                this.streamer.isPaused() ? {
                    type: Card.Parts.AccessoryType.BUTTON,
                    theme: Card.Theme.WARNING,
                    click: Card.Parts.ButtonClickType.RETURN_VALUE,
                    value: JSON.stringify({ sessionId: this.resumeButton }),
                    text: {
                        type: Card.Parts.TextType.PLAIN_TEXT,
                        content: "继续"
                    }
                } : {
                    type: Card.Parts.AccessoryType.BUTTON,
                    theme: Card.Theme.SECONDARY,
                    click: Card.Parts.ButtonClickType.RETURN_VALUE,
                    value: JSON.stringify({ sessionId: this.pauseButton }),
                    text: {
                        type: Card.Parts.TextType.PLAIN_TEXT,
                        content: "暂停"
                    }
                },
                {
                    type: Card.Parts.AccessoryType.BUTTON,
                    theme: Card.Theme.PRIMARY,
                    click: Card.Parts.ButtonClickType.RETURN_VALUE,
                    value: JSON.stringify({ sessionId: this.nextButton }),
                    text: {
                        type: Card.Parts.TextType.PLAIN_TEXT,
                        content: "下一首"
                    }
                },
                {
                    type: Card.Parts.AccessoryType.BUTTON,
                    theme: Card.Theme.WARNING,
                    click: Card.Parts.ButtonClickType.RETURN_VALUE,
                    value: JSON.stringify({ sessionId: this.showqueueButton }),
                    text: {
                        type: Card.Parts.TextType.PLAIN_TEXT,
                        content: "查看队列"
                    }
                }
            ]
        })
        card.addDivider()
            .addContext(
                `也可使用[网页面板](${this.client.config.getSync("webuiUrl")})，功能更加完善\n` +
                "© 2023-2024 saltcute, the source code is distributed under the [MIT License](https://github.com/saltcute/kook-arisa/blob/main/LICENSE)"
            )
        return card;
    }
}