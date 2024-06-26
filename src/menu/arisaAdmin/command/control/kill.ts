import { BaseCommand, BaseSession, Card, CommandFunction, MessageType } from "kasumi.js";
import { controller } from "menu/arisa/playback/lib/index";
import { Time } from "menu/arisa/playback/lib/time";

interface KillDetail {
    /**
     * Streamer ID
     */
    id: string;
}

class AddCommand extends BaseCommand {
    name = 'kill';
    description = 'Kill a stream session.';
    func: CommandFunction<BaseSession, any> = async (session) => {
        const card = new Card();
        for (const streamer of controller.activeStreamersArray) {
            const sessionId = this.client.events.button.createSession('/admin/control/killSession', { id: streamer.kasumi.me.userId }, true);
            card.addTextWithButton(`**${streamer.kasumi.me.username}#${streamer.kasumi.me.identifyNum}** By: (met)${streamer.INVITATION_AUTHOR_ID}(met)
In ${streamer.TARGET_GUILD_ID}/${streamer.TARGET_CHANNEL_ID}
Audiences: ${streamer.audienceIds.size}
Streaming started at: ${new Date(streamer.streamStart).toLocaleString()}
Lasted: ${Time.timeToShortString((Date.now() - streamer.streamStart) / 1000)}`, {
                buttonContent: "Kill",
                theme: Card.Theme.DANGER,
                click: Card.Parts.ButtonClickType.RETURN_VALUE,
                value: JSON.stringify({ sessionId })
            })
        }
        await session.send(card);
    }
}

const kill = new AddCommand();

kill.on('ready', () => {
    kill.client.events.button.registerActivator('/admin/control/killSession', async (event, data: KillDetail) => {
        const user = await kill.client.middlewares.AccessControl.global.group.getUser(event.author);
        if (user.level > 2333) {
            const streamer = controller.getStreamerById(data.id);
            if (!streamer) {
                await kill.client.API.message.create(MessageType.MarkdownMessage, event.channelId, "Cannot find a streamer");
                await kill.client.API.message.update(event.targetMsgId, new Card().addText("Operation failed."))
                return;
            }
            await kill.client.API.message.create(MessageType.MarkdownMessage, event.channelId, "Enter note: ", undefined, event.authorId);
            const message = await kill.client.events.callback
                .createAsyncCallback("message.text", e => e.authorId == event.authorId, e => e.content, 15 * 1000)
                .catch(_ => undefined);
            await streamer.disconnect(`被管理员手动停止。${message ? `管理员附言：${message}` : ""}`);
            await kill.client.API.message.update(event.targetMsgId, new Card().addText("Operation completed."))
        } else {
            await kill.client.API.message.create(MessageType.MarkdownMessage, event.channelId, `Your user group (${user.name}) is not permitted to do this!`, undefined, event.authorId);
            await kill.client.API.message.update(event.targetMsgId, new Card().addText("Operation cancelled."))
        }
    })
})
export default kill;