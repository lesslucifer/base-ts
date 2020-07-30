import { addMiddlewareDecor, argMapperDecor, ExpressRouter } from 'express-router-ts';
import { AppLogicError } from './hera';
import newAjv2 from './ajv2';
import _ from 'lodash';
import express = require('express');

const ajv = newAjv2();

export function ValidBody(schema: any, log = false) {
    const validator = ajv(schema, log);

    return addMiddlewareDecor(async req => {
        if (!validator(req.body)) throw new AppLogicError('Invalid request body!', 400, validator.errors);
    })
}

export function Sess(arg?: any) {
    const mapper = _.isString(arg) ? req => _.get(req.session, arg) : (_.isFunction(arg) ? req => arg(req.session) : req => req.session);
    return argMapperDecor(mapper);
}

export function Caller() {
    return Sess('user');
}

export function SessArea() {
    return Sess('area');
}

export function RouteIf(condiditon: (req: express.Request) => Promise<boolean> | boolean) {
    return addMiddlewareDecor(async req => {
        let isOk = await Promise.resolve(condiditon(req));
        if (!isOk) throw ExpressRouter.NEXT;
    })
}