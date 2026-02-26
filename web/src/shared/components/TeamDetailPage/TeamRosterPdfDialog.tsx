import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { Player, Team } from '@shared/api/teams';
import { getPlayerFileUrl } from '@shared/api/teams';
import { getApiBase } from '@shared/api/client';
import { DEFAULT_PERSON_IMAGE_URL } from '@shared/constants/defaultPersonImage';
import { formatPlayerBirthDisplay } from '@shared/utils/dateUtils';

const PAGE_WIDTH_MM = 210;
const MARGIN_LEFT = 14;
const MARGIN_RIGHT = 14;
const LOGO_SIZE_MM = 14;

type AgeCategoryOption = { id: string; name: string };

type TeamRosterPdfDialogProps = {
  open: boolean;
  onClose: () => void;
  team: Team;
  /** Default category name (e.g. "U15", "U17"). */
  categoryName: string | null;
  /** Age categories of the team's tournament. When length > 1, user can select which category to show in the report. */
  ageCategories?: AgeCategoryOption[];
};

/** Resolve logo URL: if absolute use as-is, else prepend API base. */
function resolveLogoUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  return u.startsWith('http://') || u.startsWith('https://') ? u : `${getApiBase()}${u.startsWith('/') ? '' : '/'}${u}`;
}

