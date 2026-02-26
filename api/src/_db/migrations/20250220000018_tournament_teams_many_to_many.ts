import type { Knex } from 'knex';

/**
 * Allow teams to belong to multiple tournaments (PRO feature).
 * - tournament_teams: junction table (tournament_id, team_id, group_id)
 * - teams: add sport column, keep tournament_id as "primary" tournament for backward compat
 */
export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('tournament_teams', (table) => {
    table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
    table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.uuid('group_id').references('id').inTable('tournament_groups').onDelete('SET NULL');
    table.timestamps(true, true);
    table.primary(['tournament_id', 'team_id']);
  });

  await knex.schema.alterTable('teams', (table) => {
    table.string('sport', 50); // soccer | futsal - required for multi-tournament
  });

  // Migrate: for each team, insert into tournament_teams and set sport from tournament
  const teams = await knex('teams').select('id', 'tournament_id', 'group_id');
  const now = new Date().toISOString();
  for (const t of teams) {
    if (!t.tournament_id) continue; // Skip teams without tournament (orphaned)
    const tournament = await knex('tournaments').where('id', t.tournament_id).first();
    if (tournament) {
      await knex('tournament_teams').insert({
        tournament_id: t.tournament_id,
        team_id: t.id,
        group_id: t.group_id || null,
        created_at: now,
        updated_at: now,
      });
      await knex('teams').where('id', t.id).update({
        sport: tournament.sport,
        updated_at: now,
      });
    }
  }

  // Set default sport for any teams still null (orphaned or edge case)
  await knex('teams').whereNull('sport').update({ sport: 'soccer', updated_at: now });

  // Make sport not nullable after backfill
  await knex.raw('ALTER TABLE teams ALTER COLUMN sport SET NOT NULL');
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('tournament_teams');
  await knex.schema.alterTable('teams', (table) => {
    table.dropColumn('sport');
  });
};
