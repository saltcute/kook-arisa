import { client } from "init/client";
import { BaseCommand, BaseMenu, BaseSession } from "kasumi.js";
import upath from "upath";
import * as fs from "fs";
import { Streamer } from "./playback/type";
import "./naturalCommands";
import playlist from "menu/arisa/playback/lib/playlist";
import { Card, MessageType } from "kasumi.js";
import { ButtonControlPanel } from "menu/arisa/playback/lib/panel/index";

class AppMenu extends BaseMenu {
    name = "arisa";
}

const menu = new AppMenu();
export default menu;
client.plugin.load(menu);

import "./event";

const basicPath = upath.join(__dirname, "command");
const commands = fs.readdirSync(basicPath);
for (const command of commands) {
    try {
        require(upath.join(basicPath, command));
    } catch (e) {
        menu.logger.error("Error loading command");
        menu.logger.error(e);
    }
}

export async function getChannelStreamer(
    guildId: string,
    authorId: string
): Promise<Streamer> {
    let joinedChannel;
    for await (const { err, data } of client.API.channel.user.joinedChannel(
        guildId,
        authorId
    )) {
        if (err) {
            throw { err: "network_failure", msg: "获取频道失败" };
        }
        for (const channel of data.items) {
            joinedChannel = channel;
            break;
        }
        if (joinedChannel) break;
    }
    if (joinedChannel) {
        const streamer = controller.getChannelStreamer(joinedChannel.id);
        if (streamer) {
            return streamer;
        } else {
            throw { err: "no_streamer", msg: "没有 Arisa 在当前频道！" };
        }
    } else {
        throw { err: "no_joinedchannel", msg: "请先加入语音频道！" };
    }
}

export async function requireStreamer(
    session: BaseSession,
    commands: BaseCommand[]
) {
    if (!session.guildId) {
        await session.reply("只能在服务器频道中使用此命令");
        return false;
    }
    const streamer = await getChannelStreamer(
        session.guildId,
        session.authorId
    ).catch((e) => {
        switch (e.err) {
            case "network_failure":
            case "no_streamer":
            case "no_joinedchannel":
                session.reply(e.msg);
            default:
                client.logger.error(e);
        }
    });
    if (streamer) return true;
    else return false;
}

import leaveCommand from "menu/arisa/command/leave";
import { controller } from "./playback/lib/index";

client.on("connect.*", async () => {
    let sessions = (await client.config.getOne("arisa::session.ongoing")) || [];
    sessions = sessions.reduce((p: typeof sessions, c) => {
        if (
            !p.some(function (el) {
                return (
                    el.targetGuildId == c.targetGuildId &&
                    el.targetChannelId == c.targetChannelId
                );
            })
        )
            p.push(c);
        return p;
    }, []);
    client.config.set("arisa::session.ongoing", []);
    const promises = sessions.map(async (session) => {
        const streamer = await controller.joinChannel(
            session.targetGuildId,
            session.targetChannelId,
            session.invitationAuthorId,
            session.invitationTextChannelId
        );
        if (streamer) {
            await playlist.user
                .restore(streamer, streamer.INVITATION_AUTHOR_ID)
                .catch((e) => {
                    client.logger.error(e);
                });

            if (session.invitationTextChannelId) {
                await client.API.message.create(
                    MessageType.CardMessage,
                    session.invitationTextChannelId,
                    new Card().addText(
                        `已恢复推流。\n播放结束时，请使用 \`${client.plugin.primaryPrefix}${leaveCommand.hierarchyName}\`结束推流。机器人在频道内无其他用户时也会自动停止。`
                    )
                );
                streamer.panel = new ButtonControlPanel(
                    controller,
                    streamer,
                    controller.client
                );
                await streamer.panel.newPanel(session.invitationTextChannelId);
            }

            if (streamer.audienceIds.size <= 0)
                await streamer.disconnect("语音频道内无用户");
        }
    });
    await Promise.all(promises);
});