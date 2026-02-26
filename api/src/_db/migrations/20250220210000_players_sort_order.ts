import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('players', (table) => {
    table.integer('sort_order').notNullable().defaultTo(0);
  });
  // Backfill: per team, set sort_order by created_at order (knexfile uses snakeCase mappers so rows have camelCase keys)
  const teams = await knex('players').distinct('team_id').select('team_id');
  for (const row of teams) {
    const teamId = (row as { teamId: string }).teamId;
    const ids = await knex('players')
      .where({ teamId })
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .select('id');
    for (let i = 0; i < ids.length; i++) {
      await knex('players').where({ id: (ids[i] as { id: string }).id }).update({ sortOrder: i });
    }
  }
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('players', (table) => {
    table.dropColumn('sort_order');
  });
};
