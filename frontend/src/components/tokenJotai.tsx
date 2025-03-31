import { createJSONStorage } from "jotai/utils";

import { atom } from "jotai";

// Atoms
const storage = createJSONStorage<string>(() => sessionStorage);

// export const userToken = atomWithStorage<string>(
//   "token",
//   "",
//   storage || sessionStorage.getItem("token")
// );
export const userToken = atom<any>(sessionStorage.getItem("token") || null);

export const getUserToken = atom((get) => get(userToken));
export const userID = atom<any>(sessionStorage.getItem("userID") || null);
export const roleID = atom<any>(sessionStorage.getItem("roleID") || null);
export const entityID = atom<any>(sessionStorage.getItem("entityID") || null);
export const userName = atom<any>(sessionStorage.getItem("username") || null);
export const userEmail = atom<any>(sessionStorage.getItem("email") || null);
interface module {
  moduleID: string;
  moduleName: string;
  add: number;
  edit: number;
  view: number;
  delete: number;
}
export const userPermissions = atom<module[] | null>(null);
