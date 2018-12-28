import { ENV_DB_CONFIG } from './env';
import Redis = require('ioredis');
import _ from 'lodash';


let redis: Redis.Redis;

// ************ CONFIGS ************
export class AppConnections {
    constructor() {

    }

    get REDIS() { return redis; }

    async configureConnections(dbConfig: ENV_DB_CONFIG) {
        redis = new Redis(dbConfig.REDIS);
    }
}

const CONN = new AppConnections();
export default CONN;

