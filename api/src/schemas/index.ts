import Joi from 'joi';

// Allow .local and other TLDs for development (e.g. admin@ligamatch.local)
const emailSchema = () => Joi.string().email({ tlds: { allow: false } }).required();

// Auth schemas
export const authRegisterPayload = Joi.object({
  email: emailSchema().description('User email'),
  password: Joi.string().min(8).required().description('Password (min 8 chars, uppercase, lowercase, number, special)'),
  name: Joi.string().max(255).optional().allow('').description('Display name'),
});

export const authLoginPayload = Joi.object({
  email: emailSchema().description('User email'),
  password: Joi.string().required().description('Password'),
});

export const authForgotPasswordPayload = Joi.object({
  email: emailSchema().description('User email'),
});

export const authResetPasswordPayload = Joi.object({
  token: Joi.string().min(32).max(64).required().description('Reset token from email link'),
  newPassword: Joi.string().min(8).required().description('New password (min 8 chars, uppercase, lowercase, number, special)'),
});

export const authUpdateMePayload = Joi.object({
  name: Joi.string().max(255).optional().allow('', null).description('Display name'),
});

export const authResponse = Joi.object({
  token: Joi.string().description('JWT token'),
  user: Joi.object({
    id: Joi.string().uuid().description('User ID'),
    email: Joi.string().email().description('User email'),
    name: Joi.string().allow(null).description('Display name'),
  }),
});

export const userSchema = Joi.object({
  id: Joi.string().uuid().description('User ID'),
  email: Joi.string().email().description('User email'),
  name: Joi.string().allow(null).description('Display name'),
  createdAt: Joi.string().isoDate().description('Creation date'),
});

export const userWithRolesSchema = userSchema.keys({
  roles: Joi.array().items(Joi.string()).description('Role names'),
});

// Tournament schemas
const ageCategorySchema = Joi.object({
  name: Joi.string().required().description('Category name'),
  minBirthYear: Joi.number().integer().required().description('Min birth year'),
  maxBirthYear: Joi.number().integer().required().description('Max birth year'),
});

export const tournamentUpdatePayload = Joi.object({
  sport: Joi.string().max(50).optional().description('Sport type'),
  categoryType: Joi.string().valid('none', 'ages', 'subcategories').optional().description('Category type'),
  tournamentType: Joi.string().valid('ages', 'open', 'recreational', 'competitive').optional().allow(null).description('Tournament type (optional; ages = by age categories, open = open to all, competitive = competitive)'),
  name: Joi.string().max(255).optional().description('Tournament name'),
  description: Joi.string().optional().allow('').description('Description'),
  startDate: Joi.string().isoDate().optional().allow(null).description('Start date (YYYY-MM-DD)'),
  endDate: Joi.string().isoDate().optional().allow(null).description('End date (YYYY-MM-DD)'),
  location: Joi.string().max(255).optional().allow('').description('Location'),
  isSingleVenue: Joi.boolean().optional().description('When true, all matches use the tournament venue; team venues not required'),
  venueName: Joi.string().max(255).optional().allow('', null).description('Venue name when isSingleVenue is true'),
  ageCategories: Joi.array().items(ageCategorySchema).optional().description('Age categories (when categoryType is ages)'),
  standingsOrder: Joi.array().items(Joi.string().uuid()).optional().allow(null).description('Manual order of team IDs for standings table'),
  logoUrl: Joi.string().optional().allow(null, '').description('Tournament logo: URL or base64 data URL (data:image/...)'),
  publicPageColors: Joi.object({
    primary: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional().allow(null),
    secondary: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional().allow(null),
    fontColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional().allow(null),
    backgroundType: Joi.string().valid('color', 'gradient', 'image').optional().allow(null),
    backgroundColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional().allow(null),
    backgroundGradient: Joi.string().max(500).optional().allow(null, ''),
    backgroundImage: Joi.string().max(2_000_000).optional().allow(null, ''),
    sectionOrder: Joi.array().items(Joi.string().valid('matches', 'standings', 'topScorers', 'cards')).optional().allow(null),
    sectionVisibility: Joi.object().pattern(Joi.string().valid('matches', 'standings', 'topScorers', 'cards'), Joi.boolean()).optional().allow(null),
  }).optional().allow(null).description('Custom colors and layout for public page'),
});

