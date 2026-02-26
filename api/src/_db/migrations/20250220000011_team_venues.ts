import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('team_venues', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.boolean('is_official').notNullable().defaultTo(true); // true = sede oficial, false = sede alterna
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.alterTable('matches', (table) => {
    table.uuid('venue_id').nullable().references('id').inTable('team_venues').onDelete('SET NULL');
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('matches', (table) => {
    table.dropColumn('venue_id');
  });
  await knex.schema.dropTableIfExists('team_venues');
};
