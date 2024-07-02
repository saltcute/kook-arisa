import { NextFunction, Request, Response } from "express";
import { client } from "init/client";
import mcache from "memory-cache";

export function cache(duration: number) {
    return (req: Request, res: any, next: NextFunction) => {
        const key = "__express__" + req.originalUrl || req.url;
        const cachedBody = mcache.get(key);
        if (cachedBody) {
            res.send(cachedBody);
            return;
        } else {
            res.sendResponse = res.send;
            res.send = (body: any) => {
                mcache.put(key, body, duration * 1000);
                res.sendResponse(body);
            };
            next();
        }
    };
}

export function forceReferer() {
    return (req: Request, res: Response, next: NextFunction) => {
        next();
        return;
        if (
            req.headers.referer?.startsWith(client.config.getSync("webuiUrl"))
        ) {
            next();
        } else {
            res.status(400).send({
                code: 400,
                message: "bad request",
            });
            return;
        }
    };
}
