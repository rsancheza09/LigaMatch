import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('team_technical_staff', (table) => {
    table.string('photo_url', 1024).nullable();
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('team_technical_staff', (table) => {
    table.dropColumn('photo_url');
  });
};
