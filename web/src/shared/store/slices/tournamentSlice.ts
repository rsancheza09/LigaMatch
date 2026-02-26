import { createSlice } from '@reduxjs/toolkit';

export type CategoryType = 'none' | 'ages' | 'subcategories';

export type AgeCategory = {
  id: string;
  name: string;
  minBirthYear: number;
  maxBirthYear: number;
};

export type TournamentFormState = {
  sport: string;
  categoryType: CategoryType;
  ageCategories: AgeCategory[];
  tournamentType: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  isSingleVenue: boolean;
  venueName: string;
};

const currentYear = new Date().getFullYear();

const initialState: TournamentFormState = {
  sport: '',
  categoryType: 'none',
  ageCategories: [
    {
      id: `cat-${Date.now()}`,
      name: '',
      minBirthYear: currentYear - 50,
      maxBirthYear: currentYear,
    },
  ],
  tournamentType: '',
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  location: '',
  isSingleVenue: false,
  venueName: '',
};

export const tournamentSlice = createSlice({
  name: 'tournament',
  initialState,
  reducers: {
    setSport: (state, action: { payload: string }) => {
      state.sport = action.payload;
    },
    setCategoryType: (state, action: { payload: CategoryType }) => {
      state.categoryType = action.payload;
    },
    setAgeCategories: (state, action: { payload: AgeCategory[] }) => {
      state.ageCategories = action.payload;
    },
    addAgeCategory: (state) => {
      const year = new Date().getFullYear();
      state.ageCategories.push({
        id: `cat-${Date.now()}-${Math.random()}`,
        name: '',
        minBirthYear: year - 50,
        maxBirthYear: year,
      });
    },
    removeAgeCategory: (state, action: { payload: string }) => {
      if (state.ageCategories.length > 1) {
        state.ageCategories = state.ageCategories.filter(
          (c) => c.id !== action.payload
        );
      }
    },
    updateAgeCategory: (
      state,
      action: {
        payload: { id: string; field: keyof AgeCategory; value: string | number };
      }
    ) => {
      const { id, field, value } = action.payload;
      const cat = state.ageCategories.find((c) => c.id === id);
      if (cat) {
        (cat as Record<string, string | number>)[field] = value;
      }
    },
    setTournamentType: (state, action: { payload: string }) => {
      state.tournamentType = action.payload;
    },
    setName: (state, action: { payload: string }) => {
      state.name = action.payload;
    },
    setDescription: (state, action: { payload: string }) => {
      state.description = action.payload;
    },
    setStartDate: (state, action: { payload: string }) => {
      state.startDate = action.payload;
    },
    setEndDate: (state, action: { payload: string }) => {
      state.endDate = action.payload;
    },
    setLocation: (state, action: { payload: string }) => {
      state.location = action.payload;
    },
    setIsSingleVenue: (state, action: { payload: boolean }) => {
      state.isSingleVenue = action.payload;
      if (!action.payload) state.venueName = '';
    },
    setVenueName: (state, action: { payload: string }) => {
      state.venueName = action.payload;
    },
    resetTournament: () => initialState,
  },
});

export const {
  setSport,
  setCategoryType,
  setAgeCategories,
  addAgeCategory,
  removeAgeCategory,
  updateAgeCategory,
  setTournamentType,
  setName,
  setDescription,
  setStartDate,
  setEndDate,
  setLocation,
  setIsSingleVenue,
  setVenueName,
  resetTournament,
} = tournamentSlice.actions;
