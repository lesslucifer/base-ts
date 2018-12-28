import * as randomstring from 'randomstring';
import { hera } from './hera';
import { Redis } from 'ioredis';

export interface IAuth {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    token_type: string;
}

export interface IAuthUser {
    id: number;
    scope: string;
}

export interface ITokenData extends IAuthUser {
    type: 'REFRESH' | 'ACCESS';
    expired: number;
}

export interface IAuthenticator {
    readonly accessTokenExpires: number;
    readonly refreshTokenExpires: number;
    genTokens(user: IAuthUser): Promise<IAuth>;
    genRefreshToken(user: IAuthUser): Promise<string>;
    genAccessToken(refreshToken: string): Promise<string>;
    renewToken(accessToken: string): Promise<void>;
    revokeToken(token: string): Promise<void>;
    parseToken(token: string): Promise<ITokenData>;
}


export class RedisAuth implements IAuthenticator {
    readonly accessTokenExpires: number;
    readonly refreshTokenExpires: number;

    constructor(private redis: Redis, private key: string,
        accessTokenExpires: number, refreshTokenExpires: number) {
            this.accessTokenExpires = accessTokenExpires;
            this.refreshTokenExpires = refreshTokenExpires;
    }

    async genTokens(user: IAuthUser): Promise<IAuth> {
        const refreshToken = await this.genRefreshToken(user);
        const now = new Date();
        const accessToken = await this.genAccessToken(refreshToken);
        const accessTokenExpiresIn = this.accessTokenExpires;
        return <IAuth> {
            access_token: accessToken,
            expires_in: accessTokenExpiresIn,
            refresh_token: refreshToken,
            token_type: 'bearer'
        }
    }    
    
    async genRefreshToken(user: IAuthUser): Promise<string> {
        const token = randomstring.generate({length: 48});
        const expired = new Date().valueOf() + 1000 * this.refreshTokenExpires;
        await this.redis.hmset(`${this.key}:${token}`, 'id', user.id, 'scope', user.scope, 'type', 'REFRESH', 'expired', expired.toString());
        await this.redis.expire(`${this.key}:${token}`, 1 + this.refreshTokenExpires);
        return token;
    }

    async genAccessToken(refreshToken: string): Promise<string> {
        const data: any = await this.redis.hgetall(`${this.key}:${refreshToken}`);
        if (data && data.type === 'REFRESH' && hera.parseInt(data.expired, 10, Number.MIN_SAFE_INTEGER) >= new Date().valueOf()) {
            const token = randomstring.generate({length: 48});
            const expired = new Date().valueOf() + 1000 * this.accessTokenExpires;
            await this.redis.hmset(`${this.key}:${token}`, 'id', data.id, 'scope', data.scope, 'type', 'ACCESS', 'expired', expired.toString());
            await this.redis.expire(`${this.key}:${token}`, 1 + this.accessTokenExpires);
            return token;
        }

        return null;
    }

    async renewToken(accessToken: string): Promise<void> {
        const data: any = await this.redis.hgetall(`${this.key}:${accessToken}`);
        if (data && data.type == 'ACCESS' && hera.parseInt(data.expired, 10, Number.MIN_SAFE_INTEGER) >= new Date().valueOf()) {
            const expired = new Date().valueOf() + 1000 * this.accessTokenExpires;
            await Promise.all([
                this.redis.hset(`${this.key}:${accessToken}`, 'expired', expired),
                this.redis.expire(`${this.key}:${accessToken}`, 1 + this.accessTokenExpires)
            ]);
        }
    }

    async revokeToken(token: string) {
        await this.redis.del(`${this.key}:${token}`);
    }

    async parseToken(token: string): Promise<ITokenData> {
        const data: any = await this.redis.hgetall(`${this.key}:${token}`);
        if (data && hera.parseInt(data.expired, 10, Number.MIN_SAFE_INTEGER) >= new Date().valueOf()) {
            return data;
        }

        throw new Error(`Invalid token`);
    }
}