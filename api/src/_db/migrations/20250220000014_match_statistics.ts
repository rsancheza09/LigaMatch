import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('matches', (table) => {
    table.jsonb('statistics').nullable();
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('matches', (table) => {
    table.dropColumn('statistics');
  });
};
