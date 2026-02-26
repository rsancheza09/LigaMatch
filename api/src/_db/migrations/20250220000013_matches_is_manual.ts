import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('matches', (table) => {
    table.boolean('is_manual').notNullable().defaultTo(false);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('matches', (table) => {
    table.dropColumn('is_manual');
  });
};
