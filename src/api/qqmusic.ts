import bodyParser from "body-parser";
import { NextFunction, Request, Response, Router } from "express";
import { client } from "init/client";
import mcache from 'memory-cache';
import qqmusic from "menu/arisa/command/qq/lib";

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

// router.use(cache(60 * 15), forceReferer());

router.get('/search', cache(60 * 15), (req, res) => {
    const keyword = <string>req.query.keyword;
    if (keyword) {
        qqmusic.search(keyword).then((re) => {
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

router.get('/lyric', cache(60 * 15), (req, res) => {
    const mid = <string>req.query.mid;
    if (mid) {
        qqmusic.getLyric(mid).then((re) => {
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

router.use(bodyParser.json());
router.post('/updateCookie', (req, res) => {
    if (req.body.code != client.config.getSync("QQCookieCode")) {
        res.status(400).send({
            code: 400,
            message: 'wrong code'
        })
        return;
    }
    const cookie = req.body.cookie;
    qqmusic.updateCookie(cookie);
    res.send({
        code: 200,
        message: 'success'
    });
})

export default router;