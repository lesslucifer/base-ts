import * as express from 'express';

interface IReqSession {
    uid?: string;
    system?: string;
}

declare module "express-serve-static-core" {
    interface Request {
        session?: IReqSession
    }
}

export default function createSesssionObject(): express.RequestHandler {
    return (req, resp, next) => {
        req.session = {};
        next();
    };
}