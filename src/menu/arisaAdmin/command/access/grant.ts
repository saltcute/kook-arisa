import { BaseCommand, BaseSession, CommandFunction } from "kasumi.js";

class GrantCommand extends BaseCommand {
    name = 'grant';
    description = 'Grant a user suepruser rights.';
    func: CommandFunction<BaseSession, any> = async (session) => {
        const target = session.args[0];
        const targetGroup = { name: "Operator", level: 3000 };
        const match = target.match(/\(met\)(\d+)\(met\)/);
        if (match && match[1]) {
            const targetId = match[1];
            const { data: user, err } = await this.client.API.user.view(targetId, session.guildId);
            if (err) {
                session.send(`Exception getting the user detail. Message: ${err.message}`);
                return;
            }
            await session.send(`Confirm granting superuser rights to (met)${targetId}(met) (${user.username}#${user.identify_num})? (y/n)`);
            const res = await this.client.events.callback.createAsyncCallback("message.text", e => e.authorId == session.authorId, e => e.content, 10 * 1000).catch(() => 'timeout');
            if (res == "timeout") {
                await session.send("Timed out getting response. Aborted.");
            } else if (res.toLowerCase() == "n") {
                await session.send("Aborted.");
            } else if (res.toLowerCase() == "y") {
                this.client.middlewares.AccessControl.global.group.assignUser(targetId, targetGroup);
                await session.send(`Sucessfully granted superuser rights to (met)${targetId}(met) (${user.username}#${user.identify_num}). They are now in ${targetGroup.name} group now.`);
            } else {
                await session.send("Operation cancelled.");
            }
        }
    }
}

const grant = new GrantCommand();
export default grant;