/** Load image as data URL with credentials. Returns null on failure. */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { credentials: 'include', mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function TeamRosterPdfDialog({
  open,
  onClose,
  team,
  categoryName,
  ageCategories = [],
}: TeamRosterPdfDialogProps) {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);
  const hasMultipleCategories = ageCategories.length > 1;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (hasMultipleCategories && ageCategories.length > 0) {
      const defaultCat = categoryName
        ? ageCategories.find((c) => c.name === categoryName) ?? ageCategories[0]
        : ageCategories[0];
      setSelectedCategoryId(defaultCat.id);
    } else {
      setSelectedCategoryId(null);
    }
  }, [open, hasMultipleCategories, ageCategories, categoryName]);

  const handleGenerateAndPreview = async () => {
    if (!team) return;
    setGenerating(true);
    try {
      const teamId = team.id;
      const tournament = team.tournament;
      const primaryTournamentId = team.tournamentId;
      const allPlayers = team.players ?? [];
      const players =
        hasMultipleCategories && selectedCategoryId
          ? allPlayers.filter((p) => {
              const catId = p.tournamentAgeCategoryId ?? p.categoryByTournament?.[primaryTournamentId]?.categoryId;
              return catId === selectedCategoryId;
            })
          : allPlayers;
      const pdfCategoryName =
        hasMultipleCategories && selectedCategoryId
          ? ageCategories.find((c) => c.id === selectedCategoryId)?.name ?? categoryName
          : categoryName;
      const imageUrls: (string | null)[] = [];

      const tournamentLogoUrl = resolveLogoUrl(tournament?.logoUrl);
      const teamLogoUrl = resolveLogoUrl(team.logoUrl);
      const [tournamentLogoDataUrl, teamLogoDataUrl] = await Promise.all([
        tournamentLogoUrl ? loadImageAsDataUrl(tournamentLogoUrl) : Promise.resolve(null),
        teamLogoUrl ? loadImageAsDataUrl(teamLogoUrl) : Promise.resolve(null),
      ]);

      for (const p of players) {
        if (p.photoUrl) {
          const fullUrl = getPlayerFileUrl(teamId, p.photoUrl);
          const dataUrl = await loadImageAsDataUrl(fullUrl);
          imageUrls.push(dataUrl ?? DEFAULT_PERSON_IMAGE_URL);
        } else {
          imageUrls.push(DEFAULT_PERSON_IMAGE_URL);
        }
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let y = 15;

      // 1. Fila superior: logo torneo + nombre torneo (izq), Fecha del partido (derecha)
      let xLeft = MARGIN_LEFT;
      if (tournamentLogoDataUrl) {
        try {
          doc.addImage(tournamentLogoDataUrl, 'PNG', xLeft, y - 4, LOGO_SIZE_MM, LOGO_SIZE_MM);
        } catch {
          try {
            doc.addImage(tournamentLogoDataUrl, 'JPEG', xLeft, y - 4, LOGO_SIZE_MM, LOGO_SIZE_MM);
          } catch {
            /* ignore */
          }
        }
        xLeft += LOGO_SIZE_MM + 4;
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(tournament?.name ?? t('team.detail.rosterPdf.tournament'), xLeft, y);
      const matchDateStr = `${t('team.detail.rosterPdf.matchDate')}: _________________________`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(matchDateStr, PAGE_WIDTH_MM - MARGIN_RIGHT, y, { align: 'right' });
      y += 10;

      // 2. Logo equipo + nombre equipo y "Equipo visita" al lado
      xLeft = MARGIN_LEFT;
      if (teamLogoDataUrl) {
        try {
          doc.addImage(teamLogoDataUrl, 'PNG', xLeft, y - 4, LOGO_SIZE_MM, LOGO_SIZE_MM);
        } catch {
          try {
            doc.addImage(teamLogoDataUrl, 'JPEG', xLeft, y - 4, LOGO_SIZE_MM, LOGO_SIZE_MM);
          } catch {
            /* ignore */
          }
        }
        xLeft += LOGO_SIZE_MM + 4;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(team.name, xLeft, y);
      const visitingLabel = `${t('team.detail.rosterPdf.visitingTeam')}: _________________________`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(visitingLabel, PAGE_WIDTH_MM - MARGIN_RIGHT, y, { align: 'right' });
      y += 8;

      // Datos del torneo (deporte, ubicación, fechas)
      doc.setFontSize(10);
      if (tournament?.sport) {
        doc.text(`${t('tournament.report.sport')}: ${t(`tournament.create.sport.options.${tournament.sport}`) || tournament.sport}`, MARGIN_LEFT, y);
        y += 6;
      }
      if (tournament?.location) {
        doc.text(`${t('tournament.report.location')}: ${tournament.location}`, MARGIN_LEFT, y);
        y += 6;
      }
      if (tournament?.startDate || tournament?.endDate) {
        const dates = [tournament.startDate, tournament.endDate].filter(Boolean).join(' – ');
        doc.text(`${t('tournament.detail.startDate')} / ${t('tournament.detail.endDate')}: ${dates}`, MARGIN_LEFT, y);
        y += 6;
      }
      if (pdfCategoryName) {
        doc.text(`${t('team.detail.rosterPdf.teamCategory')}: ${pdfCategoryName}`, MARGIN_LEFT, y);
        y += 6;
      }
      y += 4;

      // 3. Sedes con cuadrado para marcar (X) al lado del nombre
      const venues = team.venues ?? [];
      const boxSize = 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(t('team.detail.rosterPdf.venues'), MARGIN_LEFT, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      if (venues.length > 0) {
        for (const v of venues) {
          doc.rect(MARGIN_LEFT, y - boxSize + 1, boxSize, boxSize);
          doc.text(v.name, MARGIN_LEFT + boxSize + 3, y);
          y += 6;
        }
      } else {
        doc.rect(MARGIN_LEFT, y - boxSize + 1, boxSize, boxSize);
        doc.text('—', MARGIN_LEFT + boxSize + 3, y);
        y += 6;
      }
      y += 6;

      // 4. Tabla de jugadores: imagen, nombre completo, cédula, fecha nacimiento, observaciones
      const headers = [
        t('team.detail.rosterPdf.photo'),
        t('team.detail.rosterPdf.fullName'),
        t('team.detail.rosterPdf.idNumber'),
        t('team.detail.rosterPdf.birthDate'),
        t('team.detail.rosterPdf.observations'),
      ];
      const body = players.map((p: Player) => [
        '', // image drawn in didDrawCell
        p.name?.trim() || [p.firstName, p.lastName].filter(Boolean).join(' ') || '—',
        (p.idDocumentNumber ?? '').toString().trim() || '—',
        formatPlayerBirthDisplay(p.birthDate, p.birthYear),
        '',
      ]);

      const imgSize = 12;
      autoTable(doc, {
        startY: y,
        head: [headers],
        body,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] },
        columnStyles: {
          0: { cellWidth: imgSize + 4 },
          1: { cellWidth: 45 },
          2: { cellWidth: 35 },
          3: { cellWidth: 32 },
          4: { cellWidth: 'auto' },
        },
        didDrawCell: (data) => {
          if (data.column.index !== 0 || data.section !== 'body') return;
          const rowIndex = data.row.index;
          const imgData = imageUrls[rowIndex];
          if (!imgData) return;
          const cell = data.cell;
          const x = cell.x + 2;
          const cellH = cell.height;
          const margin = Math.min(2, (cellH - imgSize) / 2);
          const y = cell.y + margin;
          try {
            doc.addImage(imgData, 'JPEG', x, y, imgSize, imgSize);
          } catch {
            try {
              doc.addImage(imgData, 'PNG', x, y, imgSize, imgSize);
            } catch {
              try {
                doc.addImage(imgData, 'SVG', x, y, imgSize, imgSize);
              } catch {
                // ignore
              }
            }
          }
        },
      });

      let finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      if (finalY > 250) {
        doc.addPage();
        finalY = 15;
      }

      // 5. Cuerpo técnico (al final)
      const staff = team.technicalStaff ?? [];
      if (staff.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(t('team.detail.rosterPdf.technicalStaff'), 14, finalY);
        finalY += 6;
        const staffHeaders = [
          t('team.detail.technicalStaff.fullName'),
          t('team.detail.technicalStaff.idNumber'),
          t('team.detail.technicalStaff.type'),
          t('team.detail.technicalStaff.coachLicense'),
        ];
        const staffBody = staff.map((s) => [
          s.fullName,
          s.idDocumentNumber,
          t(`team.detail.technicalStaff.type.${s.type}`),
          s.coachLicense ?? '—',
        ]);
        autoTable(doc, {
          startY: finalY,
          head: [staffHeaders],
          body: staffBody,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] },
        });
        finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // 6. Uniformes + espacio para marcar cuál utilizar
      const teamUniforms = team.uniforms ?? [];
      if (teamUniforms.length > 0) {
        if (finalY > 240) {
          doc.addPage();
          finalY = 15;
        }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(t('team.detail.rosterPdf.uniforms'), 14, finalY);
        finalY += 6;
        const uniformHeaders = [
          '#',
          t('team.detail.rosterPdf.jersey'),
          t('team.detail.rosterPdf.shorts'),
          t('team.detail.rosterPdf.socks'),
          t('team.detail.rosterPdf.uniformToUse'),
        ];
        const uniformBody = teamUniforms.map((u, idx) => [
          String(idx + 1),
          u.jerseyColor,
          u.shortsColor,
          u.socksColor,
          '',
        ]);
        autoTable(doc, {
          startY: finalY,
          head: [uniformHeaders],
          body: uniformBody,
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] },
          columnStyles: { 4: { cellWidth: 28 } },
        });
        finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // 7. Nombre del árbitro
      if (finalY > 270) {
        doc.addPage();
        finalY = 15;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`${t('team.detail.rosterPdf.referee')}: _________________________`, 14, finalY);

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('team.detail.rosterPdf.title')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t('team.detail.rosterPdf.description')}
        </Typography>
        {hasMultipleCategories && (
          <FormControl size="small" fullWidth>
            <InputLabel id="roster-pdf-category-label">{t('team.detail.rosterPdf.selectCategory')}</InputLabel>
            <Select
              labelId="roster-pdf-category-label"
              value={selectedCategoryId ?? ''}
              label={t('team.detail.rosterPdf.selectCategory')}
              onChange={(e) => setSelectedCategoryId(e.target.value || null)}
            >
              {ageCategories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('tournament.create.cancel')}</Button>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleGenerateAndPreview}
          disabled={generating}
        >
          {generating ? t('team.detail.rosterPdf.generating') : t('team.detail.rosterPdf.previewInNewTab')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
