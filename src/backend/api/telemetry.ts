import { Router } from "express";
import { controller, telemetry } from "menu/arisa";
import { Telemetry } from "menu/arisa/telemetry";
import { client } from 'init/client'
import { requireAdmin } from "./lib";

const router = Router();

router.use(requireAdmin());

router.get('/entries', async (req, res) => {
    try {
        let timespan = req.query.timespan?.toString(), time;
        if (!timespan) time = 0;
        else time = parseInt(timespan);
        time = isNaN(time) ? 60 * 1000 : time;
        let entries = (await telemetry.getEntriesInLastXTime(time)).map(({ _id, ...attrs }) => attrs)
        return res.status(200).send({
            code: 200,
            message: 'success',
            data: {
                count: entries.length,
                entries: entries
            }
        })
    } catch (e) {
        client.logger.error(e);
        return res.status(500).send({
            code: 500,
            message: 'server error'
        })
    }
});

router.get('/totalStreamerCount', async (req, res) => {
    res.send({
        code: 200,
        message: 'success',
        data: {
            count: controller.allStreamerTokens.length
        }
    })
});

router.get('/uniqueUsers', async (req, res) => {
    try {
        let timespan = req.query.timespan;
        let period: number | undefined;
        switch (timespan) {
            case 'minute': period = Telemetry.MILLSECOND_PER_MINUTE; break;
            case 'hour': period = Telemetry.MILLSECOND_PER_HOUR; break;
            case 'day': period = Telemetry.MILLSECOND_PER_DAY; break;
            case 'week': period = Telemetry.MILLSECOND_PER_WEEK; break;
            case 'month': period = Telemetry.MILLSECOND_PER_30DAYS; break;
            default:
                timespan = timespan?.toString();
                period = timespan ? parseInt(timespan) : undefined;
        }
        let uniqueUsers;
        if (period && !isNaN(period)) {
            uniqueUsers = await telemetry.getUniqueUsersInLastXTime(period)
        } else {
            uniqueUsers = await telemetry.getUniqueUsers()
        }
        return res.send({
            code: 200,
            message: 'success',
            data: {
                count: uniqueUsers.length,
                users: uniqueUsers
            }
        })
    } catch (e) {
        client.logger.error(e);
        return res.status(500).send({
            code: 500,
            message: 'server error'
        })
    }
})

export default router;