export const tournamentCreatePayload = Joi.object({
  sport: Joi.string().max(50).required().description('Sport type: soccer or futsal'),
  categoryType: Joi.string().valid('none', 'ages', 'subcategories').default('none').description('Category type'),
  tournamentType: Joi.string().valid('ages', 'open', 'recreational', 'competitive').optional().description('Tournament type (optional; ages = by age categories, open = open to all, competitive = competitive)'),
  name: Joi.string().max(255).required().description('Tournament name'),
  description: Joi.string().optional().allow('').description('Description'),
  startDate: Joi.string().isoDate().optional().description('Start date (YYYY-MM-DD)'),
  endDate: Joi.string().isoDate().optional().description('End date (YYYY-MM-DD)'),
  location: Joi.string().max(255).optional().allow('').description('Location'),
  isSingleVenue: Joi.boolean().optional().description('When true, all matches use one venue; teams do not add venues'),
  venueName: Joi.string().max(255).optional().allow('', null).description('Venue name when isSingleVenue is true'),
  ageCategories: Joi.array().items(ageCategorySchema).optional().description('Age categories (when categoryType is ages)'),
});

export const tournamentSchema = Joi.object({
  id: Joi.string().uuid().description('Tournament ID'),
  sport: Joi.string().description('Sport type'),
  categoryType: Joi.string().description('Category type'),
  tournamentType: Joi.string().allow(null).description('Tournament type'),
  name: Joi.string().description('Tournament name'),
  description: Joi.string().allow(null).description('Description'),
  startDate: Joi.string().allow(null).description('Start date'),
  endDate: Joi.string().allow(null).description('End date'),
  location: Joi.string().allow(null).description('Location'),
  createdAt: Joi.string().isoDate().description('Creation date'),
  updatedAt: Joi.string().isoDate().description('Last update'),
});

export const tournamentWithAgeCategoriesSchema = tournamentSchema.keys({
  ageCategories: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid(),
      name: Joi.string(),
      minBirthYear: Joi.number(),
      maxBirthYear: Joi.number(),
    })
  ).optional(),
});

// User management schemas
export const userCreatePayload = Joi.object({
  email: emailSchema().description('User email'),
  password: Joi.string().min(8).required().description('Password'),
  name: Joi.string().max(255).optional().allow('').description('Display name'),
  roleNames: Joi.array().items(Joi.string().valid('system_admin', 'tournament_admin', 'team_admin')).optional().description('Roles to assign'),
});

export const userUpdateRolesPayload = Joi.object({
  roleNames: Joi.array().items(Joi.string().valid('system_admin', 'tournament_admin', 'team_admin')).required().description('Role names'),
});

// Common
export const uuidParam = Joi.object({
  id: Joi.string().uuid().required().description('Resource ID'),
});

export const slugOrIdParam = Joi.object({
  slugOrId: Joi.string().min(1).max(255).required().description('Tournament ID (UUID) or slug (for public pages)'),
});

// Team schemas
export const teamCreatePayload = Joi.object({
  name: Joi.string().max(255).required().description('Team name'),
  description: Joi.string().max(500).optional().allow('').description('Team description'),
  ownerEmail: Joi.string().email({ tlds: { allow: false } }).required().description('Email to invite team owner'),
});

export const teamAddExistingPayload = Joi.object({
  teamId: Joi.string().uuid().required().description('ID of existing team to add'),
});

export const teamInvitePayload = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required().description('Email to invite'),
});

export const authRegisterByInvitePayload = authRegisterPayload.keys({
  inviteToken: Joi.string().length(64).required().description('Invitation token from email'),
});

const playerDocumentItemSchema = Joi.object({
  documentType: Joi.string().valid('player_id_copy', 'birth_certificate', 'guardian_id_copy').required(),
  fileUrl: Joi.string().max(1024).required(),
  fileName: Joi.string().max(255).optional(),
  mimeType: Joi.string().max(128).optional(),
});

