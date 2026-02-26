import type { Knex } from 'knex';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'tournament';
}

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('tournaments', (table) => {
    table.string('slug', 255);
  });

  const rows = await knex('tournaments').select('id', 'name');
  const used = new Set<string>();
  for (const row of rows) {
    let slug = slugify(row.name);
    let candidate = slug;
    let suffix = 0;
    while (used.has(candidate)) {
      suffix++;
      candidate = `${slug}-${suffix}`;
    }
    used.add(candidate);
    await knex('tournaments').where({ id: row.id }).update({ slug: candidate });
  }

  await knex.schema.alterTable('tournaments', (table) => {
    table.string('slug', 255).notNullable().alter();
    table.unique(['slug']);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('tournaments', (table) => {
    table.dropColumn('slug');
  });
};
