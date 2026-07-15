/**
 * Extract player fields from ID / birth certificate images or PDFs via OpenAI Vision.
 * OPENAI_API_KEY must be set; extraction never persists the file.
 */

import OpenAI from 'openai';

export const ID_DOCUMENT_TYPES = ['cedula_nacional', 'cedula_residencia', 'pasaporte', 'dimex'] as const;
export type IdDocumentType = (typeof ID_DOCUMENT_TYPES)[number];

export const GUARDIAN_RELATIONS = ['padre', 'madre', 'encargado'] as const;
export type GuardianRelation = (typeof GUARDIAN_RELATIONS)[number];

export const DOCUMENT_HINTS = ['player_id_copy', 'birth_certificate', 'guardian_id_copy', 'auto'] as const;
export type DocumentHint = (typeof DOCUMENT_HINTS)[number];

export type ExtractedPlayerFields = {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  idDocumentType?: IdDocumentType;
  idDocumentNumber?: string;
  guardianName?: string;
  guardianRelation?: GuardianRelation;
  guardianIdNumber?: string;
  documentDetected?: 'player_id_copy' | 'birth_certificate' | 'guardian_id_copy' | 'unknown';
  confidence?: 'high' | 'medium' | 'low';
};

export type RawExtractionResult = Record<string, unknown>;

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

const EXTRACTION_SCHEMA_HINT = `{
  "firstName": string | null,
  "lastName": string | null,
  "birthDate": "YYYY-MM-DD" | null,
  "idDocumentType": "cedula_nacional" | "cedula_residencia" | "pasaporte" | "dimex" | null,
  "idDocumentNumber": string | null,
  "guardianName": string | null,
  "guardianRelation": "padre" | "madre" | "encargado" | null,
  "guardianIdNumber": string | null,
  "documentDetected": "player_id_copy" | "birth_certificate" | "guardian_id_copy" | "unknown",
  "confidence": "high" | "medium" | "low"
}`;

export class DocumentExtractionError extends Error {
  constructor(public readonly key: string) {
    super(key);
    this.name = 'DocumentExtractionError';
  }
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function stripDataUrlPrefix(fileBase64: string): string {
  const match = /^data:[^;]+;base64,(.+)$/i.exec(fileBase64.trim());
  return match ? match[1] : fileBase64.trim();
}

export function normalizeBirthDate(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return undefined;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return undefined;
    return raw;
  }
  // DD/MM/YYYY or DD-MM-YYYY (common in CR)
  const dmy = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(raw);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return undefined;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return undefined;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return undefined;
}

export function normalizeIdDocumentType(value: unknown): IdDocumentType | undefined {
  if (value == null || value === '') return undefined;
  const raw = String(value).trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if ((ID_DOCUMENT_TYPES as readonly string[]).includes(raw)) return raw as IdDocumentType;
  if (raw.includes('dimex')) return 'dimex';
  if (raw.includes('pasaporte') || raw.includes('passport')) return 'pasaporte';
  if (raw.includes('residencia') || raw.includes('residence')) return 'cedula_residencia';
  if (raw.includes('cedula') || raw.includes('nacional') || raw.includes('identidad')) return 'cedula_nacional';
  return undefined;
}

export function normalizeGuardianRelation(value: unknown): GuardianRelation | undefined {
  if (value == null || value === '') return undefined;
  const raw = String(value).trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if ((GUARDIAN_RELATIONS as readonly string[]).includes(raw)) return raw as GuardianRelation;
  if (raw.includes('padre') || raw === 'father' || raw === 'dad') return 'padre';
  if (raw.includes('madre') || raw === 'mother' || raw === 'mom') return 'madre';
  if (raw.includes('encargad') || raw.includes('tutor') || raw.includes('guardian')) return 'encargado';
  return undefined;
}

function cleanOptionalString(value: unknown, maxLen = 255): string | undefined {
  if (value == null || value === '') return undefined;
  const s = String(value).trim().replace(/\s+/g, ' ');
  if (!s) return undefined;
  return s.slice(0, maxLen);
}

function cleanDocumentNumber(value: unknown): string | undefined {
  const s = cleanOptionalString(value, 64);
  if (!s) return undefined;
  return s.replace(/\s+/g, '').toUpperCase();
}

export function normalizeDocumentDetected(
  value: unknown
): ExtractedPlayerFields['documentDetected'] {
  if (value == null || value === '') return 'unknown';
  const raw = String(value).trim().toLowerCase();
  if (raw === 'player_id_copy' || raw === 'birth_certificate' || raw === 'guardian_id_copy') return raw;
  if (raw.includes('birth') || raw.includes('nacimiento') || raw.includes('acta')) return 'birth_certificate';
  if (raw.includes('guardian') || raw.includes('padre') || raw.includes('madre') || raw.includes('encargad')) {
    return 'guardian_id_copy';
  }
  if (raw.includes('cedula') || raw.includes('pasaporte') || raw.includes('id') || raw.includes('dimex')) {
    return 'player_id_copy';
  }
  return 'unknown';
}

export function normalizeConfidence(value: unknown): ExtractedPlayerFields['confidence'] {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return 'medium';
}

