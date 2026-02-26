import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('users', (table) => {
    table.string('plan', 20).notNullable().defaultTo('free'); // free, pro
  });

  await knex.schema.alterTable('tournaments', (table) => {
    table.string('logo_url', 500);
    table.boolean('is_public').notNullable().defaultTo(false);
    table.jsonb('public_page_colors'); // { primary?: string, secondary?: string }
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('plan');
  });
  await knex.schema.alterTable('tournaments', (table) => {
    table.dropColumn('logo_url');
    table.dropColumn('is_public');
    table.dropColumn('public_page_colors');
  });
};
