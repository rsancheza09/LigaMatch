import { createSlice } from '@reduxjs/toolkit';

const AUTH_KEY = 'ligamatch_auth';
const TOKEN_KEY = 'ligamatch_token';
const USER_KEY = 'ligamatch_user';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  plan?: 'free' | 'pro' | 'fullPro';
  teamId?: string;
};

function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
}

function getInitialAuth(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(TOKEN_KEY);
}

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isLoggedIn: getInitialAuth(),
    user: getStoredUser() as AuthUser | null,
  },
  reducers: {
    setLoggedIn: (
      state,
      action: {
        payload: { token: string; user: AuthUser };
      }
    ) => {
      state.isLoggedIn = true;
      state.user = action.payload.user;
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_KEY, 'true');
        localStorage.setItem(TOKEN_KEY, action.payload.token);
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
      }
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.user = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    },
    updateUser: (state, action: { payload: Partial<AuthUser> }) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_KEY, JSON.stringify(state.user));
        }
      }
    },
  },
});

export const { setLoggedIn, logout, updateUser } = authSlice.actions;
