import type { TFunction } from 'i18next';
import { GUARDIAN_RELATIONS, ID_DOCUMENT_TYPES } from '@shared/constants/player';

const ID_TYPE_KEYS: Record<(typeof ID_DOCUMENT_TYPES)[number], string> = {
  cedula_nacional: 'team.detail.idTypeCedulaNacional',
  cedula_residencia: 'team.detail.idTypeCedulaResidencia',
  pasaporte: 'team.detail.idTypePasaporte',
  dimex: 'team.detail.idTypeDimex',
};

const GUARDIAN_KEYS: Record<(typeof GUARDIAN_RELATIONS)[number], string> = {
  padre: 'team.detail.guardianRelationPadre',
  madre: 'team.detail.guardianRelationMadre',
  encargado: 'team.detail.guardianRelationEncargado',
};

/** Returns translated label for ID document type, or value/empty string. */
export function formatIdDocumentTypeLabel(
  value: string | null | undefined,
  t: TFunction
): string {
  if (value == null || value === '') return '—';
  const key = ID_TYPE_KEYS[value as keyof typeof ID_TYPE_KEYS];
  return key ? t(key) : value;
}

/** Returns translated label for guardian relation, or value/empty string. */
export function formatGuardianRelationLabel(
  value: string | null | undefined,
  t: TFunction
): string {
  if (value == null || value === '') return '—';
  const key = GUARDIAN_KEYS[value as keyof typeof GUARDIAN_KEYS];
  return key ? t(key) : value;
}
