import { BaseCommand, BaseSession, CommandFunction, MessageType } from "kasumi.js";
import { controller } from "menu/arisa";

class AddCommand extends BaseCommand {
    name = 'broadcast';
    description = 'Broadcast';
    func: CommandFunction<BaseSession, any> = async (session) => {
        await session.sendTemp("Enter message:")
        const message = await broadcast.client.events.callback
            .createAsyncCallback("message.text", e => e.authorId == session.authorId, e => e.content, 15 * 1000)
            .catch(_ => undefined);
        for (const streamer of controller.activeStreamersArray) {
            if (streamer.panel) {
                await Promise
                    .all(streamer.panel?.panelChannelArray
                        .map(v => this.client.API.message
                            .create(MessageType.MarkdownMessage, v, `管理员发送了一条广播消息：${message}`)
                        )
                    );
            }
        }
    }
}

const broadcast = new AddCommand();

export default broadcast;