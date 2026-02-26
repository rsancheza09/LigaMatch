import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('matches', (table) => {
    // Events: goals and cards with player association
    // [{ type: 'goal'|'yellow_card'|'red_card', teamId, playerId?, playerName?, minute? }]
    table.jsonb('match_events').nullable();
    // PRO: extra points per team { home?: number, away?: number }
    table.jsonb('match_extra_points').nullable();
    // PRO: penalties/fines [{ type: 'player'|'team'|'staff', targetId?, targetName?, description?, pointsDeducted? }]
    table.jsonb('match_penalties').nullable();
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('matches', (table) => {
    table.dropColumn('match_events');
    table.dropColumn('match_extra_points');
    table.dropColumn('match_penalties');
  });
};
