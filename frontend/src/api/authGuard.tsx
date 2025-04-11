// src/components/AuthGuard.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { userToken } from './tokenJotai';
import { getToken } from '../main';

const AuthGuard = ({ children }:any) => {
  const navigate = useNavigate();
  const [token, setToken] = useAtom(userToken);

  useEffect(() => {
    // Check for token in sessionStorage
    const storedToken = getToken();
    
    if (!storedToken) {
      console.log('⚠️ No token found, redirecting to login');
      navigate('/');
      return;
    }
    
    // If we have a token in storage but not in Jotai state, set it
    if (storedToken && !token) {
      setToken(storedToken);
    }
  }, [token, navigate, setToken]);

  // If no token, don't render children
  if (!token && !getToken()) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;