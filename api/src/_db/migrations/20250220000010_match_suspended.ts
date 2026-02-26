import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('matches', (table) => {
    table.uuid('suspended_match_id').nullable().references('id').inTable('matches').onDelete('SET NULL');
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('matches', (table) => {
    table.dropColumn('suspended_match_id');
  });
};
