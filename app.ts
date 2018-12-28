import * as bodyParser from 'body-parser';
import { EventEmitter } from 'events';
import express from 'express';
import _ from 'lodash';
import moment from 'moment';
import * as path from 'path';
import CONN from './glob/conn';
import { ENV } from './glob/env';
import { initModels } from './models/miscs';
import createSesssionObject from './serv/sess';
import { ExpressRouter } from './utils/express-router';
import { APIInfo } from './utils/express-router/api';
import hera, { AppLogicError } from './utils/hera';


// Import routers
export class Program {
    static server: express.Express;

    public static async setUp() {
        await CONN.configureConnections(ENV.DB);

        await initModels();

        const server = express();
        this.server = server;
        server.use(bodyParser.json());

        server.use(createSesssionObject());

        if (ENV.LOGGING !== false) {
            server.all('*', (req, resp, next) => {
                console.log(`URL: ${req.url}`);
                if (!_.isEmpty(req.body)) {
                    console.log(JSON.stringify(req.body, null, 2));
                }

                next();
            });
        }
        
        // CORS
        server.all('*', function (req, res, next) {
            res.header('Access-Control-Allow-Origin', "*");
            res.header('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PUT, DELETE');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '86400');
            res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, ' +
                'Content-Type, Accept, Authentication, Authorization, X-Consumer-Username, sess, apikey');

            if (req.method.toUpperCase() == 'OPTIONS') {
                res.statusCode = 204;
                res.send();
                return;
            }

            next();
        });

        APIInfo.Logging = ENV.LOGGING == true;
        await ExpressRouter.loadDir(server, `${__dirname}/routes`);

        server.all('*', hera.routeSync(req => {
            if (req.session.user || req.session.system) throw new AppLogicError(`Permission denied!`, 403);
            throw new AppLogicError(`Cannot ${req.method} ${req.url}! API not found`, 404);
        }));

        (server as EventEmitter).on(ExpressRouter.MSG_ERR, (err: Error, req: express.Request) => {
            console.log(`------------------------------------------------------------
            ${moment().format('DD/MM HH:mm:ss')} (${ENV.NAME || 'Unknown'})
            ${req.method} ${req.url}
            ${err.message}` + 
            '\n```' + err.stack + '```');
        })
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
}

if (require.main == module) { // this is main file
    Program.main();
}

export default Program;