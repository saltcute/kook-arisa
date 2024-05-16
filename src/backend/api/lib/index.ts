import axios, { isAxiosError } from "axios";
import { Request, Response, NextFunction } from "express";
import { client } from "init/client";
import mcache from 'memory-cache';


export async function getUserMe(token: string) {
    const { data: res } = await axios({
        url: 'https://www.kookapp.cn/api/v3/user/me',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
}

export function forceReferer() {
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

export function cache(duration: number) {
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

export function requireAdmin() {
    return (req: Request, res: Response, next: NextFunction) => {
        const auth = req.query.auth?.toString() || req.body.auth?.toString();
        if (!auth) {
            res.status(403).send({
                code: 403,
                message: 'forbidden'
            });
            return;
        }
        getUserMe(auth).then((me) => {
            client.middlewares.AccessControl.global.group.getUser(me).then((user) => {
                if (user.level > 3000) {
                    next();
                } else {
                    res.status(403).send({
                        code: 403,
                        message: 'forbidden'
                    });
                    return;
                }
            })
        }).catch((e) => {
            if (isAxiosError(e)) {
                res.status(e.status || 400).send({
                    code: e.status || 400,
                    message: e.message,
                    data: e.response?.data
                })
            } else if (e instanceof Error) {
                res.status(500).send({
                    code: 500,
                    message: e.message
                })
            } else {
                res.status(500).send({
                    code: 500,
                    message: 'unknown'
                })
            }
        })
    }
};