import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu from "..";
import { isAdmin } from "../common";

class AppCommand extends BaseCommand {
    name = 'ping';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!isAdmin(session.authorId)) {
            return session.reply("You do not have the permission to use this command")
        }
        const remoteOrigin = session.event.timestamp;
        const localOrigin = Date.now();
        session.send([new Card()
            .addModule({
                "type": "section",
                "text": {
                    "type": "paragraph",
                    "cols": 2,
                    "fields": [
                        {
                            "type": "kmarkdown",
                            "content": `**LocalOrigin**\n(font)${localOrigin}(font)[success]`
                        },
                        {
                            "type": "kmarkdown",
                            "content": `**RemoteOrigin**\n(font)${remoteOrigin}(font)[primary]`
                        },
                        {
                            "type": "kmarkdown",
                            "content": `**LocalResponse**\n(font)N/A(font)[secondary]`
                        },
                        {
                            "type": "kmarkdown",
                            "content": `**RemoteResponse**\n(font)N/A(font)[secondary]`
                        }
                    ]
                }
            })]).then(({ err, data: res }) => {
                const localResponse = Date.now()
                if (res) {
                    const remoteReponse = res.msg_timestamp;
                    const messageId = res.msg_id;
                    if (messageId && remoteReponse) {
                        const localLatency = localResponse - localOrigin;
                        const remoteLatency = remoteReponse - remoteOrigin;
                        const originDiff = Math.abs(localOrigin - remoteOrigin);
                        const responseDiff = Math.abs(localResponse - remoteReponse);
                        const colorizeLatencyString = (time: number): string => {
                            return `(font)${time}ms(font)[${time > 1000 ? "danger" : time > 500 ? "warning" : "primary"}]`;
                        }
                        session.update(messageId, [new Card()
                            .addModule({
                                "type": "section",
                                "text": {
                                    "type": "paragraph",
                                    "cols": 2,
                                    "fields": [
                                        {
                                            "type": "kmarkdown",
                                            "content": `**LocalOrigin**\n(font)${localOrigin}(font)[success]`
                                        },
                                        {
                                            "type": "kmarkdown",
                                            "content": `**RemoteOrigin**\n(font)${remoteOrigin}(font)[primary]`
                                        },
                                        {
                                            "type": "kmarkdown",
                                            "content": `**LocalResponse**\n(font)${localResponse}(font)[pink]`
                                        },
                                        {
                                            "type": "kmarkdown",
                                            "content": `**RemoteResponse**\n(font)${remoteReponse}(font)[purple]`
                                        }
                                    ]
                                }
                            })
                            .addDivider()
                            .addText(`localLatency: ${colorizeLatencyString(localLatency)}`)
                            .addText(`remoteLatency: ${colorizeLatencyString(remoteLatency)}`)
                            .addText(`originDiff: ${colorizeLatencyString(originDiff)}`)
                            .addText(`repsonseDiff: ${colorizeLatencyString(responseDiff)}`)
                        ])
                    }
                }
            })
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);