export const playerCreatePayload = Joi.object({
  name: Joi.string().max(255).optional().description('Player name (legacy; use firstName+lastName)'),
  firstName: Joi.string().max(255).optional().description('First name'),
  lastName: Joi.string().max(255).optional().description('Last name'),
  birthYear: Joi.number().integer().min(1900).max(2030).optional().description('Birth year (for age categories)'),
  birthDate: Joi.string().isoDate().optional().description('Full date of birth YYYY-MM-DD'),
  tournamentAgeCategoryId: Joi.string().uuid().optional().description('Age category when tournament has categoryType ages'),
  idDocumentType: Joi.string().max(64).optional().allow('', null).description('ID type: cedula_nacional, cedula_residencia, pasaporte, dimex'),
  idDocumentNumber: Joi.string().max(64).optional().allow('', null),
  guardianName: Joi.string().max(255).optional().allow('', null),
  guardianRelation: Joi.string().max(64).optional().allow('', null).description('padre, madre, encargado'),
  guardianIdNumber: Joi.string().max(64).optional().allow('', null).description('Cédula del padre, madre o encargado'),
  guardianPhone: Joi.string().max(64).optional().allow('', null),
  guardianEmail: Joi.string().email({ tlds: { allow: false } }).max(255).optional().allow('', null),
  photoUrl: Joi.string().max(1024).optional().allow('', null),
  documents: Joi.array().items(playerDocumentItemSchema).optional().description('Attached documents'),
});

export const playerUpdatePayload = Joi.object({
  name: Joi.string().max(255).optional().description('Player name'),
  firstName: Joi.string().max(255).optional().allow('', null),
  lastName: Joi.string().max(255).optional().allow('', null),
  birthYear: Joi.number().integer().min(1900).max(2030).optional().description('Birth year'),
  birthDate: Joi.string().isoDate().optional().allow('', null),
  tournamentAgeCategoryId: Joi.string().uuid().allow(null).optional().description('Age category'),
  idDocumentType: Joi.string().max(64).optional().allow('', null),
  idDocumentNumber: Joi.string().max(64).optional().allow('', null),
  guardianName: Joi.string().max(255).optional().allow('', null),
  guardianRelation: Joi.string().max(64).optional().allow('', null),
  guardianIdNumber: Joi.string().max(64).optional().allow('', null),
  guardianPhone: Joi.string().max(64).optional().allow('', null),
  guardianEmail: Joi.string().email({ tlds: { allow: false } }).max(255).optional().allow('', null),
  photoUrl: Joi.string().max(1024).optional().allow('', null),
  documents: Joi.array().items(playerDocumentItemSchema).optional(),
});

export const playerUploadPayload = Joi.object({
  type: Joi.string().valid('photo', 'player_id_copy', 'birth_certificate', 'guardian_id_copy').required(),
  fileBase64: Joi.string().required().description('Base64 or data URL of the file'),
  fileName: Joi.string().max(255).required(),
  mimeType: Joi.string().max(128).required(),
});

export const inviteTokenParam = Joi.object({
  token: Joi.string().length(64).required().description('Invitation token'),
});

// Match schemas
export const matchCreatePayload = Joi.object({
  homeTeamId: Joi.string().uuid().required().description('Home team ID'),
  awayTeamId: Joi.string().uuid().required().description('Away team ID'),
  round: Joi.number().integer().min(1).optional().description('Round number (auto-assigned if omitted)'),
  suspendedMatchId: Joi.string().uuid().allow(null).optional().description('ID of suspended match when this is a rescheduled match'),
  venueId: Joi.string().uuid().allow(null).optional().description('Venue ID (must belong to home team; defaults to home official venue)'),
  scheduledAt: Joi.string().isoDate().allow(null).optional().description('Match date/time (ISO 8601)'),
});

export const matchGeneratePayload = Joi.object({
  rounds: Joi.number().valid(1, 2).required().description('Number of rounds (1 or 2)'),
  mode: Joi.string().valid('all', 'groups').default('all').optional().description('all = all teams, groups = by groups'),
  numGroups: Joi.number().integer().min(2).max(8).optional().description('Number of groups (required when mode is groups)'),
});

const matchEventSchema = Joi.object({
  type: Joi.string().valid('goal', 'yellow_card', 'red_card').required(),
  teamSide: Joi.string().valid('home', 'away').required(),
  playerId: Joi.string().uuid().optional(),
  playerName: Joi.string().max(255).optional(),
  minute: Joi.number().integer().min(0).max(999).optional(),
  ownGoal: Joi.boolean().optional().description('When true, goal counts for opponent; excluded from top scorers'),
});

