import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('team_uniforms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.string('jersey_color', 64).notNullable();
    table.string('shorts_color', 64).notNullable();
    table.string('socks_color', 64).notNullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamps(true, true);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('team_uniforms');
};
