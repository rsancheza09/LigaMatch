/**
 * Match statistics by sport, based on official regulations:
 * - Soccer/Fútbol: FIFA Laws - yellow/red cards
 * - Futsal: FIFA - yellow/red cards, accumulated fouls, timeouts
 */

export type StatField = {
  key: string;
  labelKey: string;
  homeKey: string;
  awayKey: string;
};

export const MATCH_STATISTICS_BY_SPORT: Record<string, StatField[]> = {
  futsal: [
    { key: 'yellowCards', labelKey: 'stats.yellowCards', homeKey: 'yellowCardsHome', awayKey: 'yellowCardsAway' },
    { key: 'redCards', labelKey: 'stats.redCards', homeKey: 'redCardsHome', awayKey: 'redCardsAway' },
    { key: 'accumulatedFouls', labelKey: 'stats.accumulatedFouls', homeKey: 'accumulatedFoulsHome', awayKey: 'accumulatedFoulsAway' },
    { key: 'timeouts', labelKey: 'stats.timeouts', homeKey: 'timeoutsHome', awayKey: 'timeoutsAway' },
  ],
  soccer: [
    { key: 'yellowCards', labelKey: 'stats.yellowCards', homeKey: 'yellowCardsHome', awayKey: 'yellowCardsAway' },
    { key: 'redCards', labelKey: 'stats.redCards', homeKey: 'redCardsHome', awayKey: 'redCardsAway' },
  ],
};

export function getStatisticsForSport(sport: string): StatField[] {
  return MATCH_STATISTICS_BY_SPORT[sport] ?? [];
}
