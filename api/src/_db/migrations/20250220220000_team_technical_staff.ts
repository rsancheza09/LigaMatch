import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('team_technical_staff', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    table.string('full_name', 255).notNullable();
    table.string('id_document_number', 64).notNullable();
    table.string('type', 32).notNullable(); // coach | assistant | masseur | utilero
    table.string('coach_license', 255).nullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamps(true, true);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('team_technical_staff');
};
