import _ from 'lodash';
import newAjv2 from '../utils/ajv2';
import hera from '../utils/hera';
import { GQLU } from 'gql-ts';

const ajv = newAjv2();

const ajvConnConfig = {
    '+@CONN_REDIS': 'string',
};
export interface ENV_CONN_CONFIG {
    CONN_REDIS: string;
}

const ajvEnvConfig = ajv(_.merge({
    '@NAME': 'string',
    '+@HTTP_PORT': 'integer|>0',
    '@LOGGING': 'boolean',
    '+@SENTRY': 'string'
}, ajvConnConfig));
export interface ENV_CONFIG extends ENV_CONN_CONFIG {
    NAME: string; 
    HTTP_PORT?: number;
    LOGGING?: boolean;
    SENTRY: string;
}

const ENV_DEFAULT = {
}

const envCustomParser = {
    'HTTP_PORT': hera.parseInt,
    'LOGGING': GQLU.toBoolean
}

function loadConfig(): ENV_CONFIG {
    // console.log('process.env')
    // console.log(JSON.stringify(process.env, null, 2))
    const config: any = _.cloneDeep(ENV_DEFAULT);
    for (const key in process.env) {
        let val = process.env[key]
        if (envCustomParser[key]) {
            val = envCustomParser[key](val)
        }
        _.set(config, key, val);
    }

    if (!ajvEnvConfig(config)) throw new Error(`Invalid env config; ${JSON.stringify(ajvEnvConfig.errors, null, 2)}`)
    return config;
}

export const ENV: ENV_CONFIG = loadConfig();
export default ENV;