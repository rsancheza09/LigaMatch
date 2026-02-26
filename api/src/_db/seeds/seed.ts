import bcrypt from 'bcrypt';
import type { Knex } from 'knex';

/** Template image URLs for player photos (Unsplash portraits, w=200&h=200&fit=crop) */
const PLAYER_TEMPLATE_PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&q=80',
];

/** Test users – passwords meet requirements (8+ chars, upper, lower, number, special) */
export const TEST_USERS = {
  admin: { email: 'admin@ligamatch.local', password: 'Admin123!', name: 'System Admin' },
  demo: { email: 'demo@ligamatch.local', password: 'Demo123!', name: 'Demo User' },
  /** Team owners by tournament type – for testing team management flow */
  teamOwnerAmateur: { email: 'team-amateur@ligamatch.local', password: 'Team123!', name: 'Team Owner Amateur' },
  teamOwnerRecreational: { email: 'team-recreational@ligamatch.local', password: 'Team123!', name: 'Team Owner Recreational' },
  teamOwnerCompetitive: { email: 'team-competitive@ligamatch.local', password: 'Team123!', name: 'Team Owner Competitive' },
  teamOwner4: { email: 'team-owner-4@ligamatch.local', password: 'Team123!', name: 'Team Owner 4' },
} as const;

