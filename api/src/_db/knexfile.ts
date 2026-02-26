import '../../environment';
import { knexSnakeCaseMappers } from 'objection';
import pg from 'pg';

const DATE_OID = 1082;
pg.types.setTypeParser(DATE_OID, (value) => value);

function getConnectionString(): string {
  const url =
    process.env.DATABASE_CONNECTION_POOL_URL || process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname && parsed.pathname !== '/') return url;
    } catch {
      /* invalid URL, fall through */
    }
  }
  const host =
    process.env.DATABASE_HOST || 'postgres://postgres@127.0.0.1:5432';
  const name = process.env.DATABASE_NAME || 'ligamatch_development';
  const base = host.includes('postgres')
    ? host.replace(/\/$/, '').replace(/\?.*$/, '')
    : `postgres://postgres@${host}:5432`;
  return `${base}/${name}`;
}

export default {
  client: 'pg',
  connection: {
    connectionString: getConnectionString(),
    ssl: ['production', 'staging'].includes(process.env.ENV || '') && {
      rejectUnauthorized: false,
    },
  },
  pool: {
    min: 0,
    max: Number(process.env.DATABASE_CONNECTION_POOL_MAX) || 10,
  },
  migrations: {
    directory: './migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './seeds',
    extension: 'ts',
  },
  ...knexSnakeCaseMappers(),
};
