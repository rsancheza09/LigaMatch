import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('player_tournament_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
    table.uuid('tournament_id').notNullable().references('id').inTable('tournaments').onDelete('CASCADE');
    table
      .uuid('tournament_age_category_id')
      .notNullable()
      .references('id')
      .inTable('tournament_age_categories')
      .onDelete('CASCADE');
    table.timestamps(true, true);
    table.unique(['player_id', 'tournament_id']);
  });

  // Backfill: for each player with tournament_age_category_id set, insert into player_tournament_categories
  const rows = await knex('players')
    .select('players.id as player_id', 'tournament_age_categories.tournament_id', 'players.tournament_age_category_id')
    .join('tournament_age_categories', 'tournament_age_categories.id', 'players.tournament_age_category_id')
    .whereNotNull('players.tournament_age_category_id');
  if (rows.length > 0) {
    await knex('player_tournament_categories').insert(
      rows.map((r) => ({
        player_id: r.player_id,
        tournament_id: r.tournament_id,
        tournament_age_category_id: r.tournament_age_category_id,
      }))
    );
  }
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('player_tournament_categories');
};
