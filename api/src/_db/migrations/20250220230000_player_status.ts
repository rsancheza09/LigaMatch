import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('players', (table) => {
    table.string('status', 20).notNullable().defaultTo('active');
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('players', (table) => {
    table.dropColumn('status');
  });
};
