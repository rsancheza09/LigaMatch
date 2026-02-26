import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { Match, MatchEvent, MatchPenalty } from '@shared/api/matches';
import { getStatisticsForSport } from '@shared/constants/matchStatistics';
import type { Tournament } from '@shared/api/tournaments';
import { getLocalDayRange, getTodayLocalDateString } from '@shared/utils/dateUtils';

type GenerateReportDialogProps = {
  open: boolean;
  onClose: () => void;
  tournament: Tournament;
  matches: Match[];
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function GenerateReportDialog({
  open,
  onClose,
  tournament,
  matches,
}: GenerateReportDialogProps) {
  const { t } = useTranslation();
  const today = getTodayLocalDateString();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      const now = getTodayLocalDateString();
      setStartDate(now);
      setEndDate(now);
    }
  }, [open]);

  const filteredMatches = matches.filter((m) => {
    const matchTime = m.scheduledAt ? new Date(m.scheduledAt).getTime() : 0;
    const startRange = getLocalDayRange(startDate);
    const endRange = getLocalDayRange(endDate);
    if (!startRange || !endRange) return false;
    return matchTime >= startRange.startMs && matchTime <= endRange.endMs;
  });

  const handleGenerate = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let y = 15;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(tournament.name, 14, y);
      y += 10;

      // Tournament info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const sportLabel = t(`tournament.create.sport.options.${tournament.sport}`) || tournament.sport;
      doc.text(`${t('tournament.report.sport')}: ${sportLabel}`, 14, y);
      y += 6;
      if (tournament.location) {
        doc.text(`${t('tournament.report.location')}: ${tournament.location}`, 14, y);
        y += 6;
      }
      doc.text(`${t('tournament.report.dateRange')}: ${startDate} - ${endDate}`, 14, y);
      y += 6;
      doc.text(`${t('tournament.report.generatedAt')}: ${new Date().toLocaleString()}`, 14, y);
      y += 12;

      const statFields = getStatisticsForSport(tournament.sport);

      // Matches table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(t('tournament.matches.title'), 14, y);
      y += 8;

      const matchRows = filteredMatches.map((m) => {
        const score = m.homeScore != null && m.awayScore != null ? `${m.homeScore} - ${m.awayScore}` : '—';
        const date = formatDate(m.scheduledAt);
        const home = m.homeTeam?.name ?? '-';
        const away = m.awayTeam?.name ?? '-';
        const stats: string[] = [];
        if (m.statistics && statFields.length > 0) {
          for (const f of statFields) {
            const h = m.statistics[f.homeKey] ?? 0;
            const a = m.statistics[f.awayKey] ?? 0;
            stats.push(`${h}-${a}`);
          }
        }
        return [date, home, score, away, ...stats];
      });

      const matchHeaders = [
        t('tournament.matches.scheduledAt'),
        t('tournament.matches.home'),
        t('tournament.report.result'),
        t('tournament.matches.away'),
        ...statFields.map((f) => t(`tournament.matches.${f.labelKey}`)),
      ];

      autoTable(doc, {
        startY: y,
        head: [matchHeaders],
        body: matchRows,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      if (y > 250) {
        doc.addPage();
        y = 15;
      }

      // Top scorers (soccer/futsal)
      const isSoccerFutsal = tournament.sport === 'soccer' || tournament.sport === 'futsal';
      if (isSoccerFutsal) {
        const goalsMap = new Map<string, { playerName: string; teamName: string; goals: number }>();
        for (const m of filteredMatches) {
          const goals = (m.matchEvents ?? []).filter((e) => e.type === 'goal' && !(e as MatchEvent & { ownGoal?: boolean }).ownGoal);
          for (const g of goals) {
            const key = g.playerId ?? g.playerName ?? 'unknown';
            const teamName = g.teamSide === 'home' ? (m.homeTeam?.name ?? '') : (m.awayTeam?.name ?? '');
            const prev = goalsMap.get(key);
            if (prev) prev.goals += 1;
            else goalsMap.set(key, { playerName: g.playerName ?? '-', teamName, goals: 1 });
          }
        }
        const topScorers = [...goalsMap.values()].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(t('tournament.topScorers.title'), 14, y);
        y += 8;

        if (topScorers.length > 0) {
          autoTable(doc, {
            startY: y,
            head: [[t('tournament.standings.pos'), t('tournament.topScorers.player'), t('tournament.topScorers.team'), t('tournament.topScorers.goals')]],
            body: topScorers.map((s, i) => [String(i + 1), s.playerName, s.teamName, String(s.goals)]),
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 139, 202] },
          });
          y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(t('tournament.topScorers.empty'), 14, y);
          y += 10;
        }

        if (y > 250) {
          doc.addPage();
          y = 15;
        }

        // Cards
        const cardsRows: Array<{ date: string; match: string; type: string; player: string; minute?: number }> = [];
        for (const m of filteredMatches) {
          const cards = (m.matchEvents ?? []).filter((e) => e.type === 'yellow_card' || e.type === 'red_card');
          const matchLabel = `${m.homeTeam?.name ?? '-'} vs ${m.awayTeam?.name ?? '-'}`;
          const date = m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : '-';
          for (const c of cards) {
            cardsRows.push({
              date,
              match: matchLabel,
              type: c.type === 'yellow_card' ? t('tournament.matches.stats.yellowCards') : t('tournament.matches.stats.redCards'),
              player: c.playerName ?? '-',
              minute: c.minute,
            });
          }
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(t('tournament.cardsByMatch.title'), 14, y);
        y += 8;

        if (cardsRows.length > 0) {
          autoTable(doc, {
            startY: y,
            head: [[t('tournament.cardsByMatch.date'), t('tournament.cardsByMatch.match'), t('tournament.cardsByMatch.card'), t('tournament.cardsByMatch.player'), t('tournament.matches.minute')]],
            body: cardsRows.map((r) => [r.date, r.match, r.type, r.player, r.minute != null ? String(r.minute) : '-']),
            theme: 'grid',
            styles: { fontSize: 7 },
            headStyles: { fillColor: [66, 139, 202] },
          });
          y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(t('tournament.cardsByMatch.empty'), 14, y);
          y += 10;
        }

        if (y > 250) {
          doc.addPage();
          y = 15;
        }
      }

      // Penalties
      const allPenalties: Array<{ match: string; type: string; target: string; description: string; amount: string }> = [];
      for (const m of filteredMatches) {
        const pens = (m.matchPenalties ?? []) as MatchPenalty[];
        const matchLabel = `${m.homeTeam?.name ?? '-'} vs ${m.awayTeam?.name ?? '-'}`;
        for (const p of pens) {
          const typeKey = p.type === 'player' ? 'penaltyPlayer' : p.type === 'team' ? 'penaltyTeam' : 'penaltyStaff';
          const target = p.targetName ?? '-';
          const amount = p.amount != null ? `${p.currency ?? ''} ${p.amount}` : '-';
          allPenalties.push({
            match: matchLabel,
            type: t(`tournament.matches.${typeKey}`),
            target,
            description: p.description ?? '-',
            amount,
          });
        }
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(t('tournament.report.penalties'), 14, y);
      y += 8;

      if (allPenalties.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [[t('tournament.cardsByMatch.match'), t('tournament.report.penaltyType'), t('tournament.report.penaltyTarget'), t('tournament.matches.penaltyDescription'), t('tournament.matches.penaltyAmount')]],
          body: allPenalties.map((p) => [p.match, p.type, p.target, p.description, p.amount]),
          theme: 'grid',
          styles: { fontSize: 7 },
          headStyles: { fillColor: [66, 139, 202] },
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(t('tournament.report.noPenalties'), 14, y);
      }

      const filename = `reporte-${tournament.name.replace(/\s+/g, '-')}-${startDate}-${endDate}.pdf`;
      doc.save(filename);
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('tournament.report.title')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('tournament.report.description')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('tournament.report.startDate')}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label={t('tournament.report.endDate')}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <Typography variant="caption" color="text.secondary">
            {t('tournament.report.matchesCount', { count: filteredMatches.length })}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('tournament.create.cancel')}</Button>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? t('tournament.report.generating') : t('tournament.report.generate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
