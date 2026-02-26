import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('player_change_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
    table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.uuid('player_id').references('id').inTable('players').onDelete('CASCADE'); // null for type 'add'
    table.string('type', 16).notNullable(); // add, edit, delete
    table.jsonb('payload').notNullable(); // { name?, birthYear?, tournamentAgeCategoryId? } for add/edit
    table.uuid('requested_by_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('status', 16).notNullable().defaultTo('pending'); // pending, approved, rejected
    table.timestamp('decided_at', { useTz: true });
    table.uuid('decided_by_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
    table.index(['tournament_id', 'status']);
    table.index(['requested_by_user_id']);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('player_change_requests');
};
