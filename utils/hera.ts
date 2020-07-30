import * as express from 'express';
import _ from 'lodash';
import ajv from 'ajv';
import sha1 from 'sha1';
import crypto = require('crypto');
import * as randomstring from 'randomstring';
import * as fs from 'fs-extra';
import { GQLGlobal, GQLU, GQLQuery } from 'gql-ts';

export type ExpressAsyncRequestHandler = (req: express.Request, resp: express.Response) => Promise<any>;
export type ExpressSyncRequestHandler = (req: express.Request, resp: express.Response) => any;
export type ExpressRespHandler = (err?: any, data?: any) => void;
export type ExpressRespHandlerProvider = (req: express.Request, resp: express.Response) => ExpressRespHandler;

export interface IAppErrorResponse {
    message?: string;
    code?: string;
    params?: any;
}

export interface IGQLMGQueryPaginationOpts {
    defaultLimit?: number;
    maxLimit?: number;
}

export class AppApiResponse {

    constructor(success: boolean = true) {
        this.success = success;
    }

    success: boolean;
    httpCode?: number;
    headers?: {[header: string]: string} = {}
    err?: IAppErrorResponse;
    data?: any;
    meta?: any;
}

export class AppLogicError extends Error {
    constructor(msg: string, public httpCode?: number, public params?: any) {
        super(msg); 
    }
}

export class Hera {
    DefaultRespHandlerProvider: ExpressRespHandlerProvider = this.defaultAppRespHandlerProvider;

    routeAsync(reqHandler: ExpressAsyncRequestHandler, rhProvider?: ExpressRespHandlerProvider): express.RequestHandler {
        return (req, resp, next) => {
            const handler = (rhProvider || this.DefaultRespHandlerProvider)(req, resp);
            reqHandler(req, resp).then((data) => {
                if (data === undefined) {
                    next();
                }
                else {
                    handler(undefined, data);
                }
            }).catch((err) => {
                handler(err, undefined);
            });
        }
    }

    routeSync(reqHandler: ExpressSyncRequestHandler, rhProvider?: ExpressRespHandlerProvider): express.RequestHandler {
        return (req, resp, next) => {
            const handler = (rhProvider || this.DefaultRespHandlerProvider)(req, resp);
            try {
                const data = reqHandler(req, resp);
                if (data === undefined) {
                    next();
                }
                else {
                    handler(undefined, data);
                }
            }
            catch (err) {
                handler(err, undefined);
            }
        }
    }
    
    private defaultAppRespHandlerProvider(req: express.Request, resp: express.Response): ExpressRespHandler {
        return (err?: any, data?: any) => {
            let appResp = new AppApiResponse();
            if (err == undefined) {
                if (data instanceof AppApiResponse) {
                    appResp = data;
                }
                else {
                    appResp.success = true;
                    appResp.httpCode = 200;
                    appResp.data = data;
                }
            }
            else {
                appResp.success = false;
                appResp.err = {
                    message: err.message || 'Unknown error',
                    code: err.code,
                    params: err.params
                }
                appResp.httpCode = _.isNumber(err.httpCode) ? err.httpCode : 500;
                appResp.data = data;
            }

            // Remove http code from response body
            if (_.isNumber(appResp.httpCode)) {
                resp.statusCode = appResp.httpCode;
            }
            delete appResp.httpCode;

            // Remove headers from response body
            if (!_.isEmpty(appResp.headers)) {
                _.keys(appResp.headers).forEach(h => resp.setHeader(h, appResp.headers[h]));
            }
            delete appResp.headers;

            resp.send(appResp);
        };
    }

    validBody(validator: ajv.ValidateFunction): express.RequestHandler {
        return this.routeSync((req) => {
            if (!validator(req.body)) {
                throw new AppLogicError('Invalid request body!', 400, validator.errors);
            }
        });
    }

    validQuery(validator: ajv.ValidateFunction): express.RequestHandler {
        return this.routeSync((req) => {
            if (!validator(req.query)) {
                throw new AppLogicError('Invalid request query!', 400, validator.errors);
            }
        });
    }

    isValidEmailAddress(email: string) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    isValidPhoneNumber(num: string) {
        var re = /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
        return re.test(num);
    }

    isValidNationalId(num: string) {
        var re = /^\d{9}$|^\d{12}$/;
        return re.test(num);
    }
    
    sha1(s: string): string {
        return sha1(s) as string;
    }

    parseInt(value: any, radix?: number, defaultValue?: number) {
        const n = parseInt(value, radix);
        if (isNaN(n)) {
            return defaultValue;
        }

        return n;
    }

    parseFloat(value: any, defaultValue?: number) {
        const n = parseFloat(value);
        if (isNaN(n)) {
            return defaultValue;
        }

        return n;
    }

    isValid(validator: ajv.ValidateFunction) {
        return (data) => {
            return !!validator(data);
        }
    }

