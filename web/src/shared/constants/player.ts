/** ID document type values for player forms (match API and i18n team.detail.idType*). */
export const ID_DOCUMENT_TYPES = ['cedula_nacional', 'cedula_residencia', 'pasaporte', 'dimex'] as const;
export type IdDocumentType = (typeof ID_DOCUMENT_TYPES)[number];

/** Guardian relation values (match API and i18n team.detail.guardianRelation*). */
export const GUARDIAN_RELATIONS = ['padre', 'madre', 'encargado'] as const;
export type GuardianRelation = (typeof GUARDIAN_RELATIONS)[number];
