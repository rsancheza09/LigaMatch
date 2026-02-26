import { apiRequest } from './client';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  plan?: 'free' | 'pro' | 'fullPro';
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
  teamId?: string;
};

export type MeResponse = AuthUser & { teamId?: string };

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function registerByInvite(
  email: string,
  password: string,
  inviteToken: string,
  name?: string
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register-by-invite', {
    method: 'POST',
    body: JSON.stringify({ email, password, inviteToken, name }),
  });
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function me(): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me');
}

export async function updateProfile(name: string | undefined): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ name: name || null }),
  });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}