    filterObj<V>(obj: Object, predicate: (k?: string, v?: V) => boolean) {
        return Object.keys(obj).filter(k => predicate(k, obj[k])).reduce((o, k) => {
            o[k] = obj[k];
            return o;
        }, {});
    }

    mapObj<V1, V2>(obj: Object, iterator: (k?: string, v?: V1) => V2) {
        return Object.keys(obj).reduce((o, k) => {
            o[k] = iterator(k, obj[k]);
            return o;
        }, <any>{});
    }

    isEmpty(obj?: any): boolean
    {
        return  ((obj == null || obj === NaN || obj === false) ||
                (_.isString(obj) && obj.length == 0) ||
                ((obj instanceof Array) && obj.length == 0) ||
                ((obj instanceof Object) && Object.keys(obj).length == 0));
    }

    prune(data: any, isEmpty: (any)  => boolean = this.isEmpty, deep = false) {
        if (_.isArray(data)) {
            const filteredData = data.filter(d => !isEmpty(d));
            if (deep) {
                return filteredData.map(d => this.prune(d, isEmpty, true));
            }

            return filteredData;
        }
        else if (_.isObject(data)) {
            const filteredObj = this.filterObj(data, (k, v) => !isEmpty(v));
            if (deep) {
                return this.mapObj(filteredObj, (k, v) => this.prune(v, isEmpty, true));
            }

            return filteredObj;
        }

        return data;
    }

    sha512 (password: string, salt: string): {salt: string, passwordHash: string}{
        let hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
        hash.update(password);
        const value: string = hash.digest('hex');
        return {
            salt:salt,
            passwordHash:value
        };
    }

    genRandomString(length): string{
        return crypto.randomBytes(Math.ceil(length/2))
        .toString('hex')
        .slice(0,length);
    }

    genVerifyKey(length): string{
        const value = randomstring.generate({
            length: parseInt(length), 
            charset: 'numeric'
        });
        return value;
    }

    formatCode(name): string {
        return name.toUpperCase().replace(/[^A-Z0-9]/ig, "_");
    }

    async loadRoutes(server: express.Express, path: string) {
        function loadRouter(jsFile: string) {
            try {
                const obj = require(jsFile);
                if (!obj) return null;

                const router = obj.default || obj;
                if (Object.getPrototypeOf(router) == express.Router) 
                    return router;
            }
            catch (err) {
                return null;
            }

            return null;
        }

        function pathNameFromFile(file: string) {
            return file.substring(0, file.length - 3);
        }

        const dirFiles = await fs.readdir(path);
        const jsFiles = dirFiles.filter(f => f.endsWith('.js'));
        const routers = jsFiles.map(f => ({
            file: f,
            router: loadRouter(`${path}/${f}`)
        })).filter(r => r.router != null);
        
        for (const r of routers) {
            server.use(`/${pathNameFromFile(r.file)}`, r.router);
        }
    }
    
    generateUpsertSQL(table: string, keys: string[], updateKeys: string[]) {
        const updateStms = updateKeys.map(k => `${table}.${k} = VALUES(\`${k}\`)`);
        const query = `INSERT INTO \`${table}\` (${keys.join(', ')}) VALUES ? ON DUPLICATE KEY UPDATE ${updateStms.join(', ')}`;
        return query;
    }

    uniqIntArray(arr: any[]) {
        if (!arr) return [];
        return _.uniq(arr.map(i => hera.parseInt(i)).filter(i => i != null));
    }
    
    arrToObj<T, V>(arr: ArrayLike<T>, key: (t: T, idx?: number) => any, value: (t: T, idx?: number) => V): _.Dictionary<V> {
        const map = {};
        for (let i = 0; i < arr.length; ++i) {
            map[key(arr[i], i)] = value(arr[i], i);
        }

        return map;
    }

    async findAsync<T>(arr: T[], ite: (T) => Promise<boolean>) {
        for (const elem of arr) {
            const result = await ite(elem);
            if (result == true) {
                return elem;
            }
        }

        return null;
    }

    standardlizePhoneNumber(phone: string, prefix = '84'): string {
        if (!phone) return phone;
        if (phone.startsWith(prefix)) {
            phone = phone.slice(prefix.length);
        }

        if (phone.startsWith(`+${prefix}`)) {
            phone = phone.slice(prefix.length + 1);
        }

        if (phone.startsWith('0')) {
            phone = phone.slice(1);
        }

        return phone;
    }

    mongoEqOrIn(val: any) {
        if (_.isArray(val)) {
            if (val.length == 0) return undefined;
            if (val.length == 1) return _.first(val);
            return {$in: val};
        }

        return val;
    }

    softmax(nums: number[]) {
        if (nums.length === 0) return nums;
        const max = Math.max(...nums)
        const ex = nums.map(x => Math.exp(x - max))
        const exSum = _.sum(ex)
        return ex.map(v => v / exSum)
    }

    createMapByKey<K, V>(arr: V[], key: (v: V) => K) {
        return arr.reduce((m, v) => {
            m.set(key(v), v)
            return m
        }, new Map());
    }
}

export const hera = new Hera();
export default hera;