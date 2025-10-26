// src/components/tokenJotai.js
import { atom } from 'jotai';

// Initialize atoms with values from sessionStorage if available
const getInitialToken = () => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('token') || '';
  }
  return '';
};

const getInitialUserID = () => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('userID') || '';
  }
  return '';
};

const getInitialUserName = () => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('username') || '';
  }
  return '';
};

const getInitialUserEmail = () => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('email') || '';
  }
  return '';
};

const getInitialCSRFToken = () => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('csrfToken') || '';
  }
  return '';
};

// Initialize atoms with sessionStorage values if available
export const userToken = atom<any>(getInitialToken());
export const userID = atom<any>(getInitialUserID());
export const userName = atom<any>(getInitialUserName());
export const userEmail = atom<any>(getInitialUserEmail());
export const csrfToken = atom<any>(getInitialCSRFToken());
export const roleID = atom<any>('');
export const entityID = atom<any>('');

// import { createJSONStorage } from "jotai/utils";
// import { atom } from "jotai";

// // Atoms
// const storage = createJSONStorage<string>(() => sessionStorage);
// export const userToken = atom<any>(sessionStorage.getItem("token") || null);

// export const getUserToken = atom((get) => get(userToken));
// export const userID = atom<any>(sessionStorage.getItem("userID") || null);
// export const roleID = atom<any>(sessionStorage.getItem("roleID") || null);
// export const entityID = atom<any>(sessionStorage.getItem("entityID") || null);
// export const userName = atom<any>(sessionStorage.getItem("username") || null);
// export const userEmail = atom<any>(sessionStorage.getItem("email") || null);
// interface module {
//   moduleID: string;
//   moduleName: string;
//   add: number;
//   edit: number;
//   view: number;
//   delete: number;
// }
// export const userPermissions = atom<module[] | null>(null);
