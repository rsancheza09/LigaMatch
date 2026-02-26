import { apiRequest, getApiBase } from './client';

export type PlayerDocumentItem = {
  id?: string;
  documentType: 'player_id_copy' | 'birth_certificate' | 'guardian_id_copy';
  fileUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
};

/** Category assigned to a player in a specific tournament (when team participates in multiple or age-based). */
export type PlayerCategoryByTournament = Record<
  string,
  { categoryId: string; categoryName: string }
>;

export type Player = {
  id: string;
  teamId: string;
  name: string;
  birthYear?: number;
  tournamentAgeCategoryId?: string;
  /** Category per tournament id when team participates in multiple / age-based tournaments. */
  categoryByTournament?: PlayerCategoryByTournament;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianIdNumber?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  photoUrl?: string | null;
  documents?: PlayerDocumentItem[];
  sortOrder?: number;
  /** 'active' = inscrito, 'unsubscribed' = desinscrito */
  status?: 'active' | 'unsubscribed';
  createdAt: string;
};

export type TeamVenue = {
  id: string;
  teamId: string;
  name: string;
  isOfficial: boolean;
  sortOrder: number;
  createdAt: string;
};

export type TeamTechnicalStaff = {
  id: string;
  teamId: string;
  fullName: string;
  idDocumentNumber: string;
  type: 'coach' | 'assistant' | 'masseur' | 'utilero';
  coachLicense?: string | null;
  photoUrl?: string | null;
  sortOrder: number;
  createdAt: string;
};

export type TeamUniform = {
  id: string;
  teamId: string;
  jerseyColor: string;
  shortsColor: string;
  socksColor: string;
  sortOrder: number;
  createdAt: string;
};

export type TournamentRequiringConfiguration = {
  id: string;
  name: string;
  slug: string;
};

export type Team = {
  id: string;
  tournamentId: string;
  name: string;
  logoUrl?: string | null;
  ownerEmail?: string;
  description?: string;
  createdAt: string;
  players?: Player[];
  venues?: TeamVenue[];
  technicalStaff?: TeamTechnicalStaff[];
  uniforms?: TeamUniform[];
  tournament?: {
    id?: string;
    name?: string;
    slug?: string;
    logoUrl?: string | null;
    description?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    isPublic?: boolean;
    isSingleVenue?: boolean;
    categoryType?: string;
    sport?: string;
    ageCategories?: Array<{
      id: string;
      name: string;
      minBirthYear: number;
      maxBirthYear: number;
    }>;
  };
  /** Tournaments the team participates in (primary + added via tournament_teams). */
  participatingTournaments?: Array<{
    id: string;
    name: string;
    slug: string;
    categoryType: string;
    ageCategories?: Array<{ id: string; name: string; minBirthYear: number; maxBirthYear: number }>;
  }>;
  /** When team was added to other tournaments with different format (e.g. age categories). Team admin must adjust. */
  tournamentsRequiringConfiguration?: TournamentRequiringConfiguration[];
  /** True when the current user is an admin of the team's tournament (can edit players directly without approval). */
  isTournamentAdmin?: boolean;
  /** Resolved owner (when team has ownerEmail). */
  owner?: { email: string; name?: string };
}

export type CreateTeamPayload = {
  name: string;
  description?: string;
  ownerEmail: string;
};

export type AddPlayerPayload = {
  name?: string;
  firstName?: string;
  lastName?: string;
  birthYear?: number;
  birthDate?: string;
  tournamentAgeCategoryId?: string;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianIdNumber?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  photoUrl?: string | null;
  documents?: Array<{ documentType: string; fileUrl: string; fileName?: string; mimeType?: string }>;
};

export type AddPlayerResponse = Player | {
  id: string;
  status: 'pending';
  message: string;
};

export type UpdatePlayerPayload = {
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
  birthYear?: number;
  birthDate?: string | null;
  tournamentAgeCategoryId?: string | null;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianIdNumber?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  photoUrl?: string | null;
  documents?: Array<{ documentType: string; fileUrl: string; fileName?: string; mimeType?: string }>;
};

/** Payload of a player change request (add/edit). API may return more fields. */
export type PlayerChangeRequestPayload = {
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
  birthYear?: number;
  birthDate?: string | null;
  tournamentAgeCategoryId?: string | null;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  photoUrl?: string | null;
  documents?: Array<{ documentType: string; fileUrl: string; fileName?: string; mimeType?: string }>;
};

