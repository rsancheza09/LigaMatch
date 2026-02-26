import { configureStore } from '@reduxjs/toolkit';
import type { AuthUser } from '../src/shared/store/slices/authSlice';
import { authSlice } from '../src/shared/store/slices/authSlice';
import { tournamentSlice } from '../src/shared/store/slices/tournamentSlice';

const demoUser: AuthUser = {
  id: 'user-1',
  email: 'demo@ligamatch.local',
  name: 'Usuario Demo',
  plan: 'free',
};

export const defaultStore = configureStore({
  reducer: {
    auth: authSlice.reducer,
    tournament: tournamentSlice.reducer,
  },
});

export const loggedInStore = configureStore({
  reducer: {
    auth: authSlice.reducer,
    tournament: tournamentSlice.reducer,
  },
  preloadedState: {
    auth: {
      isLoggedIn: true,
      user: demoUser,
    },
  },
});
