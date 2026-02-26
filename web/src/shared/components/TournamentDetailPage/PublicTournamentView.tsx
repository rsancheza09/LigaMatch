import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import WarningIcon from '@mui/icons-material/Warning';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AppBar } from '@components/AppBar';
import type { Match } from '@shared/api/matches';
import { getStatisticsForSport } from '@shared/constants/matchStatistics';
import type { StandingRow, StandingsByGroup, Tournament } from '@shared/api/tournaments';

import logoUrl from '../../../assets/ligamatch-logo.png';

const defaultTeamLogoUrl = logoUrl;

const baseTheme = createTheme({
  palette: {
    primary: { main: '#1565c0', light: '#42a5f5', dark: '#0d47a1' },
    secondary: { main: '#2e7d32', light: '#4caf50', dark: '#1b5e20' },
    background: { default: '#f8fafc', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600 },
  },
  shape: { borderRadius: 16 },
});

type PublicTournamentViewProps = {
  tournament: Tournament;
  matches: Match[];
  standings: StandingRow[];
  standingsByGroup?: StandingsByGroup[];
  loadingMatches?: boolean;
  loadingStandings?: boolean;
  /** When true, renders without AppBar and with a preview header (for customize dialog) */
  previewMode?: boolean;
};

export function PublicTournamentView({
  tournament,
  matches,
  standings,
  standingsByGroup = [],
  loadingMatches = false,
  loadingStandings = false,
  previewMode = false,
}: PublicTournamentViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [matchStatsPopover, setMatchStatsPopover] = useState<{ anchor: HTMLElement; match: Match } | null>(null);

  const topScorers = useMemo(() => {
    const map = new Map<string, { playerName: string; teamName: string; goals: number }>();
    for (const m of matches) {
      const goals = (m.matchEvents ?? []).filter((e) => e.type === 'goal' && !e.ownGoal);
      for (const g of goals) {
        const key = g.playerId ?? g.playerName ?? 'unknown';
        const teamName = g.teamSide === 'home' ? (m.homeTeam?.name ?? '') : (m.awayTeam?.name ?? '');
        const prev = map.get(key);
        if (prev) {
          prev.goals += 1;
        } else {
          map.set(key, { playerName: g.playerName ?? '-', teamName, goals: 1 });
        }
      }
    }
    return [...map.entries()]
      .map(([, v]) => v)
      .filter((s) => s.goals > 0)
      .sort((a, b) => b.goals - a.goals);
  }, [matches]);

  const cardsByMatch = useMemo(() => {
    const rows: Array<{ matchId: string; date: string; matchLabel: string; type: 'yellow_card' | 'red_card'; playerName: string; minute?: number }> = [];
    for (const m of matches) {
      const cards = (m.matchEvents ?? []).filter((e) => e.type === 'yellow_card' || e.type === 'red_card');
      const matchLabel = `${m.homeTeam?.name ?? '-'} vs ${m.awayTeam?.name ?? '-'}`;
      const date = m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : '-';
      for (const c of cards) {
        rows.push({
          matchId: m.id,
          date,
          matchLabel,
          type: c.type as 'yellow_card' | 'red_card',
          playerName: c.playerName ?? '-',
          minute: c.minute,
        });
      }
    }
    return rows.sort((a, b) => {
      const da = matches.find((m) => m.id === a.matchId)?.scheduledAt ?? '';
      const db = matches.find((m) => m.id === b.matchId)?.scheduledAt ?? '';
      return new Date(da).getTime() - new Date(db).getTime();
    });
  }, [matches]);

  const customColors = tournament.publicPageColors;
  const sectionOrder = customColors?.sectionOrder?.length ? customColors.sectionOrder : ['matches', 'standings', 'topScorers', 'cards'];
  const sectionVisibility = customColors?.sectionVisibility ?? { matches: true, standings: true, topScorers: true, cards: true };
  const visibleSections = sectionOrder.filter((id) => sectionVisibility[id] !== false);
  const isSoccerFutsal = tournament.sport === 'soccer' || tournament.sport === 'futsal';
  const tournamentIsPro = !!(tournament.logoUrl || tournament.publicPageColors);
  /** When not PRO, public page shows only tournament info (hero) and standings */
  const sectionsToShow = tournamentIsPro ? visibleSections : ['standings'];

  const getBackgroundStyle = (): Record<string, unknown> => {
    const bg = customColors;
    if (!bg) return { backgroundColor: '#f8fafc' };
    const type = bg.backgroundType || 'color';
    if (type === 'gradient' && bg.backgroundGradient) {
      return { background: bg.backgroundGradient };
    }
    if (type === 'image' && bg.backgroundImage) {
      return {
        backgroundImage: `url(${bg.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    return { backgroundColor: bg.backgroundColor || '#f8fafc' };
  };

  const pageTheme = customColors
    ? createTheme({
        ...baseTheme,
        palette: {
          ...baseTheme.palette,
          primary: {
            main: customColors.primary || baseTheme.palette.primary.main,
            light: customColors.primary || baseTheme.palette.primary.light,
            dark: customColors.primary || baseTheme.palette.primary.dark,
          },
          secondary: customColors.secondary
            ? { main: customColors.secondary, light: customColors.secondary, dark: customColors.secondary }
            : baseTheme.palette.secondary,
        },
      })
    : baseTheme;

  const heroFontColor = customColors?.fontColor;

  return (
    <ThemeProvider theme={pageTheme}>
      <Box sx={{ minHeight: previewMode ? 'auto' : '100vh', maxWidth: '100%', ...getBackgroundStyle(), display: 'flex', flexDirection: 'column' }}>
        {previewMode ? (
          <Box sx={{ py: 1.5, px: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('tournament.detail.previewLabel')}
            </Typography>
          </Box>
        ) : (
          <AppBar
            title={tournament.name}
            showBackButton
            onBackClick={() => navigate(-1)}
            backAriaLabel={t('tournament.create.back')}
          />
        )}

        <Box component="main" sx={{ flex: 1, py: previewMode ? 2 : { xs: 3, md: 5 }, overflow: 'auto' }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
            {/* Hero - font color applies here only, not to sections */}
            <Box sx={heroFontColor ? { color: heroFontColor } : undefined}>
              <Card
                elevation={0}
                sx={{
                  mb: 4,
                  borderRadius: 3,
                  overflow: 'hidden',
                  background: `linear-gradient(135deg, ${pageTheme.palette.primary.main}15 0%, ${pageTheme.palette.secondary.main}10 100%)`,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <Box
                      component="img"
                      src={tournament.logoUrl || logoUrl}
                      alt={tournament.name}
                      sx={{
                        width: { xs: 72, md: 96 },
                        height: { xs: 72, md: 96 },
                        borderRadius: 2,
                        objectFit: tournament.logoUrl ? 'cover' : 'contain',
                        p: tournament.logoUrl ? 0 : 0.5,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="h4" fontWeight={700} color={heroFontColor ? 'inherit' : 'primary.main'} gutterBottom>
                        {tournament.name}
                      </Typography>
                      <Typography variant="body1" color={heroFontColor ? 'inherit' : 'text.secondary'}>
                        {t(`tournament.create.sport.options.${tournament.sport}`) || tournament.sport}
                        {tournament.location && ` · ${tournament.location}`}
                      </Typography>
                      {(tournament.startDate || tournament.endDate) && (
                        <Typography variant="body2" color={heroFontColor ? 'inherit' : 'text.secondary'} sx={{ mt: 1 }}>
                          {tournament.startDate}
                          {tournament.endDate && ` – ${tournament.endDate}`}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  {tournament.description && (
                    <Typography variant="body1" color={heroFontColor ? 'inherit' : 'text.secondary'} sx={{ mt: 3 }}>
                      {tournament.description}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>

            {sectionsToShow.map((sectionId) => {
              if (sectionId === 'matches') {
                return (
                  <Card
                    key="matches"
                    elevation={0}
                    sx={{ mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <CalendarMonthIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
                        <Typography variant="h6" fontWeight={600}>
                          {t('tournament.matches.title')}
                        </Typography>
                      </Box>
                      {loadingMatches ? (
                        <Typography color="text.secondary">{t('tournament.matches.loading')}</Typography>
                      ) : matches.length === 0 ? (
                        <Typography color="text.secondary">{t('tournament.matches.noMatches')}</Typography>
                      ) : (
                        <TableContainer sx={{ overflowX: 'auto' }}>
                          <Table size="small" sx={{ minWidth: 400 }}>
                            <TableHead>
                              <TableRow>
                                {matches.some((m) => m.group) && (
                                  <TableCell sx={{ fontWeight: 600 }}>{t('tournament.matches.group')}</TableCell>
                                )}
                                <TableCell sx={{ fontWeight: 600 }}>{t('tournament.matches.home')}</TableCell>
                                <TableCell align="center" sx={{ width: 72, fontWeight: 600 }}>vs</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{t('tournament.matches.away')}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{t('tournament.matches.scheduledAt')}</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {matches.map((m) => (
                                <TableRow key={m.id} hover>
                                  {matches.some((x) => x.group) && (
                                    <TableCell sx={{ color: 'text.secondary' }}>{m.group?.name ?? '—'}</TableCell>
                                  )}
                                  <TableCell sx={{ fontWeight: 500 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {tournamentIsPro && (
                                        <Box
                                          component="img"
                                          src={m.homeTeam?.logoUrl || defaultTeamLogoUrl}
                                          alt=""
                                          sx={{ width: 28, height: 28, borderRadius: 1, objectFit: 'cover' }}
                                        />
                                      )}
                                      <span>{m.homeTeam?.name ?? '-'}</span>
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                      {m.homeScore != null && m.awayScore != null ? `${m.homeScore}–${m.awayScore}` : '—'}
                                      <IconButton
                                        size="small"
                                        onClick={(e) => setMatchStatsPopover({ anchor: e.currentTarget, match: m })}
                                        aria-label={t('tournament.matches.viewStats')}
                                        sx={{ p: 0.25 }}
                                      >
                                        <InfoIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 500 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {tournamentIsPro && (
                                        <Box
                                          component="img"
                                          src={m.awayTeam?.logoUrl || defaultTeamLogoUrl}
                                          alt=""
                                          sx={{ width: 28, height: 28, borderRadius: 1, objectFit: 'cover' }}
                                        />
                                      )}
                                      <span>{m.awayTeam?.name ?? '-'}</span>
                                    </Box>
                                  </TableCell>
                                  <TableCell sx={{ color: 'text.secondary' }}>
                                    {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : '—'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                );
              }
              if (sectionId === 'standings') {
                const hasGroups = standingsByGroup.length > 0;
                return (
                  <Card
                    key="standings"
                    elevation={0}
                    sx={{ mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <EmojiEventsIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
                        <Typography variant="h6" fontWeight={600}>
                          {t('tournament.standings.title')}
                        </Typography>
                      </Box>
                      {loadingStandings ? (
                        <Typography color="text.secondary">{t('tournament.matches.loading')}</Typography>
                      ) : standings.length === 0 && !hasGroups ? (
                        <Typography color="text.secondary">{t('tournament.standings.empty')}</Typography>
                      ) : (
                        <>
                          {hasGroups && (
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                              {t('tournament.standings.generalTitle')}
                            </Typography>
                          )}
                          <TableContainer sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 360 }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ width: 40, fontWeight: 600 }}>{t('tournament.standings.pos')}</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>{t('tournament.standings.team')}</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.played')}</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.won')}</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.drawn')}</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.lost')}</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.goalsFor')}</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.goalsAgainst')}</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.goalDiff')}</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.points')}</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {standings.map((row, idx) => (
                                  <TableRow key={row.teamId} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>{idx + 1}</TableCell>
                                    <TableCell sx={{ fontWeight: 500 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {tournamentIsPro && (
                                          <Box
                                            component="img"
                                            src={row.teamLogoUrl || defaultTeamLogoUrl}
                                            alt=""
                                            sx={{ width: 28, height: 28, borderRadius: 1, objectFit: 'cover' }}
                                          />
                                        )}
                                        <span>{row.teamName}</span>
                                      </Box>
                                    </TableCell>
                                    <TableCell align="center">{row.played}</TableCell>
                                    <TableCell align="center">{row.won}</TableCell>
                                    <TableCell align="center">{row.drawn}</TableCell>
                                    <TableCell align="center">{row.lost}</TableCell>
                                    <TableCell align="center">{row.goalsFor}</TableCell>
                                    <TableCell align="center">{row.goalsAgainst}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: row.goalDiff !== 0 ? 600 : 400 }}>
                                      {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>{row.points}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          {standingsByGroup.map(({ groupId, groupName, standings: groupStandings }) => (
                            <Box key={groupId} sx={{ mt: 3 }}>
                              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                                {groupName}
                              </Typography>
                              <TableContainer sx={{ overflowX: 'auto' }}>
                                <Table size="small" sx={{ minWidth: 360 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ width: 40, fontWeight: 600 }}>{t('tournament.standings.pos')}</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>{t('tournament.standings.team')}</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.played')}</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.won')}</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.drawn')}</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.lost')}</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.goalsFor')}</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.goalsAgainst')}</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.goalDiff')}</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.standings.points')}</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {groupStandings.map((row, idx) => (
                                      <TableRow key={row.teamId} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>{idx + 1}</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {tournamentIsPro && (
                                              <Box
                                                component="img"
                                                src={row.teamLogoUrl || defaultTeamLogoUrl}
                                                alt=""
                                                sx={{ width: 28, height: 28, borderRadius: 1, objectFit: 'cover' }}
                                              />
                                            )}
                                            <span>{row.teamName}</span>
                                          </Box>
                                        </TableCell>
                                        <TableCell align="center">{row.played}</TableCell>
                                        <TableCell align="center">{row.won}</TableCell>
                                        <TableCell align="center">{row.drawn}</TableCell>
                                        <TableCell align="center">{row.lost}</TableCell>
                                        <TableCell align="center">{row.goalsFor}</TableCell>
                                        <TableCell align="center">{row.goalsAgainst}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: row.goalDiff !== 0 ? 600 : 400 }}>
                                          {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>{row.points}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          ))}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              }
              if (sectionId === 'topScorers' && isSoccerFutsal) {
                return (
                  <Card
                    key="topScorers"
                    elevation={0}
                    sx={{ mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <SportsSoccerIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
                        <Typography variant="h6" fontWeight={600}>
                          {t('tournament.topScorers.title')}
                        </Typography>
                      </Box>
                      {topScorers.length === 0 ? (
                        <Typography color="text.secondary">{t('tournament.topScorers.empty')}</Typography>
                      ) : (
                        <TableContainer sx={{ overflowX: 'auto' }}>
                          <Table size="small" sx={{ minWidth: 280 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ width: 40, fontWeight: 600 }}>{t('tournament.standings.pos')}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{t('tournament.topScorers.player')}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{t('tournament.topScorers.team')}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.topScorers.goals')}</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {topScorers.map((s, idx) => (
                                <TableRow key={`${s.playerName}-${s.teamName}-${idx}`} hover>
                                  <TableCell sx={{ fontWeight: 600 }}>{idx + 1}</TableCell>
                                  <TableCell sx={{ fontWeight: 500 }}>{s.playerName}</TableCell>
                                  <TableCell sx={{ color: 'text.secondary' }}>{s.teamName}</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 700 }}>{s.goals}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                );
              }
              if (sectionId === 'cards' && isSoccerFutsal) {
                return (
                  <Card
                    key="cards"
                    elevation={0}
                    sx={{ mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
                        <Typography variant="h6" fontWeight={600}>
                          {t('tournament.cardsByMatch.title')}
                        </Typography>
                      </Box>
                      {cardsByMatch.length === 0 ? (
                        <Typography color="text.secondary">{t('tournament.cardsByMatch.empty')}</Typography>
                      ) : (
                        <TableContainer sx={{ overflowX: 'auto' }}>
                          <Table size="small" sx={{ minWidth: 400 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>{t('tournament.cardsByMatch.date')}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{t('tournament.cardsByMatch.match')}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{t('tournament.cardsByMatch.card')}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{t('tournament.cardsByMatch.player')}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>{t('tournament.matches.minute')}</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {cardsByMatch.map((row, idx) => (
                                <TableRow key={`${row.matchId}-${row.type}-${row.playerName}-${idx}`} hover>
                                  <TableCell sx={{ color: 'text.secondary' }}>{row.date}</TableCell>
                                  <TableCell sx={{ fontWeight: 500 }}>{row.matchLabel}</TableCell>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      label={row.type === 'yellow_card' ? t('tournament.matches.stats.yellowCards') : t('tournament.matches.stats.redCards')}
                                      color={row.type === 'yellow_card' ? 'warning' : 'error'}
                                      sx={{ fontSize: '0.7rem', height: 22 }}
                                    />
                                  </TableCell>
                                  <TableCell>{row.playerName}</TableCell>
                                  <TableCell align="center">{row.minute ?? '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })}

            <Popover
              open={!!matchStatsPopover}
              anchorEl={matchStatsPopover?.anchor}
              onClose={() => setMatchStatsPopover(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              PaperProps={{ sx: { p: 2, maxWidth: 360 } }}
            >
              {matchStatsPopover?.match && (() => {
                const m = matchStatsPopover.match;
                const statFields = getStatisticsForSport(tournament.sport);
                const stats = m.statistics ?? {};
                const goals = (m.matchEvents ?? []).filter((e) => e.type === 'goal');
                const cards = (m.matchEvents ?? []).filter((e) => e.type === 'yellow_card' || e.type === 'red_card');
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {m.homeTeam?.name ?? '-'} vs {m.awayTeam?.name ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('tournament.matches.scheduledAt')}: {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('tournament.matches.venue')}: {m.venue?.name ?? tournament.isSingleVenue ? (tournament.venueName ?? '—') : '—'}
                    </Typography>
                    {m.homeScore != null && m.awayScore != null && (
                      <Typography variant="body2" fontWeight={600}>
                        {t('tournament.matches.homeScore')}: {m.homeScore} – {t('tournament.matches.awayScore')}: {m.awayScore}
                      </Typography>
                    )}
                    {statFields.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {t('tournament.matches.matchStats')}
                        </Typography>
                        {statFields.map((f) => (
                          <Typography key={f.key} variant="body2">
                            {t(`tournament.matches.${f.labelKey}`)}: {stats[f.homeKey] ?? 0} ({t('tournament.matches.home')}) – {stats[f.awayKey] ?? 0} ({t('tournament.matches.away')})
                          </Typography>
                        ))}
                      </Box>
                    )}
                    {goals.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {t('tournament.matches.goalScorers')}
                        </Typography>
                        {goals.map((g, i) => (
                          <Typography key={`${m.id}-goal-${i}-${g.playerId ?? ''}-${g.minute ?? ''}`} variant="body2">
                            {g.playerName ?? '-'} ({g.teamSide === 'home' ? m.homeTeam?.name : m.awayTeam?.name}){g.ownGoal ? ` (${t('tournament.matches.ownGoal')})` : ''}{g.minute != null ? ` ${g.minute}'` : ''}
                          </Typography>
                        ))}
                      </Box>
                    )}
                    {cards.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {t('tournament.matches.stats.yellowCards')} / {t('tournament.matches.stats.redCards')}
                        </Typography>
                        {cards.map((c, i) => (
                          <Typography key={`${m.id}-card-${i}-${c.type}-${c.playerId ?? ''}-${c.minute ?? ''}`} variant="body2">
                            {c.type === 'yellow_card' ? t('tournament.matches.stats.yellowCards') : t('tournament.matches.stats.redCards')}: {c.playerName ?? '-'} ({c.teamSide === 'home' ? m.homeTeam?.name : m.awayTeam?.name}){c.minute != null ? ` ${c.minute}'` : ''}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })()}
            </Popover>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
