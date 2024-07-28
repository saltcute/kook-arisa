import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu from "menu/arisa";
import fs from "fs";
import upath from "upath";

export class ArisaNote extends BaseCommand {
    name = "note";
    description = "查看公告与帮助";
    private static _events: {
        title: string;
        timestamp: number;
        content: string;
        disabled?: boolean;
    }[] = [];
    static loadEvents() {
        ArisaNote._events = JSON.parse(
            fs.readFileSync(upath.join(__dirname, "events.json"), {
                encoding: "utf8",
            })
        );
    }
    static get events() {
        return this._events.filter((v) => !v.disabled);
    }
    static get eventSize() {
        return this.events.length;
    }
    static getPage(page: number) {
        return this.events[this.events.length - page];
    }
    static getCard(pageNumber: number) {
        let page = ArisaNote.getPage(pageNumber);
        while (
            pageNumber >= 1 &&
            pageNumber <= ArisaNote.eventSize &&
            (!page || page?.disabled)
        ) {
            pageNumber++;
            page = ArisaNote.getPage(pageNumber);
        }
        const card = new Card();
        if (!page) {
            card.addTitle("没有找到帮助信息").addModule({
                type: Card.Modules.Types.ACTION_GROUP,
                elements: [
                    {
                        type: Card.Parts.AccessoryType.BUTTON,
                        theme: Card.Theme.PRIMARY,
                        text: {
                            type: Card.Parts.TextType.KMARKDOWN,
                            content: "返回",
                        },
                        click: Card.Parts.ButtonClickType.RETURN_VALUE,
                        value: JSON.stringify({
                            sessionId: client.events.button.createSession(
                                "note.showPage",
                                { targetPage: 1, currentPage: pageNumber },
                                true
                            ),
                        }),
                    },
                ],
            });
        } else {
            card.addTitle(page.title)
                .addContext(
                    `发布时间：${new Date(page.timestamp).toLocaleString("zh-CN", { timeZone: "America/Toronto", hour12: true, dateStyle: "full", timeStyle: "full" })}`
                )
                .addText(page.content)
                .addModule({
                    type: Card.Modules.Types.ACTION_GROUP,
                    elements: [
                        {
                            type: Card.Parts.AccessoryType.BUTTON,
                            text: {
                                type: Card.Parts.TextType.KMARKDOWN,
                                content: "上一页",
                            },
                            theme:
                                pageNumber > 1
                                    ? Card.Theme.PRIMARY
                                    : Card.Theme.SECONDARY,
                            click:
                                pageNumber > 1
                                    ? Card.Parts.ButtonClickType.RETURN_VALUE
                                    : undefined,
                            value:
                                pageNumber > 1
                                    ? JSON.stringify({
                                          sessionId:
                                              client.events.button.createSession(
                                                  "note.showPage",
                                                  {
                                                      targetPage:
                                                          pageNumber - 1,
                                                      currentPage: pageNumber,
                                                  },
                                                  true
                                              ),
                                      })
                                    : undefined,
                        },
                        {
                            type: Card.Parts.AccessoryType.BUTTON,
                            text: {
                                type: Card.Parts.TextType.KMARKDOWN,
                                content: "下一页",
                            },
                            theme:
                                pageNumber < ArisaNote.events.length
                                    ? Card.Theme.PRIMARY
                                    : Card.Theme.SECONDARY,
                            click:
                                pageNumber < ArisaNote.events.length
                                    ? Card.Parts.ButtonClickType.RETURN_VALUE
                                    : undefined,
                            value:
                                pageNumber < ArisaNote.events.length
                                    ? JSON.stringify({
                                          sessionId:
                                              client.events.button.createSession(
                                                  "note.showPage",
                                                  {
                                                      targetPage:
                                                          pageNumber + 1,
                                                      currentPage: pageNumber,
                                                  },
                                                  true
                                              ),
                                      })
                                    : undefined,
                        },
                        {
                            type: Card.Parts.AccessoryType.BUTTON,
                            text: {
                                type: Card.Parts.TextType.KMARKDOWN,
                                content: `第 ${pageNumber} 页 / 共 ${ArisaNote.eventSize} 页`,
                            },
                            theme: Card.Theme.SECONDARY,
                        },
                    ],
                });
        }
        return card;
    }
    func: CommandFunction<BaseSession, any> = async (session) => {
        const arg = session.args[0];
        let page = parseInt(arg);
        if (isNaN(page)) page = 1;
        ArisaNote.loadEvents();
        await session.reply(ArisaNote.getCard(page));
    };
}
ArisaNote.loadEvents();

client.events.button.registerActivator(
    "note.showPage",
    async (
        event,
        data: {
            targetPage: number;
            currentPage: number;
        }
    ) => {
        await client.API.message.update(
            event.targetMsgId,
            ArisaNote.getCard(data.targetPage)
        );
    }
);

const arisaNote = new ArisaNote();
export default arisaNote;
menu.addCommand(arisaNote);
