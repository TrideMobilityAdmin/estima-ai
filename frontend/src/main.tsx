import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import React from 'react'
import { Provider } from "jotai";
import { BrowserRouter } from "react-router-dom";

export const TOKEN_KEY = "token";

// Token management functions
export const saveAuthData = ({ token, userID, username, email, csrfToken } : any) => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem("userID", userID);
    sessionStorage.setItem("username", username);
    sessionStorage.setItem("email", email);
    if (csrfToken) {
      sessionStorage.setItem("csrfToken", csrfToken);
    }
  }
};

export const clearAuthState = () => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem("userID");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("email");
    sessionStorage.removeItem("csrfToken");
  }
};

export const getToken = () => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(TOKEN_KEY);
  }
  return null;
};

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)