/** Normalize and validate raw model JSON into typed player fields. */
export function normalizeExtractedFields(raw: RawExtractionResult): ExtractedPlayerFields {
  const out: ExtractedPlayerFields = {
    confidence: normalizeConfidence(raw.confidence),
    documentDetected: normalizeDocumentDetected(raw.documentDetected),
  };

  const firstName = cleanOptionalString(raw.firstName);
  const lastName = cleanOptionalString(raw.lastName);
  if (firstName) out.firstName = firstName;
  if (lastName) out.lastName = lastName;

  const birthDate = normalizeBirthDate(raw.birthDate);
  if (birthDate) out.birthDate = birthDate;

  const idDocumentType = normalizeIdDocumentType(raw.idDocumentType);
  if (idDocumentType) out.idDocumentType = idDocumentType;

  const idDocumentNumber = cleanDocumentNumber(raw.idDocumentNumber);
  if (idDocumentNumber) out.idDocumentNumber = idDocumentNumber;

  const guardianName = cleanOptionalString(raw.guardianName);
  if (guardianName) out.guardianName = guardianName;

  const guardianRelation = normalizeGuardianRelation(raw.guardianRelation);
  if (guardianRelation) out.guardianRelation = guardianRelation;

  const guardianIdNumber = cleanDocumentNumber(raw.guardianIdNumber);
  if (guardianIdNumber) out.guardianIdNumber = guardianIdNumber;

  return out;
}

function buildSystemPrompt(documentHint: DocumentHint): string {
  const hintLine =
    documentHint === 'auto'
      ? 'Detect the document type automatically.'
      : `The user indicated this document is: ${documentHint}.`;

  return `You extract identity data from Costa Rican personal documents (cédula nacional, cédula de residencia, pasaporte, DIMEX, actas/constancias de nacimiento).
${hintLine}
Return ONLY a JSON object matching this shape (use null when unknown):
${EXTRACTION_SCHEMA_HINT}
Rules:
- Names: firstName = given names; lastName = surnames (apellidos). Do not invent values.
- birthDate must be ISO YYYY-MM-DD when readable.
- idDocumentType must be one of: cedula_nacional, cedula_residencia, pasaporte, dimex.
- For guardian ID documents, fill guardianName and guardianIdNumber (and relation if clear); player name fields may be null.
- For birth certificates, extract the child's name and birth date; parents/guardian if present.
- confidence: high if most fields clear, medium if partial, low if unsure.
- documentDetected: player_id_copy | birth_certificate | guardian_id_copy | unknown.`;
}

function hasAnyExtractedField(fields: ExtractedPlayerFields): boolean {
  return Boolean(
    fields.firstName ||
      fields.lastName ||
      fields.birthDate ||
      fields.idDocumentType ||
      fields.idDocumentNumber ||
      fields.guardianName ||
      fields.guardianRelation ||
      fields.guardianIdNumber
  );
}

function parseModelJson(content: string): RawExtractionResult {
  const trimmed = content.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new DocumentExtractionError('errors.documentExtractionFailed');
    }
    return parsed as RawExtractionResult;
  } catch {
    throw new DocumentExtractionError('errors.documentExtractionFailed');
  }
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new DocumentExtractionError('errors.openaiNotConfigured');
  return new OpenAI({ apiKey });
}

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o';
}

async function callVisionForImage(
  client: OpenAI,
  mimeType: string,
  base64: string,
  documentHint: DocumentHint
): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const completion = await client.chat.completions.create({
    model: getModel(),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(documentHint) },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract the player/guardian fields from this document image as JSON.',
          },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new DocumentExtractionError('errors.documentExtractionFailed');
  return content;
}

async function callVisionForPdf(
  client: OpenAI,
  fileName: string,
  base64: string,
  documentHint: DocumentHint
): Promise<string> {
  const response = await client.responses.create({
    model: getModel(),
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_file',
            filename: fileName || 'document.pdf',
            file_data: `data:application/pdf;base64,${base64}`,
          },
          {
            type: 'input_text',
            text: `${buildSystemPrompt(documentHint)}\n\nExtract the player/guardian fields from this PDF as JSON only.`,
          },
        ],
      },
    ],
    text: { format: { type: 'json_object' } },
    temperature: 0,
  });
  const content = response.output_text;
  if (!content) throw new DocumentExtractionError('errors.documentExtractionFailed');
  return content;
}

export type ExtractFromDocumentInput = {
  fileBase64: string;
  fileName: string;
  mimeType: string;
  documentHint?: DocumentHint;
};

export async function extractPlayerFieldsFromDocument(
  input: ExtractFromDocumentInput
): Promise<ExtractedPlayerFields> {
  if (!isOpenAIConfigured()) {
    throw new DocumentExtractionError('errors.openaiNotConfigured');
  }

  const mimeType = (input.mimeType || '').trim().toLowerCase();
  if (!ALLOWED_MIME.includes(mimeType)) {
    throw new DocumentExtractionError('errors.documentExtractionUnsupportedType');
  }

  const base64 = stripDataUrlPrefix(input.fileBase64);
  if (!base64) {
    throw new DocumentExtractionError('errors.documentExtractionFieldsRequired');
  }

  const documentHint: DocumentHint =
    input.documentHint && (DOCUMENT_HINTS as readonly string[]).includes(input.documentHint)
      ? input.documentHint
      : 'auto';

  const client = getClient();
  let content: string;
  try {
    if (mimeType === 'application/pdf') {
      content = await callVisionForPdf(client, input.fileName, base64, documentHint);
    } else {
      content = await callVisionForImage(client, mimeType, base64, documentHint);
    }
  } catch (err) {
    if (err instanceof DocumentExtractionError) throw err;
    throw new DocumentExtractionError('errors.documentExtractionFailed');
  }

  const normalized = normalizeExtractedFields(parseModelJson(content));
  if (!hasAnyExtractedField(normalized)) {
    throw new DocumentExtractionError('errors.documentExtractionNoData');
  }
  return normalized;
}
