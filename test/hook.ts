if (!process.env.config) {
    process.env.config = 'env.test.json';
}

import * as _ from 'lodash';
import 'mocha';
import CONN from '../glob/conn';
import Program from '../app';
import ENV from '../glob/env';
import { RedisAuth } from '../utils/auth';

before(async function () {
    this.timeout(60 * 1000);
    await Program.main();
})

after(async function () {
    this.timeout(60 * 1000);
})