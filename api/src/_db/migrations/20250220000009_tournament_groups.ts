import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('tournament_groups', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.alterTable('teams', (table) => {
    table.uuid('group_id').references('id').inTable('tournament_groups').onDelete('SET NULL');
  });

  await knex.schema.alterTable('matches', (table) => {
    table.uuid('group_id').references('id').inTable('tournament_groups').onDelete('SET NULL');
  });

  // Drop old unique index and create new one that includes group_id
  await knex.schema.raw('DROP INDEX IF EXISTS matches_tournament_teams_round_unique');
  await knex.schema.raw(
    `CREATE UNIQUE INDEX matches_tournament_group_teams_round_unique 
     ON matches (tournament_id, COALESCE(group_id, '00000000-0000-0000-0000-000000000000'::uuid), home_team_id, away_team_id, round)`
  );
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.raw('DROP INDEX IF EXISTS matches_tournament_group_teams_round_unique');
  await knex.schema.alterTable('matches', (table) => {
    table.dropColumn('group_id');
  });
  await knex.schema.alterTable('teams', (table) => {
    table.dropColumn('group_id');
  });
  await knex.schema.dropTableIfExists('tournament_groups');
  await knex.schema.raw(
    'CREATE UNIQUE INDEX matches_tournament_teams_round_unique ON matches (tournament_id, home_team_id, away_team_id, round)'
  );
};
