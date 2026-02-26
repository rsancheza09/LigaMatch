import { badRequest, conflict, forbidden, notFound, unauthorized } from '@hapi/boom';
import type { Request } from '@hapi/hapi';
import { getLang, t } from './i18n';

type RequestLike = Request | { headers?: Record<string, string | string[] | undefined> } | undefined;

export function createBadRequest(request: RequestLike, key: string, params?: Record<string, string | number>) {
  return badRequest(t(getLang(request), key, params));
}

export function createNotFound(request: RequestLike, key: string, params?: Record<string, string | number>) {
  return notFound(t(getLang(request), key, params));
}

export function createForbidden(request: RequestLike, key: string, params?: Record<string, string | number>) {
  return forbidden(t(getLang(request), key, params));
}

export function createConflict(request: RequestLike, key: string, params?: Record<string, string | number>) {
  return conflict(t(getLang(request), key, params));
}

export function createUnauthorized(request: RequestLike, key: string, params?: Record<string, string | number>) {
  return unauthorized(t(getLang(request), key, params));
}
