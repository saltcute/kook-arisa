import { client } from "init/client";
import { controller } from ".";
import playlist from "./playback/lib/playlist";
import { Card, MessageType } from "kasumi.js";
import { ButtonControlPanel } from "./playback/lib/panel/index";
import leaveCommand from 'menu/arisa/command/leave'

interface userLeaveVoiceChannelEventExtra {
    type: 'exited_channel',
    body: {
        user_id: string,
        channel_id: string,
        exited_at: number
    }
}
interface userJoinVoiceChannelEventExtra {
    type: 'joined_channel',
    body: {
        user_id: string,
        channel_id: string,
        joined_at: number
    }
}
client.on('event.system', async (event) => {
    if (event.rawEvent.extra.type == 'exited_channel') { // User leaves voice channel
        const extra: userLeaveVoiceChannelEventExtra = event.rawEvent.extra;
        const streamer = controller.getChannelStreamer(extra.body.channel_id);
        if (streamer) { // has arisa
            if (extra.body.user_id == streamer.kasumi.me.userId) {
                if (streamer.panel) {
                    const promises = streamer.panel.panelChannelArray.map(id => client.API.message.create(MessageType.CardMessage, id, new Card().addTitle("Notice | 注意").addText("机器人被动断开连接，机器人可能被踢出语音频道或经历了网络波动。如需结束推流，请使用指令 `/arisa leave` 停止点歌，不要将机器人直接踢出语音频道。")));
                    await Promise.all(promises);
                }
                await streamer.disconnect("机器人被动断开连接，正在重连…");
                const textChannelId = streamer.panel?.panelChannelArray[0]
                const newStreamer = await controller.joinChannel(streamer.TARGET_GUILD_ID, streamer.TARGET_CHANNEL_ID, streamer.INVITATION_AUTHOR_ID, textChannelId);
                if (newStreamer) {
                    await playlist.user.restore(newStreamer, newStreamer.INVITATION_AUTHOR_ID).catch((e) => { client.logger.error(e) });
                    if (textChannelId) {
                        await client.API.message.create(MessageType.CardMessage, textChannelId, new Card().addText(`(met)${newStreamer.kasumi.me.userId}(met) 已恢复推流。\n播放结束时，请使用 \`${client.plugin.primaryPrefix}${leaveCommand.hierarchyName}\`结束推流。机器人在频道内无其他用户时也会自动停止。`));
                        newStreamer.panel = new ButtonControlPanel(controller, newStreamer, controller.client)
                        await newStreamer.panel.newPanel(textChannelId);
                    }

                    if (newStreamer.audienceIds.size <= 0) await newStreamer.disconnect("语音频道内无用户");
                }
            } else {
                streamer.audienceIds.delete(extra.body.user_id);
                if (streamer.INVITATION_AUTHOR_ID == extra.body.user_id) {
                    playlist.user.save(streamer, extra.body.user_id);
                }
                if (!streamer.audienceIds.size) { // No audiences left
                    streamer.disconnect("语音频道内无用户");
                }
            }
        }
    } else if (event.rawEvent.extra.type == 'joined_channel') { // User joins voice channel
        const extra: userJoinVoiceChannelEventExtra = event.rawEvent.extra;
        const streamer = controller.getChannelStreamer(extra.body.channel_id);
        if (streamer) {
            if (extra.body.user_id != streamer.kasumi.me.userId) streamer.audienceIds.add(extra.body.user_id);
        }
    }
});