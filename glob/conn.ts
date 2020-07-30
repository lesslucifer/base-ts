import ENV, { ENV_CONN_CONFIG } from './env';
import Redis = require('ioredis');
import _ from 'lodash';
import HC from './hc';


// ************ CONFIGS ************
export class AppConnections {
    private redis: Redis.Redis;

    constructor() {

    }

    get REDIS() { return this.redis; }

    get REDIS_ROOT() {
        return `${HC.APP_NAME}:${ENV.NAME}`;
    }

    async configureConnections(cf: ENV_CONN_CONFIG) {
        this.redis = new Redis(cf.CONN_REDIS);
    }
}

const CONN = new AppConnections();
export default CONN;