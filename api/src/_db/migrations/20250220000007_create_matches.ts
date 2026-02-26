import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('matches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
    table.uuid('home_team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.uuid('away_team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.integer('round').notNullable().defaultTo(1); // 1 or 2 for round-robin
    table.timestamp('scheduled_at'); // nullable - admin can set later
    table.integer('home_score');
    table.integer('away_score');
    table.string('status', 20).notNullable().defaultTo('scheduled'); // scheduled, played, cancelled
    table.timestamps(true, true);
  });
  await knex.raw('ALTER TABLE matches ADD CONSTRAINT chk_matches_teams_different CHECK (home_team_id != away_team_id)');

  await knex.schema.raw(
    'CREATE UNIQUE INDEX matches_tournament_teams_round_unique ON matches (tournament_id, home_team_id, away_team_id, round)'
  );
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('matches');
  // constraint is dropped with table
};
