import { ExpressRouter, GET } from "express-router-ts";
import HC from "../glob/hc";

class HealthCheckRouter extends ExpressRouter {
    @GET({path: ""})
    async checkHealth() {
        return HC.SUCCESS
    }
}

export default new HealthCheckRouter()
