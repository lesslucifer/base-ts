import _ from 'lodash';
import '../hook';
import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import chaiHttp = require('chai-http');
import spies = require('chai-spies');
import 'mocha';
import ENV from '../../glob/env';
import Program from '../../app';
import CONN from '../../glob/conn';
import moment = require('moment');

chai.use(<any>spies);
chai.use(chaiAsPromised);
chai.use(chaiHttp);

export class TestUtils {
    static envURL(url: string) {
        url = url.startsWith('/') ? url : `/${url}`
        // url = `${ENV.BASE_PATH}${url}`
        return url;
    }

    static get Http() {
        return chai.request(Program.server);
    }

    static async clearDatabase() {
        // const colls = await CONN.MONGO.collections();
        // for (const coll of colls) {
        //     await coll.drop();
        // }
    }

    static async dropDatabase() {
        // const colls = await CONN.MONGO.collections();
        // for (const coll of colls) {
        //     await coll.drop();
        // }
    }

    static async initTestData() {
        // try {
        //     const data = {
        //         name: 'name',
        //         email: 'email@gmail.com',
        //         address: '',
        //         locale: 'vi_VN',
        //         phone: '123456789',
        //         password: '0123456789',
        //     };

        //     const result = await User.insertOne({
        //         name: data.name,
        //         birthDay: moment([2010, 1, 1]).valueOf(),
        //         phone: data.phone,
        //         email: data.email,
        //         roles: ['SALE'],
        //         managedAreas: [],
        //         isBlocked: false,
        //         settings: {}
        //     });

        //     await UserServ.updatePassword(result.insertedId, data.password);
        // } catch (error) {
        //     console.error('initTestData', error);
        // }
    }
}

export default TestUtils;