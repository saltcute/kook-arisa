import { Router } from "express";
import mcache from 'memory-cache';
import netease from "menu/arisa/command/netease/lib";

const cache = (duration: number) => {
    return (req: any, res: any, next: any) => {
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



const router = Router();

router.use(cache(60 * 15));

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

export default router;