export const seed = async (knex: Knex): Promise<void> => {
  const roles = await knex('roles').select('id', 'name');
  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  const ensureUser = async (
    email: string,
    password: string,
    name: string,
    roleNames: string[],
    plan: 'free' | 'pro' = 'free'
  ) => {
    const existing = await knex('users').where({ email }).first();
    if (existing) return existing.id;

    const [user] = await knex('users')
      .insert({
        email,
        password_hash: await bcrypt.hash(password, 12),
        name,
        plan,
      })
      .returning('id');

    for (const rn of roleNames) {
      const roleId = roleMap[rn];
      if (roleId) {
        await knex('user_roles').insert({ user_id: user.id, role_id: roleId });
      }
    }
    return user.id;
  };

  await ensureUser(
    TEST_USERS.admin.email,
    TEST_USERS.admin.password,
    TEST_USERS.admin.name,
    ['system_admin'],
    'free'
  );

  const demoId = await ensureUser(
    TEST_USERS.demo.email,
    TEST_USERS.demo.password,
    TEST_USERS.demo.name,
    ['tournament_admin'],
    'pro'
  );

  const teamOwnerAmateurId = await ensureUser(
    TEST_USERS.teamOwnerAmateur.email,
    TEST_USERS.teamOwnerAmateur.password,
    TEST_USERS.teamOwnerAmateur.name,
    ['team_admin'],
    'free'
  );
  const teamOwnerRecreationalId = await ensureUser(
    TEST_USERS.teamOwnerRecreational.email,
    TEST_USERS.teamOwnerRecreational.password,
    TEST_USERS.teamOwnerRecreational.name,
    ['team_admin'],
    'free'
  );
  const teamOwnerCompetitiveId = await ensureUser(
    TEST_USERS.teamOwnerCompetitive.email,
    TEST_USERS.teamOwnerCompetitive.password,
    TEST_USERS.teamOwnerCompetitive.name,
    ['team_admin'],
    'free'
  );
  const teamOwner4Id = await ensureUser(
    TEST_USERS.teamOwner4.email,
    TEST_USERS.teamOwner4.password,
    TEST_USERS.teamOwner4.name,
    ['team_admin'],
    'free'
  );

  // Always ensure PRO tournaments exist (for Torneos recientes)
  const proTournaments = [
    {
      created_by: demoId,
      sport: 'soccer',
      category_type: 'none',
      tournament_type: 'open',
      name: 'Liga Pro Fútbol 2025',
      slug: 'liga-pro-futbol-2025',
      description: 'Liga profesional de fútbol con equipos de élite.',
      start_date: '2025-03-15',
      end_date: '2025-06-30',
      location: 'Estadio Nacional',
      is_public: true,
      logo_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&q=80',
      public_page_colors: { primary: '#1565c0', secondary: '#2e7d32' },
    },
    {
      created_by: demoId,
      sport: 'futsal',
      category_type: 'none',
      tournament_type: 'open',
      name: 'Copa Pro Fútbol Sala',
      slug: 'copa-pro-futbol-sala',
      description: 'Copa profesional de fútbol sala con equipos destacados.',
      start_date: '2025-04-10',
      end_date: '2025-06-20',
      location: 'Polideportivo Pro',
      is_public: true,
      logo_url: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=200&q=80',
      public_page_colors: { primary: '#1565c0', secondary: '#2e7d32' },
    },
  ];
  for (const pro of proTournaments) {
    const exists = await knex('tournaments').where({ slug: pro.slug }).first();
    if (!exists) {
      const [inserted] = await knex('tournaments').insert(pro).returning('id');
      await knex('tournament_admins').insert({ user_id: demoId, tournament_id: inserted.id });
    }
  }

  const existingCopa = await knex('tournaments').where({ slug: 'copa-local-2025' }).first();
  if (existingCopa) {
    // Ensure Copa Local is non-PRO (no logo, no custom colors)
    await knex('tournaments')
      .where({ id: existingCopa.id })
      .update({ logo_url: null, public_page_colors: null });
    // Ensure Copa Local has demo players even when tournament already exists
    const copaTeams = await knex('teams')
      .where({ tournament_id: existingCopa.id })
      .orderBy('name')
      .select('id');
    const teamIds = copaTeams.map((t) => t.id);
    const hasPlayers = teamIds.length > 0 && (await knex('players').whereIn('team_id', teamIds).first());
    const hasVenues = teamIds.length > 0 && (await knex('team_venues').whereIn('team_id', teamIds).first());
    if (!hasVenues) {
      for (const tid of teamIds) {
        await knex('team_venues').insert([
          { team_id: tid, name: 'Estadio Municipal', is_official: true, sort_order: 0 },
          { team_id: tid, name: 'Cancha Alterna', is_official: false, sort_order: 1 },
        ]);
      }
    }
    if (!hasPlayers && teamIds.length >= 4) {
      const [t1, t2, t3, t4] = teamIds;
      const playerRows = [
        { team_id: t1, name: 'Carlos Méndez', first_name: 'Carlos', last_name: 'Méndez', birth_year: 1995, birth_date: '1995-06-12', photo_url: PLAYER_TEMPLATE_PHOTOS[0] },
        { team_id: t1, name: 'Luis Rodríguez', first_name: 'Luis', last_name: 'Rodríguez', birth_year: 1998, birth_date: '1998-03-22', photo_url: PLAYER_TEMPLATE_PHOTOS[1] },
        { team_id: t1, name: 'Miguel Torres', first_name: 'Miguel', last_name: 'Torres', birth_year: 1996, birth_date: '1996-11-05', photo_url: PLAYER_TEMPLATE_PHOTOS[2] },
        { team_id: t2, name: 'Andrés García', first_name: 'Andrés', last_name: 'García', birth_year: 1994, birth_date: '1994-01-18', photo_url: PLAYER_TEMPLATE_PHOTOS[3] },
        { team_id: t2, name: 'Fernando López', first_name: 'Fernando', last_name: 'López', birth_year: 1997, birth_date: '1997-08-30', photo_url: PLAYER_TEMPLATE_PHOTOS[4] },
        { team_id: t2, name: 'Ricardo Sánchez', first_name: 'Ricardo', last_name: 'Sánchez', birth_year: 1999, birth_date: '1999-04-14', photo_url: PLAYER_TEMPLATE_PHOTOS[5] },
        { team_id: t3, name: 'Diego Martínez', first_name: 'Diego', last_name: 'Martínez', birth_year: 1996, birth_date: '1996-07-08', photo_url: PLAYER_TEMPLATE_PHOTOS[6] },
        { team_id: t3, name: 'Pablo Hernández', first_name: 'Pablo', last_name: 'Hernández', birth_year: 1995, birth_date: '1995-09-25', photo_url: PLAYER_TEMPLATE_PHOTOS[7] },
        { team_id: t3, name: 'Javier Ruiz', first_name: 'Javier', last_name: 'Ruiz', birth_year: 1998, birth_date: '1998-02-11', photo_url: PLAYER_TEMPLATE_PHOTOS[0] },
        { team_id: t4, name: 'Roberto Díaz', first_name: 'Roberto', last_name: 'Díaz', birth_year: 1997, birth_date: '1997-12-03', photo_url: PLAYER_TEMPLATE_PHOTOS[1] },
        { team_id: t4, name: 'Sergio Mora', first_name: 'Sergio', last_name: 'Mora', birth_year: 1994, birth_date: '1994-05-20', photo_url: PLAYER_TEMPLATE_PHOTOS[2] },
        { team_id: t4, name: 'Antonio Vega', first_name: 'Antonio', last_name: 'Vega', birth_year: 1996, birth_date: '1996-10-17', photo_url: PLAYER_TEMPLATE_PHOTOS[3] },
      ];
      await knex('players').insert(playerRows);
    }
    const demoIdForExtra = await knex('users').where({ email: TEST_USERS.demo.email }).first().then((u) => u?.id);
    const teamOwnerCompetitiveIdForExtra = await knex('users').where({ email: TEST_USERS.teamOwnerCompetitive.email }).first().then((u) => u?.id);
    if (demoIdForExtra && teamOwnerCompetitiveIdForExtra) {
      await ensureExtraTournamentsAndTeamsForCompetitive(knex, demoIdForExtra, teamOwnerCompetitiveIdForExtra);
    }
    return;
  }

  const tournamentCount = await knex('tournaments').count('*').first();
  const hasTournaments = Number(tournamentCount?.count ?? 0) > 0;

  const tournamentsToInsert: Array<Record<string, unknown>> = [
    // Soccer PRO
    {
      created_by: demoId,
      sport: 'soccer',
      category_type: 'none',
      tournament_type: 'open',
      name: 'Liga Pro Fútbol 2025',
      slug: 'liga-pro-futbol-2025',
      description: 'Liga profesional de fútbol con equipos de élite.',
      start_date: '2025-03-15',
      end_date: '2025-06-30',
      location: 'Estadio Nacional',
      is_public: true,
      logo_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&q=80',
      public_page_colors: { primary: '#1565c0', secondary: '#2e7d32' },
    },
    // Soccer no PRO
    {
      created_by: demoId,
      sport: 'soccer',
      category_type: 'none',
      tournament_type: 'open',
      name: 'Spring Soccer League 2025',
      slug: 'spring-soccer-league-2025',
      description: 'Community soccer league for all skill levels.',
      start_date: '2025-03-01',
      end_date: '2025-06-15',
      location: 'Central Park, Downtown',
      is_public: true,
    },
    // Futsal PRO
    {
      created_by: demoId,
      sport: 'futsal',
      category_type: 'none',
      tournament_type: 'open',
      name: 'Copa Pro Fútbol Sala',
      slug: 'copa-pro-futbol-sala',
      description: 'Copa profesional de fútbol sala con equipos destacados.',
      start_date: '2025-04-10',
      end_date: '2025-06-20',
      location: 'Polideportivo Pro',
      is_public: true,
      logo_url: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=200&q=80',
      public_page_colors: { primary: '#1565c0', secondary: '#2e7d32' },
    },
    // Futsal no PRO
    {
      created_by: demoId,
      sport: 'futsal',
      category_type: 'ages',
      tournament_type: 'ages',
      name: 'Campeonato Juvenil de Fútbol Sala',
      slug: 'campeonato-juvenil-futsal',
      description: 'Torneo de fútbol sala por categorías de edad.',
      start_date: '2025-04-01',
      end_date: '2025-05-20',
      location: 'Polideportivo Municipal',
      is_public: true,
    },
    {
      created_by: demoId,
      sport: 'futsal',
      category_type: 'none',
      tournament_type: 'open',
      name: 'Liga de Fútbol Sala Verano',
      slug: 'liga-futsal-verano',
      description: 'Torneo de fútbol sala de verano.',
      start_date: '2025-07-01',
      end_date: '2025-08-15',
      location: 'Gimnasio Central',
      is_public: false,
    },
    {
      created_by: demoId,
      sport: 'soccer',
      category_type: 'none',
      tournament_type: 'open',
      name: 'Copa Local 2025',
      slug: 'copa-local-2025',
      description: 'Torneo local con equipos registrados. Ideal para probar calendario y resultados.',
      start_date: '2025-05-01',
      end_date: '2025-07-31',
      location: 'Estadio Municipal',
      is_public: true,
    },
  ];

  if (hasTournaments) {
    const [t6] = await knex('tournaments')
      .insert(tournamentsToInsert[5])
      .returning('id');
    await knex('tournament_admins').insert({ user_id: demoId, tournament_id: t6.id });
    const [team4, team5, team6, team7] = await knex('teams')
      .insert([
        { tournament_id: t6.id, sport: 'soccer', name: 'Estrellas FC', owner_email: TEST_USERS.teamOwnerCompetitive.email },
        { tournament_id: t6.id, sport: 'soccer', name: 'Dragones FC', owner_email: TEST_USERS.teamOwnerRecreational.email },
        { tournament_id: t6.id, sport: 'soccer', name: 'Águilas FC', owner_email: TEST_USERS.teamOwnerAmateur.email },
        { tournament_id: t6.id, sport: 'soccer', name: 'Leones FC', owner_email: TEST_USERS.teamOwner4.email },
      ])
      .returning('id');
    await knex('team_members').insert([
      { team_id: team4.id, user_id: teamOwnerCompetitiveId, is_admin: true },
      { team_id: team5.id, user_id: teamOwnerRecreationalId, is_admin: true },
      { team_id: team6.id, user_id: teamOwnerAmateurId, is_admin: true },
      { team_id: team7.id, user_id: teamOwner4Id, is_admin: true },
    ]);
    for (const team of [team4, team5, team6, team7]) {
      await knex('tournament_teams').insert({ tournament_id: t6.id, team_id: team.id });
      await knex('team_venues').insert([
        { team_id: team.id, name: 'Estadio Municipal', is_official: true, sort_order: 0 },
        { team_id: team.id, name: 'Cancha Alterna', is_official: false, sort_order: 1 },
      ]);
    }
    // Demo players for Copa Local 2025 (team4–team7)
    await knex('players').insert([
      { team_id: team4.id, name: 'Carlos Méndez', first_name: 'Carlos', last_name: 'Méndez', birth_year: 1995, birth_date: '1995-06-12', photo_url: PLAYER_TEMPLATE_PHOTOS[0] },
      { team_id: team4.id, name: 'Luis Rodríguez', first_name: 'Luis', last_name: 'Rodríguez', birth_year: 1998, birth_date: '1998-03-22', photo_url: PLAYER_TEMPLATE_PHOTOS[1] },
      { team_id: team4.id, name: 'Miguel Torres', first_name: 'Miguel', last_name: 'Torres', birth_year: 1996, birth_date: '1996-11-05', photo_url: PLAYER_TEMPLATE_PHOTOS[2] },
      { team_id: team5.id, name: 'Andrés García', first_name: 'Andrés', last_name: 'García', birth_year: 1994, birth_date: '1994-01-18', photo_url: PLAYER_TEMPLATE_PHOTOS[3] },
      { team_id: team5.id, name: 'Fernando López', first_name: 'Fernando', last_name: 'López', birth_year: 1997, birth_date: '1997-08-30', photo_url: PLAYER_TEMPLATE_PHOTOS[4] },
      { team_id: team5.id, name: 'Ricardo Sánchez', first_name: 'Ricardo', last_name: 'Sánchez', birth_year: 1999, birth_date: '1999-04-14', photo_url: PLAYER_TEMPLATE_PHOTOS[5] },
      { team_id: team6.id, name: 'Diego Martínez', first_name: 'Diego', last_name: 'Martínez', birth_year: 1996, birth_date: '1996-07-08', photo_url: PLAYER_TEMPLATE_PHOTOS[6] },
      { team_id: team6.id, name: 'Pablo Hernández', first_name: 'Pablo', last_name: 'Hernández', birth_year: 1995, birth_date: '1995-09-25', photo_url: PLAYER_TEMPLATE_PHOTOS[7] },
      { team_id: team6.id, name: 'Javier Ruiz', first_name: 'Javier', last_name: 'Ruiz', birth_year: 1998, birth_date: '1998-02-11', photo_url: PLAYER_TEMPLATE_PHOTOS[0] },
      { team_id: team7.id, name: 'Roberto Díaz', first_name: 'Roberto', last_name: 'Díaz', birth_year: 1997, birth_date: '1997-12-03', photo_url: PLAYER_TEMPLATE_PHOTOS[1] },
      { team_id: team7.id, name: 'Sergio Mora', first_name: 'Sergio', last_name: 'Mora', birth_year: 1994, birth_date: '1994-05-20', photo_url: PLAYER_TEMPLATE_PHOTOS[2] },
      { team_id: team7.id, name: 'Antonio Vega', first_name: 'Antonio', last_name: 'Vega', birth_year: 1996, birth_date: '1996-10-17', photo_url: PLAYER_TEMPLATE_PHOTOS[3] },
    ]);
    await ensureExtraTournamentsAndTeamsForCompetitive(knex, demoId, teamOwnerCompetitiveId);
    return;
  }

  const [t1, t2, t3, t4, t5, t6] = await knex('tournaments')
    .insert(tournamentsToInsert)
    .returning('id');

  await knex('tournament_admins').insert([
    { user_id: demoId, tournament_id: t1.id },
    { user_id: demoId, tournament_id: t2.id },
    { user_id: demoId, tournament_id: t3.id },
    { user_id: demoId, tournament_id: t4.id },
    { user_id: demoId, tournament_id: t5.id },
    { user_id: demoId, tournament_id: t6.id },
  ]);

  if (t4.id) {
    await knex('tournament_age_categories').insert([
      { tournament_id: t4.id, name: 'U12', min_birth_year: 2013, max_birth_year: 2014 },
      { tournament_id: t4.id, name: 'U14', min_birth_year: 2011, max_birth_year: 2012 },
    ]);
  }

  const [team1, team2, team3, team4, team5, team6, team7, team8, team9] = await knex('teams')
    .insert([
      { tournament_id: t1.id, sport: 'soccer', name: 'Liga Pro FC', owner_email: TEST_USERS.teamOwnerCompetitive.email },
      { tournament_id: t2.id, sport: 'soccer', name: 'Central Park FC', owner_email: TEST_USERS.teamOwnerRecreational.email },
      { tournament_id: t3.id, sport: 'futsal', name: 'Copa Pro Sala', owner_email: TEST_USERS.teamOwnerAmateur.email },
      { tournament_id: t4.id, sport: 'futsal', name: 'Rápidos U12', owner_email: TEST_USERS.teamOwnerRecreational.email },
      { tournament_id: t5.id, sport: 'futsal', name: 'Estrellas FC Sala', owner_email: TEST_USERS.teamOwnerAmateur.email },
      { tournament_id: t6.id, sport: 'soccer', name: 'Estrellas FC', owner_email: TEST_USERS.teamOwnerCompetitive.email },
      { tournament_id: t6.id, sport: 'soccer', name: 'Dragones FC', owner_email: TEST_USERS.teamOwnerRecreational.email },
      { tournament_id: t6.id, sport: 'soccer', name: 'Águilas FC', owner_email: TEST_USERS.teamOwnerAmateur.email },
      { tournament_id: t6.id, sport: 'soccer', name: 'Leones FC', owner_email: TEST_USERS.teamOwner4.email },
    ])
    .returning('id');

  for (const [team, tid] of [
    [team1, t1],
    [team2, t2],
    [team3, t3],
    [team4, t4],
    [team5, t5],
    [team6, t6],
    [team7, t6],
    [team8, t6],
    [team9, t6],
  ] as const) {
    await knex('tournament_teams').insert({ tournament_id: tid.id, team_id: team.id });
  }

  await knex('team_members').insert([
    { team_id: team1.id, user_id: teamOwnerCompetitiveId, is_admin: true },
    { team_id: team2.id, user_id: teamOwnerRecreationalId, is_admin: true },
    { team_id: team3.id, user_id: teamOwnerAmateurId, is_admin: true },
    { team_id: team4.id, user_id: teamOwnerRecreationalId, is_admin: true },
    { team_id: team5.id, user_id: teamOwnerAmateurId, is_admin: true },
    { team_id: team6.id, user_id: teamOwnerCompetitiveId, is_admin: true },
    { team_id: team7.id, user_id: teamOwnerRecreationalId, is_admin: true },
    { team_id: team8.id, user_id: teamOwnerAmateurId, is_admin: true },
    { team_id: team9.id, user_id: teamOwner4Id, is_admin: true },
  ]);

  // Default venues: each team gets one official and one alternate
  const allTeams = [team1, team2, team3, team4, team5, team6, team7, team8, team9];
  const venueNames: Record<string, [string, string]> = {
    [team1.id]: ['Estadio Nacional', 'Cancha Alterna'],
    [team2.id]: ['Central Park Field', 'Downtown Arena'],
    [team3.id]: ['Polideportivo Pro', 'Gimnasio Escolar'],
    [team4.id]: ['Polideportivo Municipal', 'Gimnasio Escolar'],
    [team5.id]: ['Gimnasio Central', 'Cancha Alterna'],
    [team6.id]: ['Estadio Municipal', 'Cancha Alterna'],
    [team7.id]: ['Estadio Municipal', 'Cancha Secundaria'],
    [team8.id]: ['Estadio Municipal', 'Cancha Norte'],
    [team9.id]: ['Estadio Municipal', 'Cancha Sur'],
  };
  for (const team of allTeams) {
    const [official, alternate] = venueNames[team.id] ?? ['Sede Principal', 'Sede Alterna'];
    await knex('team_venues').insert([
      { team_id: team.id, name: official, is_official: true, sort_order: 0 },
      { team_id: team.id, name: alternate, is_official: false, sort_order: 1 },
    ]);
  }

  // Demo players for Copa Local 2025 (Estrellas, Dragones, Águilas, Leones)
  await knex('players').insert([
    { team_id: team6.id, name: 'Carlos Méndez', first_name: 'Carlos', last_name: 'Méndez', birth_year: 1995, birth_date: '1995-06-12', photo_url: PLAYER_TEMPLATE_PHOTOS[0] },
    { team_id: team6.id, name: 'Luis Rodríguez', first_name: 'Luis', last_name: 'Rodríguez', birth_year: 1998, birth_date: '1998-03-22', photo_url: PLAYER_TEMPLATE_PHOTOS[1] },
    { team_id: team6.id, name: 'Miguel Torres', first_name: 'Miguel', last_name: 'Torres', birth_year: 1996, birth_date: '1996-11-05', photo_url: PLAYER_TEMPLATE_PHOTOS[2] },
    { team_id: team7.id, name: 'Andrés García', first_name: 'Andrés', last_name: 'García', birth_year: 1994, birth_date: '1994-01-18', photo_url: PLAYER_TEMPLATE_PHOTOS[3] },
    { team_id: team7.id, name: 'Fernando López', first_name: 'Fernando', last_name: 'López', birth_year: 1997, birth_date: '1997-08-30', photo_url: PLAYER_TEMPLATE_PHOTOS[4] },
    { team_id: team7.id, name: 'Ricardo Sánchez', first_name: 'Ricardo', last_name: 'Sánchez', birth_year: 1999, birth_date: '1999-04-14', photo_url: PLAYER_TEMPLATE_PHOTOS[5] },
    { team_id: team8.id, name: 'Diego Martínez', first_name: 'Diego', last_name: 'Martínez', birth_year: 1996, birth_date: '1996-07-08', photo_url: PLAYER_TEMPLATE_PHOTOS[6] },
    { team_id: team8.id, name: 'Pablo Hernández', first_name: 'Pablo', last_name: 'Hernández', birth_year: 1995, birth_date: '1995-09-25', photo_url: PLAYER_TEMPLATE_PHOTOS[7] },
    { team_id: team8.id, name: 'Javier Ruiz', first_name: 'Javier', last_name: 'Ruiz', birth_year: 1998, birth_date: '1998-02-11', photo_url: PLAYER_TEMPLATE_PHOTOS[0] },
    { team_id: team9.id, name: 'Roberto Díaz', first_name: 'Roberto', last_name: 'Díaz', birth_year: 1997, birth_date: '1997-12-03', photo_url: PLAYER_TEMPLATE_PHOTOS[1] },
    { team_id: team9.id, name: 'Sergio Mora', first_name: 'Sergio', last_name: 'Mora', birth_year: 1994, birth_date: '1994-05-20', photo_url: PLAYER_TEMPLATE_PHOTOS[2] },
    { team_id: team9.id, name: 'Antonio Vega', first_name: 'Antonio', last_name: 'Vega', birth_year: 1996, birth_date: '1996-10-17', photo_url: PLAYER_TEMPLATE_PHOTOS[3] },
  ]);

  await ensureExtraTournamentsAndTeamsForCompetitive(knex, demoId, teamOwnerCompetitiveId);
};

