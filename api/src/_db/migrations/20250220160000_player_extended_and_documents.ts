import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('players', (table) => {
    table.string('first_name', 255);
    table.string('last_name', 255);
    table.date('birth_date');
    table.string('id_document_type', 64); // cedula_nacional, cedula_residencia, pasaporte, dimex, etc.
    table.string('id_document_number', 64);
    table.string('guardian_name', 255);
    table.string('guardian_relation', 64); // padre, madre, encargado
    table.string('guardian_phone', 64);
    table.string('guardian_email', 255);
    table.string('photo_url', 1024);
  });

  await knex.schema.createTable('player_documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
    table.string('document_type', 64).notNullable(); // player_id_copy, birth_certificate, guardian_id_copy
    table.string('file_url', 1024).notNullable();
    table.string('file_name', 255);
    table.string('mime_type', 128);
    table.timestamps(true, true);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('player_documents');
  await knex.schema.alterTable('players', (table) => {
    table.dropColumn('first_name');
    table.dropColumn('last_name');
    table.dropColumn('birth_date');
    table.dropColumn('id_document_type');
    table.dropColumn('id_document_number');
    table.dropColumn('guardian_name');
    table.dropColumn('guardian_relation');
    table.dropColumn('guardian_phone');
    table.dropColumn('guardian_email');
    table.dropColumn('photo_url');
  });
};
