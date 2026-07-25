
import { Knex } from 'knex';
import { ENV } from '../common/config/env.config';

const shared: Partial<Knex.Config> = {
    client: 'pg',
    searchPath: ['knex', 'public'],
    pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        propagateCreateError: false,
    },
    migrations: {
        directory: './migrations',
    },
    seeds: {
        directory: './seeds',
    },
};

const config: { [key: string]: Knex.Config } = {
    development: {
        ...shared,
        connection: {
            host: ENV.DB_HOST,
            user: ENV.DB_USER,
            password: ENV.DB_PASSWORD,
            database: ENV.DB_NAME_DEV,
            port: ENV.DB_PORT,
        },
    },
    test: {
        ...shared,
        connection: {
            host: ENV.DB_HOST,
            user: ENV.DB_USER,
            password: ENV.DB_PASSWORD,
            database: ENV.DB_NAME_TEST,
            port: ENV.DB_PORT,
        },
    },
    production: {
        ...shared,
        connection: {
            host: ENV.DB_HOST,
            user: ENV.DB_USER,
            password: ENV.DB_PASSWORD,
            database: ENV.DB_NAME_PROD,
            port: ENV.DB_PORT,
            // ssl: { rejectUnauthorized: false },
        },
    },
};

export default config;