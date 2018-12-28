import * as express from 'express';
import * as ajv from 'ajv';
import hera, { ExpressAsyncRequestHandler } from '../hera';
import _ from 'lodash';
import { ExpressRouter } from '.';

export type API_METHOD = 'GET' | 'POST' | 'PUT' | 'OPTIONS' | 'DELETE' | 'PATCH' | 'HEAD';

interface APIDefineOpts {
    method?: API_METHOD,
    path?: string;
    args?: (string | ((req: express.Request) => any))[];
    logging?: boolean;
}

export class APIInfo {
    static Logging = false;

    method: API_METHOD;
    path: string;
    validBody?: ajv.ValidateFunction;
    args?: ((req: express.Request) => any)[] = [];
    middlewares: IExpressRouterMiddleware[] = []
    apiFunc: ExpressAsyncRequestHandler;

    constructor(public key:string, opts: APIDefineOpts, apiFunc: ExpressAsyncRequestHandler) {
        this.method = opts.method || 'GET';
        this.path = opts.path || '';
        this.setArgs(opts.args);
        this.apiFunc = apiFunc;
    }

    private getRouterDefineMethod(router: express.Router) {
        switch (this.method) {
            case 'GET': return router.get;
            case 'POST': return router.post;
            case 'PUT': return router.put;
            case 'OPTIONS': return router.options;
            case 'DELETE': return router.delete;
            case 'PATCH': return router.patch;
            case 'HEAD': return router.head;
        }

        return router.use;
    }

    registerAPI(server: () => express.Express, router: express.Router, caller: any) {
        const methodDefiner = this.getRouterDefineMethod(router);
        methodDefiner.call(router, this.path, hera.routeAsync(async req => {
            try {
                for (const mw of this.middlewares) {
                    await mw(req);
                }
    
                const args = this.args.map(arg => arg(req));
                return await this.apiFunc.apply(caller, args);
            }
            catch (err) {
                if (err === ExpressRouter.NEXT) return;
                server().emit('express_router:error', err, req);
                if (APIInfo.Logging == true) {
                    console.log(err);
                }
                throw err;
            }
        }));
    }

    setArgs(args: (string | ((req: express.Request) => any))[]) {
        this.args = (args || []).map(arg => {
            if (_.isString(arg)) return (req) => {
                return _.get(req, arg);
            }
            if (_.isFunction(arg)) return arg;

            return () => undefined;
        });
    }
}

export function API(method: API_METHOD, opts: APIDefineOpts = {}) {
    return (target: any, key: string, desc: PropertyDescriptor) => {
        opts.method = method;
        defineAPI(target, key, desc, opts);
    }
}

export function GET(opts?: APIDefineOpts) {
    return API('GET', opts);
}

export function POST(opts?: APIDefineOpts) {
    return API('POST', opts);
}

export function PUT(opts?: APIDefineOpts) {
    return API('PUT', opts);
}

export function DELETE(opts?: APIDefineOpts) {
    return API('DELETE', opts);
}

export function PATCH(opts?: APIDefineOpts) {
    return API('PATCH', opts);
}

export function OPTIONS(opts?: APIDefineOpts) {
    return API('OPTIONS', opts);
}

export function HEAD(opts?: APIDefineOpts) {
    return API('HEAD', opts);
}

function defineAPI(target: any, key: string, desc: PropertyDescriptor, opts: APIDefineOpts) {
    opts.path = opts.path || `/${key}`;
    const apis: any[] = Reflect.getMetadata('xm:apis', target) || [];
    apis.push(new APIInfo(key, opts, desc.value));
    Reflect.defineMetadata('xm:apis', apis, target);
}

export function updateAPIInfo(updator: (api: APIInfo) => void) {
    return (target: any, key: string, desc: PropertyDescriptor) => {
        setTimeout(() => {
            const apis: APIInfo[] = Reflect.getMetadata('xm:apis', target) || [];
            const api = apis.find(api => api.key == key);
            if (api) {
                updator(api);
                Reflect.defineMetadata('xm:apis', apis, target);
            }
        })
    }
}

export interface IExpressRouterMiddleware {
    (req: express.Request): Promise<void>;
}

export function addMiddlewareDecor(middleware: IExpressRouterMiddleware) {
    return updateAPIInfo((api) => {
        api.middlewares.push(middleware);
    });
}