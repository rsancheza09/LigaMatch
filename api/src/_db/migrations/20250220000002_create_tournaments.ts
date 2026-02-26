import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('tournaments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.string('sport', 50).notNullable();
    table.string('category_type', 20).notNullable().defaultTo('none'); // none, ages, subcategories
    table.string('tournament_type', 50); // ages = por edades, open = abierto
    table.string('name', 255).notNullable();
    table.text('description');
    table.date('start_date');
    table.date('end_date');
    table.string('location', 255);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('tournament_age_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.integer('min_birth_year').notNullable();
    table.integer('max_birth_year').notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('tournament_admins', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
    table.timestamps(true, true);
    table.unique(['user_id', 'tournament_id']);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('tournament_admins');
  await knex.schema.dropTableIfExists('tournament_age_categories');
  await knex.schema.dropTableIfExists('tournaments');
};
