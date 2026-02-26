import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 64).notNullable(); // team_invitation, team_joined_tournament, etc.
    table.string('title', 255).notNullable();
    table.text('body');
    table.string('link', 512); // optional deep link
    table.timestamp('read_at', { useTz: true });
    table.jsonb('metadata'); // extra payload (teamId, tournamentId, etc.)
    table.timestamps(true, true);
    table.index(['user_id', 'read_at']);
    table.index(['user_id', 'created_at']);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('notifications');
};
