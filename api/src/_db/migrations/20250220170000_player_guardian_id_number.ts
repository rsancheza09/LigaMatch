import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('players', (table) => {
    table.string('guardian_id_number', 64);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('players', (table) => {
    table.dropColumn('guardian_id_number');
  });
};