/** Extra tournaments (different variables) and teams for team-competitive@ligamatch.local – no players */
async function ensureExtraTournamentsAndTeamsForCompetitive(
  knex: Knex,
  demoId: string,
  teamOwnerCompetitiveId: string
): Promise<void> {
  const extraTournaments = [
    {
      slug: 'liga-senior-futbol-2025',
      created_by: demoId,
      sport: 'soccer',
      category_type: 'ages',
      tournament_type: 'ages',
      name: 'Liga Senior Fútbol 2025',
      description: 'Torneo de fútbol por categorías de edad.',
      start_date: '2025-04-01',
      end_date: '2025-06-30',
      location: 'Complejo Deportivo',
      is_public: true,
    },
    {
      slug: 'copa-profesional-soccer',
      created_by: demoId,
      sport: 'soccer',
      category_type: 'none',
      tournament_type: 'open',
      name: 'Copa Profesional Soccer',
      description: 'Torneo profesional de fútbol.',
      start_date: '2025-05-01',
      end_date: '2025-08-31',
      location: 'Estadio Principal',
      is_public: true,
    },
    {
      slug: 'liga-futsal-semi-pro',
      created_by: demoId,
      sport: 'futsal',
      category_type: 'none',
      tournament_type: 'open',
      name: 'Liga Fútbol Sala Semi-Pro',
      description: 'Liga semi profesional de fútbol sala.',
      start_date: '2025-04-15',
      end_date: '2025-07-15',
      location: 'Polideportivo',
      is_public: true,
    },
    {
      slug: 'torneo-subcategorias-futsal',
      created_by: demoId,
      sport: 'futsal',
      category_type: 'subcategories',
      tournament_type: 'open',
      name: 'Torneo por Subcategorías Futsal',
      description: 'Torneo con subcategorías por tipo.',
      start_date: '2025-06-01',
      end_date: '2025-08-30',
      location: 'Gimnasio Central',
      is_public: false,
    },
    {
      slug: 'copa-amateur-soccer-2025',
      created_by: demoId,
      sport: 'soccer',
      category_type: 'none',
      tournament_type: 'open',
      name: 'Copa Amateur Fútbol 2025',
      description: 'Torneo amateur de fútbol.',
      start_date: '2025-05-10',
      end_date: '2025-07-20',
      location: 'Canchas Municipales',
      is_public: true,
    },
    {
      slug: 'torneo-juvenil-soccer-edades',
      created_by: demoId,
      sport: 'soccer',
      category_type: 'ages',
      tournament_type: 'ages',
      name: 'Torneo Juvenil Fútbol por Edades',
      description: 'Torneo juvenil con categorías U14, U16.',
      start_date: '2025-04-20',
      end_date: '2025-06-15',
      location: 'Complejo Juvenil',
      is_public: true,
    },
  ];

  const teamNamesBySlug: Record<string, string> = {
    'liga-senior-futbol-2025': 'Veteranos FC',
    'copa-profesional-soccer': 'Pro United',
    'liga-futsal-semi-pro': 'Sala Elite',
    'torneo-subcategorias-futsal': 'Subcategorías Sala',
    'copa-amateur-soccer-2025': 'Aficionados FC',
    'torneo-juvenil-soccer-edades': 'Juveniles FC',
  };

  for (const tr of extraTournaments) {
    const existing = await knex('tournaments').where({ slug: tr.slug }).first();
    let tid: string;
    if (existing) {
      tid = existing.id;
    } else {
      const [inserted] = await knex('tournaments').insert(tr).returning('id');
      tid = inserted.id;
      await knex('tournament_admins').insert({ user_id: demoId, tournament_id: tid });
    }

    const sport = tr.sport as string;
    const teamName = teamNamesBySlug[tr.slug];
    const existingTeam = await knex('teams')
      .where({ tournament_id: tid, owner_email: TEST_USERS.teamOwnerCompetitive.email })
      .first();
    if (existingTeam) continue;

    const [team] = await knex('teams')
      .insert({
        tournament_id: tid,
        sport,
        name: teamName,
        owner_email: TEST_USERS.teamOwnerCompetitive.email,
      })
      .returning('id');

    await knex('tournament_teams').insert({ tournament_id: tid, team_id: team.id });
    await knex('team_members').insert({ team_id: team.id, user_id: teamOwnerCompetitiveId, is_admin: true });
    await knex('team_venues').insert([
      { team_id: team.id, name: 'Sede Principal', is_official: true, sort_order: 0 },
      { team_id: team.id, name: 'Sede Alterna', is_official: false, sort_order: 1 },
    ]);
  }

  if (extraTournaments.some((t) => t.category_type === 'ages')) {
    const withAges = await knex('tournaments')
      .whereIn('slug', ['liga-senior-futbol-2025', 'torneo-juvenil-soccer-edades'])
      .select('id');
    for (const t of withAges) {
      const hasCategories = await knex('tournament_age_categories').where({ tournament_id: t.id }).first();
      if (!hasCategories) {
        await knex('tournament_age_categories').insert([
          { tournament_id: t.id, name: 'U14', min_birth_year: 2011, max_birth_year: 2012 },
          { tournament_id: t.id, name: 'U16', min_birth_year: 2009, max_birth_year: 2010 },
        ]);
      }
    }
  }
}
