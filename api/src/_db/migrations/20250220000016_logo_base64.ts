import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TABLE tournaments ALTER COLUMN logo_url TYPE TEXT');
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TABLE tournaments ALTER COLUMN logo_url TYPE VARCHAR(500)');
};
