import { BaseCommand, BaseSession, Card, CommandFunction, MessageType } from "kasumi.js";
import { controller } from "menu/arisa/playback/lib/index";
import { Time } from "menu/arisa/playback/lib/time";


class MessageCommand extends BaseCommand {
    name = 'single';
    description = 'Send a message to a streamer (and its users).';
    func: CommandFunction<BaseSession, any> = async (session: { send: (arg0: Card) => any; }) => {
        const card = new Card();
        for (const streamer of controller.activeStreamersArray) {
            const sessionId = this.client.events.button.createSession('/admin/control/messageSession', { id: streamer.kasumi.me.userId }, true);
            card.addTextWithButton(`**${streamer.kasumi.me.username}#${streamer.kasumi.me.identifyNum}** By: (met)${streamer.INVITATION_AUTHOR_ID}(met)
In ${streamer.TARGET_GUILD_ID}/${streamer.TARGET_CHANNEL_ID}
Audiences: ${streamer.audienceIds.size}
Streaming started at: ${new Date(streamer.streamStart).toLocaleString()}
Lasted: ${Time.timeToShortString((Date.now() - streamer.streamStart) / 1000)}`, {
                buttonContent: "message",
                theme: Card.Theme.PRIMARY,
                click: Card.Parts.ButtonClickType.RETURN_VALUE,
                value: JSON.stringify({ sessionId })
            })
        }
        await session.send(card);
    }
}

const message = new MessageCommand();

message.on('ready', () => {
    message.client.events.button.registerActivator('/admin/control/messageSession', async (event: { author: any; channelId: any; targetMsgId: any; authorId: any; }, data: { id: string; }) => {
        const user = await message.client.middlewares.AccessControl.global.group.getUser(event.author);
        if (user.level > 2333) {
            const streamer = controller.getStreamerById(data.id);
            if (!streamer) {
                await message.client.API.message.create(MessageType.MarkdownMessage, event.channelId, "Cannot find a streamer");
                await message.client.API.message.update(event.targetMsgId, new Card().addText("Operation failed."))
                return;
            }
            await message.client.API.message.create(MessageType.MarkdownMessage, event.channelId, "Enter message: ", undefined, event.authorId);
            const msg = await message.client.events.callback
                .createAsyncCallback("message.text", (e: { authorId: any; }) => e.authorId == event.authorId, (e: { content: any; }) => e.content, 15 * 1000)
                .catch((_: any) => undefined);
            if (streamer) {
                if (streamer.panel) {
                    await Promise
                        .all(streamer.panel?.panelChannelArray
                            .map(v => message.client.API.message
                                .create(MessageType.MarkdownMessage, v, `管理员向此发送了一条消息：${msg}`)
                            )
                        );
                }
            }
            await message.client.API.message.update(event.targetMsgId, new Card().addText("Operation completed."))
        } else {
            await message.client.API.message.create(MessageType.MarkdownMessage, event.channelId, `Your user group (${user.name}) is not permitted to do this!`, undefined, event.authorId);
            await message.client.API.message.update(event.targetMsgId, new Card().addText("Operation cancelled."))
        }
    })
})
export default message;