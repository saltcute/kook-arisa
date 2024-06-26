import { client } from "init/client";
import * as fs from 'fs';
import upath from 'upath';
import 'api/main';


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
})()