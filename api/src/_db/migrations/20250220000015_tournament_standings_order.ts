import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('tournaments', (table) => {
    table.jsonb('standings_order'); // Array of team IDs in manual order: ["uuid1","uuid2",...]
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('tournaments', (table) => {
    table.dropColumn('standings_order');
  });
};
