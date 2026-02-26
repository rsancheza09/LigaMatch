import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('tournaments', (table) => {
    table.boolean('is_single_venue').notNullable().defaultTo(false);
    table.string('venue_name', 255).nullable();
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('tournaments', (table) => {
    table.dropColumn('is_single_venue');
    table.dropColumn('venue_name');
  });
};
