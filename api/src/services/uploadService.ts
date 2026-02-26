/**
 * File upload: Cloudinary for images when CLOUDINARY_URL is set;
 * otherwise local disk (UPLOAD_DIR). Documents (PDF/Word) fall back to local.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';

const CLOUDINARY_URL = process.env.CLOUDINARY_URL;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'players');

if (CLOUDINARY_URL) {
  cloudinary.config();
}
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

function getExtension(filename: string, mimeType?: string): string {
  const fromMime = mimeType && EXT_BY_MIME[mimeType];
  if (fromMime) return fromMime;
  const ext = path.extname(filename).toLowerCase();
  if (ext && ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'].includes(ext)) {
    return ext;
  }
  return '.bin';
}

export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function isAllowedMime(mimeType: string, forPhoto: boolean): boolean {
  if (forPhoto) return ALLOWED_IMAGE_TYPES.includes(mimeType);
  return ALLOWED_DOC_TYPES.includes(mimeType);
}

export function isCloudinaryConfigured(): boolean {
  return !!CLOUDINARY_URL;
}

/** Upload image (data URL or base64) to Cloudinary; returns secure_url. */
export async function uploadImageToCloudinary(
  dataUrlOrBase64: string,
  folder: string,
  publicId?: string
): Promise<string> {
  if (!CLOUDINARY_URL) {
    throw new Error('Cloudinary is not configured (CLOUDINARY_URL)');
  }
  const result = await cloudinary.uploader.upload(dataUrlOrBase64, {
    folder,
    public_id: publicId,
    resource_type: 'image',
  });
  return result.secure_url;
}

export type UploadResult = { url: string; fileName: string; mimeType: string };

export async function saveUploadedFile(
  stream: Readable,
  filename: string,
  mimeType: string,
  documentType: 'photo' | 'player_id_copy' | 'birth_certificate' | 'guardian_id_copy'
): Promise<UploadResult> {
  ensureUploadDir();
  const forPhoto = documentType === 'photo';
  if (!isAllowedMime(mimeType, forPhoto)) {
    throw new Error(
      `Tipo de archivo no permitido: ${mimeType}. ${forPhoto ? 'Use JPEG, PNG, GIF o WebP.' : 'Use PDF, Word o imágenes.'}`
    );
  }
  const ext = getExtension(filename, mimeType);
  const safeName = `${randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, safeName);
  const writeStream = fs.createWriteStream(filePath);
  await pipeline(stream, writeStream);
  const relativeUrl = `players/${safeName}`;
  return { url: relativeUrl, fileName: filename, mimeType };
}

export function resolveFilePath(relativeUrl: string): string {
  const name = path.basename(relativeUrl);
  if (name.includes('..') || path.dirname(relativeUrl) !== 'players') {
    throw new Error('Invalid path');
  }
  return path.join(UPLOAD_DIR, name);
}

/** Decode base64 (data URL or raw base64) and save; returns URL (Cloudinary or relative) and metadata. */
export async function saveUploadedFileFromBase64(
  dataUrlOrBase64: string,
  filename: string,
  mimeType: string,
  documentType: 'photo' | 'player_id_copy' | 'birth_certificate' | 'guardian_id_copy'
): Promise<UploadResult> {
  const forPhoto = documentType === 'photo';
  const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);

  if (!isAllowedMime(mimeType, forPhoto)) {
    throw new Error(
      `Tipo de archivo no permitido: ${mimeType}. ${forPhoto ? 'Use JPEG, PNG, GIF o WebP.' : 'Use PDF, Word o imágenes.'}`
    );
  }

  if (CLOUDINARY_URL && isImage) {
    const folder = 'players';
    const url = await uploadImageToCloudinary(dataUrlOrBase64, folder);
    return { url, fileName: filename, mimeType };
  }

  ensureUploadDir();
  let buffer: Buffer;
  if (dataUrlOrBase64.startsWith('data:')) {
    const base64 = dataUrlOrBase64.replace(/^data:[^;]+;base64,/, '');
    buffer = Buffer.from(base64, 'base64');
  } else {
    buffer = Buffer.from(dataUrlOrBase64, 'base64');
  }
  const ext = getExtension(filename, mimeType);
  const safeName = `${randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, safeName);
  fs.writeFileSync(filePath, buffer);
  const relativeUrl = `players/${safeName}`;
  return { url: relativeUrl, fileName: filename, mimeType };
}

/** Upload tournament logo or background image to Cloudinary; returns URL. */
export async function uploadTournamentImage(
  dataUrlOrBase64: string,
  kind: 'logo' | 'background',
  tournamentId: string
): Promise<string> {
  if (!CLOUDINARY_URL) {
    throw new Error('Cloudinary is not configured (CLOUDINARY_URL). Set it to use image uploads for tournament.');
  }
  const folder = `tournaments/${tournamentId}`;
  const publicId = kind === 'logo' ? 'logo' : 'bg';
  return uploadImageToCloudinary(dataUrlOrBase64, folder, publicId);
}