export type PlayerChangeRequestItem = {
  id: string;
  tournamentId: string;
  teamId: string;
  playerId: string | null;
  type: 'add' | 'edit' | 'delete';
  payload: PlayerChangeRequestPayload;
  requestedByUserId: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt: string | null;
  decidedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  team?: { id: string; name: string };
  player?: Player | null;
  requestedByUser?: { id: string; name?: string };
  teamOwner?: { id: string; name?: string };
  tournament?: { id: string; name?: string; slug?: string };
};

export type AvailableTeam = {
  id: string;
  name: string;
  sport: string;
  tournamentId: string;
  tournament?: { id: string; name: string; slug: string };
};

export async function createTeam(
  tournamentId: string,
  payload: CreateTeamPayload
): Promise<Team & { inviteUrl?: string }> {
  return apiRequest<Team & { inviteUrl?: string }>(`/tournaments/${tournamentId}/teams`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listAvailableTeams(tournamentId: string): Promise<AvailableTeam[]> {
  return apiRequest<AvailableTeam[]>(`/tournaments/${tournamentId}/teams/available`);
}

export type AddExistingTeamResponse = Team & {
  /** When true, the tournament has a different format (e.g. age categories); team owner will see a warning to adjust configuration. */
  requiresConfigurationForTeamOwner?: boolean;
};

export async function addExistingTeam(
  tournamentId: string,
  teamId: string
): Promise<AddExistingTeamResponse> {
  return apiRequest<AddExistingTeamResponse>(`/tournaments/${tournamentId}/teams/add-existing`, {
    method: 'POST',
    body: JSON.stringify({ teamId }),
  });
}

export async function getMyTeams(): Promise<Team[]> {
  return apiRequest<Team[]>('/teams/mine');
}

export async function getTeam(teamId: string): Promise<Team> {
  return apiRequest<Team>(`/teams/${teamId}`);
}

export async function addPlayer(
  teamId: string,
  payload: AddPlayerPayload
): Promise<AddPlayerResponse> {
  return apiRequest<AddPlayerResponse>(`/teams/${teamId}/players`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePlayer(
  teamId: string,
  playerId: string,
  payload: UpdatePlayerPayload
): Promise<Player | AddPlayerResponse> {
  return apiRequest<Player | AddPlayerResponse>(`/teams/${teamId}/players/${playerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export type SetPlayerCategoryPayload = {
  tournamentId: string;
  tournamentAgeCategoryId: string;
};

export async function setPlayerCategoryForTournament(
  teamId: string,
  playerId: string,
  payload: SetPlayerCategoryPayload
): Promise<{ id: string; tournamentAgeCategoryId: string; tournamentAgeCategory?: { id: string; name: string } }> {
  return apiRequest(`/teams/${teamId}/players/${playerId}/category`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function reorderPlayers(
  teamId: string,
  playerIds: string[]
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/teams/${teamId}/players/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ playerIds }),
  });
}

export async function removePlayer(
  teamId: string,
  playerId: string
): Promise<{ success?: boolean } | AddPlayerResponse> {
  return apiRequest<{ success?: boolean } | AddPlayerResponse>(`/teams/${teamId}/players/${playerId}`, {
    method: 'DELETE',
  });
}

export type PlayerUploadType = 'photo' | 'player_id_copy' | 'birth_certificate' | 'guardian_id_copy';

export async function uploadPlayerFile(
  teamId: string,
  type: PlayerUploadType,
  fileBase64: string,
  fileName: string,
  mimeType: string
): Promise<{ url: string; fileName: string; mimeType: string }> {
  return apiRequest<{ url: string; fileName: string; mimeType: string }>(
    `/teams/${teamId}/players/upload`,
    {
      method: 'POST',
      body: JSON.stringify({ type, fileBase64, fileName, mimeType }),
    }
  );
}

/** Full URL to view/download an uploaded player file. If url is already absolute (e.g. Cloudinary), returns as-is. */
export function getPlayerFileUrl(teamId: string, url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = url.replace(/^players\//, '');
  return `${getApiBase()}/teams/${teamId}/uploads/players/${base}`;
}

export async function listPlayerChangeRequests(
  tournamentId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<PlayerChangeRequestItem[]> {
  const q = status ? `?status=${status}` : '';
  return apiRequest<PlayerChangeRequestItem[]>(`/tournaments/${tournamentId}/player-change-requests${q}`);
}

export async function getPlayerChangeRequest(requestId: string): Promise<PlayerChangeRequestItem> {
  return apiRequest<PlayerChangeRequestItem>(`/player-change-requests/${requestId}`);
}

export async function approvePlayerChangeRequest(requestId: string): Promise<PlayerChangeRequestItem> {
  return apiRequest<PlayerChangeRequestItem>(`/player-change-requests/${requestId}/approve`, {
    method: 'POST',
  });
}

export async function rejectPlayerChangeRequest(requestId: string): Promise<PlayerChangeRequestItem> {
  return apiRequest<PlayerChangeRequestItem>(`/player-change-requests/${requestId}/reject`, {
    method: 'POST',
  });
}

/** List player change requests for a team (team owner/member). */
export async function listTeamPlayerChangeRequests(
  teamId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<PlayerChangeRequestItem[]> {
  const q = status ? `?status=${status}` : '';
  return apiRequest<PlayerChangeRequestItem[]>(`/teams/${teamId}/player-change-requests${q}`);
}

/** Resend notification to tournament admin(s) for a pending request. */
export async function resendPlayerChangeRequestNotification(requestId: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/player-change-requests/${requestId}/resend-notification`, {
    method: 'POST',
  });
}

export async function listTeamVenues(teamId: string): Promise<TeamVenue[]> {
  return apiRequest<TeamVenue[]>(`/teams/${teamId}/venues`);
}

export async function addTeamVenue(
  teamId: string,
  payload: { name: string; isOfficial?: boolean }
): Promise<TeamVenue> {
  return apiRequest<TeamVenue>(`/teams/${teamId}/venues`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTeamVenue(
  teamId: string,
  venueId: string,
  payload: { name?: string; isOfficial?: boolean }
): Promise<TeamVenue> {
  return apiRequest<TeamVenue>(`/teams/${teamId}/venues/${venueId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function removeTeamVenue(teamId: string, venueId: string): Promise<void> {
  return apiRequest(`/teams/${teamId}/venues/${venueId}`, { method: 'DELETE' });
}

export async function listTechnicalStaff(teamId: string): Promise<TeamTechnicalStaff[]> {
  return apiRequest<TeamTechnicalStaff[]>(`/teams/${teamId}/technical-staff`);
}

export type AddTechnicalStaffPayload = {
  fullName: string;
  idDocumentNumber: string;
  type: 'coach' | 'assistant' | 'masseur' | 'utilero';
  coachLicense?: string | null;
  photoUrl?: string | null;
};

export async function addTechnicalStaff(
  teamId: string,
  payload: AddTechnicalStaffPayload
): Promise<TeamTechnicalStaff> {
  return apiRequest<TeamTechnicalStaff>(`/teams/${teamId}/technical-staff`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTechnicalStaff(
  teamId: string,
  staffId: string,
  payload: Partial<AddTechnicalStaffPayload>
): Promise<TeamTechnicalStaff> {
  return apiRequest<TeamTechnicalStaff>(`/teams/${teamId}/technical-staff/${staffId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function removeTechnicalStaff(teamId: string, staffId: string): Promise<void> {
  return apiRequest(`/teams/${teamId}/technical-staff/${staffId}`, { method: 'DELETE' });
}

export async function listUniforms(teamId: string): Promise<TeamUniform[]> {
  return apiRequest<TeamUniform[]>(`/teams/${teamId}/uniforms`);
}

export type AddUniformPayload = {
  jerseyColor: string;
  shortsColor: string;
  socksColor: string;
};

export async function addUniform(teamId: string, payload: AddUniformPayload): Promise<TeamUniform> {
  return apiRequest<TeamUniform>(`/teams/${teamId}/uniforms`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUniform(
  teamId: string,
  uniformId: string,
  payload: Partial<AddUniformPayload>
): Promise<TeamUniform> {
  return apiRequest<TeamUniform>(`/teams/${teamId}/uniforms/${uniformId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function removeUniform(teamId: string, uniformId: string): Promise<void> {
  return apiRequest(`/teams/${teamId}/uniforms/${uniformId}`, { method: 'DELETE' });
}

export async function getInvitationByToken(token: string): Promise<{
  token: string;
  email: string;
  teamName: string;
  tournamentName: string;
}> {
  return apiRequest(`/invitations/${token}`);
}
