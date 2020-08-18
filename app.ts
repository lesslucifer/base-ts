import * as bodyParser from 'body-parser';
import express from 'express';
import _ from 'lodash';
import CONN from './glob/conn';
import { ENV } from './glob/env';
import hera, { AppLogicError, AppApiResponse } from './utils/hera';
import { APIInfo, ExpressRouter } from 'express-router-ts';
import { GQLGlobal } from 'gql-ts';
import * as Sentry from '@sentry/node';
import cors from './utils/cors';
import createSesssionObject from './serv/sess';


// Import routers
export class Program {
    static server: express.Express;

    public static async setUp() {
        Sentry.init({ dsn: ENV.SENTRY });
        await CONN.configureConnections(ENV);

        const server = express();
        this.server = server;
        server.use(bodyParser.json({limit: '10mb'}));
        server.use(createSesssionObject())
        server.all('*', cors());

        if (ENV.LOGGING !== false) {
            server.all('*', (req, resp, next) => {
                console.log(`URL: ${req.url}`);
                if (!_.isEmpty(req.body)) {
                    console.log(JSON.stringify(req.body, null, 2));
                }

                next();
            });
        }

        APIInfo.Logging = ENV.LOGGING == true;
        await ExpressRouter.loadDir(server, `${__dirname}/routes`);

        ExpressRouter.ResponseHandler = this.expressRouterResponse.bind(this)
        ExpressRouter.ErrorHandler = this.expressRouterError.bind(this)
        
        server.all('*', hera.routeSync(req => {
            if (req.session.uid || req.session.system) throw new AppLogicError(`Permission denied!`, 403);
            throw new AppLogicError(`Cannot ${req.method} ${req.url}! API not found`, 404);
        }));
    }

    public static async main() {
        await this.setUp();

        await new Promise(res => this.server.listen(ENV.HTTP_PORT, () => {
            if (ENV.LOGGING !== false) {
                console.log(`Listen on port ${ENV.HTTP_PORT}...`);
            }
            res();
        }));
        
        return 0;
    }

    static expressRouterResponse(data: any, req: express.Request, resp: express.Response) {
        let appResp = new AppApiResponse();
        if (data instanceof AppApiResponse) {
            appResp = data;
        }
        else {
            appResp.success = true;
            appResp.httpCode = 200;
            appResp.data = data;
        }

        this.doResponse(appResp, resp);
    }

    static expressRouterError(err: any, req: express.Request, resp: express.Response) {
        let appResp = new AppApiResponse();
        appResp.success = false;
        appResp.err = {
            message: err.message || 'Unknown error',
            code: err.code,
            params: err.params
        }
        appResp.httpCode = _.isNumber(err.httpCode) ? err.httpCode : 500;

        // LogServ.logError(err, req);
        // LogServ.logNotif(LogServ.errMsgs(err, req).join('\n'));
        this.doResponse(appResp, resp);
    }

    static doResponse(appResp: AppApiResponse, resp: express.Response) {
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
    }
}

if (require.main == module) { // this is main file
    Program.main();
}

export default Program;