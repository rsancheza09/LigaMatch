import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('teams', (table) => {
    table.text('logo_url');
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('teams', (table) => {
    table.dropColumn('logo_url');
  });
};
