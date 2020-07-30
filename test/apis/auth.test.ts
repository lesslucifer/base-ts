import _ from 'lodash';
import TestUtils from '../utils/testutils';
import { expect } from 'chai';
import sinon from 'sinon';

describe("# API AUTH:", () => {
    let sandbox: sinon.SinonSandbox;
    const phone = '0123456789';
    const password = '0123456789';

    before(async () => {
    })

    after(async () => {
        // await TestUtils.clearDatabase();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('POST /auth/login', async () => {

        it('unkown user should response 400', async () => {
            const resp = await TestUtils.Http.post(TestUtils.envURL('/auth/login')).send({
                phone: '0987654321',
                password: 'and unknown password',
                roles: ['SALE']
            });

            expect(resp).to.have.status(400);
        });

        it('invalid password should response 400', async () => {
            const resp = await TestUtils.Http.post(TestUtils.envURL('/auth/login')).send({
                phone: phone,
                password: 'and invalid password',
                roles: ['SALE']
            });

            expect(resp).to.has.status(400);
        });

        it('login ok should response 200 with token & rights', async () => {
            const resp = await TestUtils.Http.post(TestUtils.envURL('/auth/login')).send({
                phone: phone,
                password: password,
                roles: ['SALE']
            });

            expect(resp).to.has.status(200);
            expect(resp.body.data).to.has.property('access_token');
        })
    });
});