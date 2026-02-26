import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { me } from '@shared/api/auth';
import type { RootState } from '@shared/store';
import { logout, setLoggedIn } from '@shared/store/slices/authSlice';

type AuthInitProps = {
  children: React.ReactNode;
};

/**
 * Validates the stored token on app load. If invalid/expired, clears auth state.
 * On success, refreshes user data from the API.
 */
export const AuthInit = ({ children }: AuthInitProps) => {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) return;
    const token = localStorage.getItem('ligamatch_token');
    if (!token) return;
    me()
      .then((user) => {
        dispatch(setLoggedIn({ token, user }));
      })
      .catch(() => {
        dispatch(logout());
      });
  }, [dispatch, isLoggedIn]);

  return <>{children}</>;
};
