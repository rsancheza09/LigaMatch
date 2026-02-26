import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('teams', (table) => {
    table.string('owner_email', 255);
    table.string('description', 500);
  });

  await knex.schema.createTable('team_invitations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.string('email', 255).notNullable();
    table.string('token', 64).notNullable().unique();
    table.string('status', 20).notNullable().defaultTo('pending'); // pending, accepted, expired
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);
    table.unique(['team_id', 'email']);
  });

  await knex.schema.createTable('players', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.integer('birth_year'); // for age category assignment when tournament has categoryType 'ages'
    table.uuid('tournament_age_category_id').references('id').inTable('tournament_age_categories').onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('players');
  await knex.schema.dropTableIfExists('team_invitations');
  await knex.schema.alterTable('teams', (table) => {
    table.dropColumn('owner_email');
    table.dropColumn('description');
  });
};