const matchPenaltySchema = Joi.object({
  type: Joi.string().valid('player', 'team', 'staff').required(),
  targetId: Joi.string().uuid().optional(),
  targetName: Joi.string().max(255).optional(),
  description: Joi.string().max(500).optional(),
  amount: Joi.number().min(0).optional().description('Monetary amount (uses user locale currency)'),
  currency: Joi.string().length(3).optional().description('ISO 4217 currency code (e.g. USD, MXN, EUR)'),
});

export const matchUpdatePayload = Joi.object({
  scheduledAt: Joi.string().isoDate().allow(null).optional().description('Match date/time (ISO 8601)'),
  homeScore: Joi.number().integer().min(0).allow(null).optional().description('Home team score'),
  awayScore: Joi.number().integer().min(0).allow(null).optional().description('Away team score'),
  status: Joi.string().valid('scheduled', 'played', 'suspended', 'cancelled').optional().description('Match status'),
  venueId: Joi.string().uuid().allow(null).optional().description('Venue ID (must belong to home team)'),
  statistics: Joi.object().pattern(Joi.string(), Joi.number().integer().min(0)).optional()
    .description('Sport-specific match statistics (e.g. yellowCardsHome, redCardsAway)'),
  matchEvents: Joi.array().items(matchEventSchema).optional().allow(null)
    .description('Goals and cards with player association'),
  matchExtraPoints: Joi.object({
    home: Joi.number().integer().min(0).optional(),
    away: Joi.number().integer().min(0).optional(),
  }).optional().allow(null).description('PRO: extra points per team'),
  matchPenalties: Joi.array().items(matchPenaltySchema).optional().allow(null)
    .description('PRO: penalties/fines to players, staff, or teams'),
});

export const playerSetCategoryPayload = Joi.object({
  tournamentId: Joi.string().uuid().required().description('Tournament the team participates in'),
  tournamentAgeCategoryId: Joi.string().uuid().required().description('Age category of that tournament'),
});

export const playerReorderPayload = Joi.object({
  playerIds: Joi.array().items(Joi.string().uuid()).required().description('Player IDs in the desired order'),
});

export const teamVenueCreatePayload = Joi.object({
  name: Joi.string().max(255).required().description('Venue name'),
  isOfficial: Joi.boolean().default(true).optional().description('true = official venue, false = alternate'),
});

export const teamVenueUpdatePayload = Joi.object({
  name: Joi.string().max(255).optional().description('Venue name'),
  isOfficial: Joi.boolean().optional().description('true = official venue, false = alternate'),
});

const technicalStaffType = Joi.string().valid('coach', 'assistant', 'masseur', 'utilero').required();

export const teamTechnicalStaffCreatePayload = Joi.object({
  fullName: Joi.string().max(255).required().description('Full name'),
  idDocumentNumber: Joi.string().max(64).required().description('ID document number'),
  type: technicalStaffType.description('coach | assistant | masseur | utilero'),
  coachLicense: Joi.string().max(255).optional().allow('', null).description('Coach license (optional)'),
  photoUrl: Joi.string().max(1024).optional().allow('', null).description('Photo URL (from upload)'),
});

export const teamTechnicalStaffUpdatePayload = Joi.object({
  fullName: Joi.string().max(255).optional(),
  idDocumentNumber: Joi.string().max(64).optional(),
  type: technicalStaffType.optional(),
  coachLicense: Joi.string().max(255).optional().allow('', null),
  photoUrl: Joi.string().max(1024).optional().allow('', null),
});

export const teamUniformCreatePayload = Joi.object({
  jerseyColor: Joi.string().max(64).required().description('Jersey color'),
  shortsColor: Joi.string().max(64).required().description('Shorts color'),
  socksColor: Joi.string().max(64).required().description('Socks color'),
});

export const teamUniformUpdatePayload = Joi.object({
  jerseyColor: Joi.string().max(64).optional(),
  shortsColor: Joi.string().max(64).optional(),
  socksColor: Joi.string().max(64).optional(),
});

export const matchIdParam = Joi.object({
  id: Joi.string().uuid().required().description('Match ID'),
});

export const healthResponse = Joi.object({
  status: Joi.string().valid('OK').description('API status'),
});
