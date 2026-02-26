import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('tournaments', (table) => {
    table.string('status', 20).notNullable().defaultTo('active'); // active, suspended
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('tournaments', (table) => {
    table.dropColumn('status');
  });
};
