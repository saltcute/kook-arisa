import { client } from "init/client";
import * as fs from 'fs';
import upath from 'upath';
import 'api/main';
import { controller } from "menu/arisa/index";
import playlist from "menu/arisa/playback/lib/playlist";
import { Card, MessageType } from "kasumi.js";
import { ButtonControlPanel } from "menu/arisa/playback/lib/panel/index";
import leaveCommand from "menu/arisa/command/leave";

(async () => {
    /** Use a different prefix if is DEV */
    if (process.env.ENV?.toLowerCase() == 'dev') {
        client.plugin.removePrefix('/', '.', '!');
        client.plugin.primaryPrefix = '/dev';
    }

    await client.connect();
    const basicPath = upath.join(__dirname, 'menu');
    const menus = fs.readdirSync(basicPath);
    for (const menu of menus) {
        try {
            require(upath.join(basicPath, menu, "index"));
        } catch (e) {
            client.logger.error('Error loading menu');
            client.logger.error(e);
        }
    }

    const admins = await client.config.getOne('globalAdmins');
    for (const admin of admins) {
        client.middlewares.AccessControl.global.group.assignUser(admin, client.middlewares.AccessControl.UserGroup.Admin);
    }

    let sessions = await client.config.getOne("arisa::session.ongoing") || [];
    sessions = sessions.reduce((p: typeof sessions, c) => {
        if (!p.some(function (el) { return el.targetGuildId == c.targetGuildId && el.targetChannelId == c.targetChannelId; })) p.push(c);
        return p;
    }, []);
    client.config.set("arisa::session.ongoing", []);
    const promises = sessions.map(async session => {
        const streamer = await controller.joinChannel(session.targetGuildId, session.targetChannelId, session.invitationAuthorId, session.invitationTextChannelId);
        if (streamer) {
            await playlist.user.restore(streamer, streamer.INVITATION_AUTHOR_ID).catch((e) => { client.logger.error(e) });

            if (session.invitationTextChannelId) {
                await client.API.message.create(MessageType.CardMessage, session.invitationTextChannelId, new Card().addText(`(met)${streamer.kasumi.me.userId}(met) 已恢复推流。\n播放结束时，请使用 \`${client.plugin.primaryPrefix}${leaveCommand.hierarchyName}\`结束推流。机器人在频道内无其他用户时也会自动停止。`));
                streamer.panel = new ButtonControlPanel(controller, streamer, controller.client)
                await streamer.panel.newPanel(session.invitationTextChannelId);
            }

            if (streamer.audienceIds.size <= 0) await streamer.disconnect("语音频道内无用户");
        }
    })
    await Promise.all(promises);
})()