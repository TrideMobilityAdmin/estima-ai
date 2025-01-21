import { Provider, fetchExchange } from "urql";
import { Client } from "urql";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import React from "react";
import ReactDOM from "react-dom/client";
import "@mantine/dates/styles.css";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";

export type AuthState = {
  token: string;
  status: "pending" | "authenticated" | "unauthenticated";
};
const TOKEN_KEY = "token";

export const saveAuthData = ({ token }: AuthState) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, token);
};
export const clearAuthState = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
};

export const getToken = () => {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(TOKEN_KEY);
};

// async function initializeAuthState() {
//   const token = sessionStorage.getItem("token");
//   return { token: token, status: "pending" };
// }

// @ts-ignore
// const auth = authExchange(async (utilities) => {
//   let token = getToken();

//   return {
//     getAuth: async () => {
//       return getToken;
//     },
//     addAuthToOperation(operation) {
//       return utilities.appendHeaders(operation, {
//         Authorization: `${sessionStorage.getItem("token") || ""}`,
//       });
//     },
//     didAuthError(error) {
//       return error.graphQLErrors.some(
//         (e) => e.extensions?.code === "UNAUTHORIZED"
//       );
//     },
//     willAuthError(operation) {
//       token = getToken();

//       if (!token) {
//         return (
//           operation.kind !== "mutation" ||
//           !operation.query.definitions.some((definition) => {
//             return (
//               definition.kind === "OperationDefinition" &&
//               definition.selectionSet.selections.some((node) => {
//                 return node.kind === "Field" && node.name.value === "signin";
//               })
//             );
//           })
//         );
//       }
//       return false;
//     },

//     async refreshAuth() {},
//   };
// });

const client = new Client({
  url: `${import.meta.env.VITE_URI}query`,
  fetchOptions: {
    headers: {
      Accept: "application/vnd.github.packages-preview+json",
      "Accept-Encoding": "gzip",
    },
  },

  exchanges: [ fetchExchange],
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider value={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
