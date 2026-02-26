import { apiRequest } from './client';

export type AgeCategoryPayload = {
  name: string;
  minBirthYear: number;
  maxBirthYear: number;
};

export type CreateTournamentPayload = {
  sport: string;
  categoryType: string;
  tournamentType?: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  isSingleVenue?: boolean;
  venueName?: string | null;
  ageCategories?: AgeCategoryPayload[];
  standingsOrder?: string[] | null;
  logoUrl?: string | null;
  publicPageColors?: {
    primary?: string;
    secondary?: string;
    fontColor?: string | null;
    backgroundType?: 'color' | 'gradient' | 'image' | null;
    backgroundColor?: string | null;
    backgroundGradient?: string | null;
    backgroundImage?: string | null;
    sectionOrder?: string[] | null;
    sectionVisibility?: Record<string, boolean> | null;
  } | null;
};

export type TournamentTeam = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

export type StandingRow = {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  extraPoints?: number;
};

export type StandingsByGroup = {
  groupId: string;
  groupName: string;
  standings: StandingRow[];
};

export type Tournament = {
  id: string;
  slug: string;
  isTournamentAdmin?: boolean;
  status?: string;
  sport: string;
  categoryType: string;
  tournamentType?: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  isSingleVenue?: boolean;
  venueName?: string | null;
  logoUrl?: string;
  isPublic?: boolean;
  publicPageColors?: {
    primary?: string;
    secondary?: string;
    fontColor?: string | null;
    backgroundType?: 'color' | 'gradient' | 'image' | null;
    backgroundColor?: string | null;
    backgroundGradient?: string | null;
    backgroundImage?: string | null;
    sectionOrder?: string[] | null;
    sectionVisibility?: Record<string, boolean> | null;
  };
  standingsOrder?: string[] | null;
  createdAt: string;
  /** Number of pending player change requests (only in admin list). */
  pendingPlayerChangeRequestCount?: number;
  ageCategories?: Array<{
    id: string;
    name: string;
    minBirthYear: number;
    maxBirthYear: number;
  }>;
  teams?: TournamentTeam[];
};

export async function listTournaments(params?: {
  sport?: string;
  proOnly?: boolean;
  limit?: number;
}): Promise<Tournament[]> {
  const searchParams = new URLSearchParams();
  if (params?.sport) searchParams.set('sport', params.sport);
  if (params?.proOnly) searchParams.set('proOnly', 'true');
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return apiRequest<Tournament[]>(`/tournaments${qs ? `?${qs}` : ''}`);
}

export async function getMyTournaments(): Promise<Tournament[]> {
  return apiRequest<Tournament[]>('/tournaments/admin/mine');
}

export async function createTournament(
  payload: CreateTournamentPayload
): Promise<Tournament> {
  return apiRequest<Tournament>('/tournaments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getTournament(slugOrId: string): Promise<Tournament> {
  return apiRequest<Tournament>(`/tournaments/${encodeURIComponent(slugOrId)}`);
}

export async function updateTournament(
  id: string,
  payload: Partial<CreateTournamentPayload>
): Promise<Tournament> {
  return apiRequest<Tournament>(`/tournaments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Upload tournament logo image (Cloudinary). Returns URL to use in logoUrl. */
export async function uploadTournamentLogo(
  tournamentId: string,
  fileBase64: string,
  fileName?: string,
  mimeType?: string
): Promise<{ url: string }> {
  return apiRequest<{ url: string }>(`/tournaments/${encodeURIComponent(tournamentId)}/upload-logo`, {
    method: 'POST',
    body: JSON.stringify({ fileBase64, fileName, mimeType }),
  });
}

/** Upload tournament public page background image (Cloudinary). Returns URL to use in publicPageColors.backgroundImage. */
export async function uploadTournamentBackground(
  tournamentId: string,
  fileBase64: string,
  fileName?: string,
  mimeType?: string
): Promise<{ url: string }> {
  return apiRequest<{ url: string }>(`/tournaments/${encodeURIComponent(tournamentId)}/upload-background`, {
    method: 'POST',
    body: JSON.stringify({ fileBase64, fileName, mimeType }),
  });
}

export async function suspendTournament(id: string): Promise<Tournament> {
  return apiRequest<Tournament>(`/tournaments/${encodeURIComponent(id)}/suspend`, {
    method: 'PATCH',
  });
}

export async function renewTournament(id: string): Promise<Tournament> {
  return apiRequest<Tournament>(`/tournaments/${encodeURIComponent(id)}/renew`, {
    method: 'PATCH',
  });
}

export async function deleteTournament(id: string): Promise<void> {
  return apiRequest<void>(`/tournaments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function getStandings(tournamentId: string): Promise<{
  standings: StandingRow[];
  standingsGeneral?: StandingRow[];
  standingsByGroup?: StandingsByGroup[];
}> {
  return apiRequest<{
    standings: StandingRow[];
    standingsGeneral?: StandingRow[];
    standingsByGroup?: StandingsByGroup[];
  }>(`/tournaments/${encodeURIComponent(tournamentId)}/standings`);
}

export type TournamentPlayerRow = {
  id: string;
  teamId: string;
  teamName: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  birthYear?: number;
  tournamentAgeCategoryId?: string | null;
  ageCategoryName?: string | null;
  idDocumentNumber?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

const PLAYERS_PAGE_SIZE = 10;

export type GetTournamentPlayersResponse = {
  players: TournamentPlayerRow[];
  total: number;
};

export async function getTournamentPlayers(
  tournamentId: string,
  options?: { teamId?: string; ageCategoryId?: string | null; page?: number; limit?: number }
): Promise<GetTournamentPlayersResponse> {
  const params = new URLSearchParams();
  if (options?.teamId) params.set('teamId', options.teamId);
  if (options?.ageCategoryId) params.set('ageCategoryId', options.ageCategoryId);
  params.set('page', String(options?.page ?? 1));
  params.set('limit', String(options?.limit ?? PLAYERS_PAGE_SIZE));
  const qs = params.toString();
  return apiRequest<GetTournamentPlayersResponse>(
    `/tournaments/${encodeURIComponent(tournamentId)}/players?${qs}`
  );
}

export async function updateTournamentStandingsOrder(
  id: string,
  standingsOrder: string[]
): Promise<Tournament> {
  return apiRequest<Tournament>(`/tournaments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ standingsOrder }),
  });
}

export type BroadcastMessagePayload = {
  body: string;
  teamIds?: string[];
};

export type TournamentBroadcastItem = {
  id: string;
  body: string;
  sentCount: number;
  createdAt: string;
  senderId?: string;
  sender?: { id: string; name?: string; email: string };
};

export type ListTournamentBroadcastsResponse = {
  broadcasts: TournamentBroadcastItem[];
};

export function listTournamentBroadcasts(tournamentId: string): Promise<ListTournamentBroadcastsResponse> {
  return apiRequest<ListTournamentBroadcastsResponse>(`/tournaments/${encodeURIComponent(tournamentId)}/broadcasts`);
}

export function deleteTournamentBroadcast(tournamentId: string, broadcastId: string): Promise<void> {
  return apiRequest<void>(
    `/tournaments/${encodeURIComponent(tournamentId)}/broadcasts/${encodeURIComponent(broadcastId)}`,
    { method: 'DELETE' }
  );
}

export async function broadcastMessageToTeams(
  tournamentId: string,
  payload: BroadcastMessagePayload
): Promise<{ sent: number }> {
  return apiRequest<{ sent: number }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/messages/broadcast`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}
