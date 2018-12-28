import newAjv2 from "../ajv2";
import { addMiddlewareDecor, updateAPIInfo } from "./api";
import hera, { AppLogicError } from "../hera";
import _ from "lodash";
import express = require("express");

const ajv = newAjv2();

export function ValidBody(schema: any, log = false) {
    const validator = ajv(schema, log);

    return addMiddlewareDecor(async req => {
        if (!validator(req.body)) throw new AppLogicError('Invalid request body!', 400, validator.errors);
    })
}

export type ArgParser = string | ((req: express.Request) => any);
export function Args(...args: ArgParser[]) {
    return updateAPIInfo(api => {
        api.setArgs(args);
    })
}

export class ArgParsers {
    static UniqIntArrs = (key: string, sep: string = ',') => (req: express.Request) => {
        const data = _.get(req, key);
        const arr: string[] = _.isArray(data) ? data : (_.isString(data) ? data.split(sep) : null); 
        if (!arr) return [];
    
        return _.uniq(arr.map(i => hera.parseInt(i)).filter(i => i != null));
    }
}

export function BodyArgs(...args: (string | ((body: any) => any))[]) {
    return updateAPIInfo(api => {
        api.args = args.map(arg => {
            if (_.isString(arg)) return req => _.get(req.body, arg);
            if (_.isFunction(arg)) return req => arg(req.body);

            return () => undefined;
        })
    })
}