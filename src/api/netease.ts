import { NextFunction, Request, Response, Router } from "express";
import { client } from "init/client";
import mcache from 'memory-cache';
import netease from "menu/arisa/command/netease/lib";

const cache = (duration: number) => {
    return (req: Request, res: any, next: NextFunction) => {
        const key = '__express__' + req.originalUrl || req.url;
        const cachedBody = mcache.get(key);
        if (cachedBody) {
            res.send(cachedBody);
            return;
        } else {
            res.sendResponse = res.send;
            res.send = (body: any) => {
                mcache.put(key, body, duration * 1000);
                res.sendResponse(body);
            }
            next()
        }
    }
}

const forceReferer = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        next();
        return;
        if (req.headers.referer?.startsWith(client.config.getSync('webuiUrl'))) {
            next();
        } else {
            res.status(400).send({
                code: 400,
                message: 'bad request'
            });
            return;
        }
    }
}



const router = Router();

router.use(cache(60 * 15), forceReferer());

router.get('/search', (req, res) => {
    const keyword = <string>req.query.keyword;
    if (keyword) {
        netease.search(keyword).then((re) => {
            res.send({
                code: 200,
                message: 'success',
                data: re
            });
        })
    } else {
        res.status(400).send({
            code: 400,
            message: 'no keyword was provided'
        })
    }
})


router.get('/songs', (req, res) => {
    const ids = <string>req.query.ids;
    if (ids) {
        netease.getSongMultiple(ids).then((re) => {
            res.send({
                code: 200,
                message: 'success',
                data: re
            });
        })
    } else {
        res.status(400).send({
            code: 400,
            message: 'no id was provided'
        })
    }
})

router.get('/lyric', (req, res) => {
    const id = <string>req.query.id;
    if (id) {
        netease.getLyric(parseInt(id)).then((re) => {
            res.send({
                code: 200,
                message: 'success',
                data: re
            });
        })
    } else {
        res.status(400).send({
            code: 400,
            message: 'no id was provided'
        })
    }
})

export default router;