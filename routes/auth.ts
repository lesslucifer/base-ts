import { ExpressRouter } from '../utils/express-router';
import { GET } from '../utils/express-router/api';

export class AuthRouter extends ExpressRouter {
    @GET({path: '/'})
    async helloWorld() {
        return {
            'Hello': 'world'
        }
    }
}

export default new AuthRouter();