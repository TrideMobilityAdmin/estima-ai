import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dates/styles.css';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import MainRoutes from './routes/routes';
import { useNavigate } from './constants/GlobalImports';


function App() {

  return (
    <MantineProvider
      theme={{
        fontFamily: "Poppins, sans-serif",
        shadows: {
          md: "1px 1px 3px rgba(0,0,0,.25)",
          xl: "5px 5px 3px rgba(0,0,0,.25)",
        },
        headings: {
          fontFamily: "Open Sans, sans-serif",
        },
      }}
    >
      <Notifications />
      <MainRoutes />
    </MantineProvider>
  )
}

export default App

// import { useEffect } from 'react'
// import './App.css'
// import '@mantine/core/styles.css';
// import '@mantine/charts/styles.css';
// import '@mantine/dates/styles.css';
// import "ag-grid-community/styles/ag-grid.css";
// import "ag-grid-community/styles/ag-theme-alpine.css";
// import { MantineProvider } from '@mantine/core';
// import { Notifications } from '@mantine/notifications';
// import MainRoutes from './routes/routes';
// import { useAtom } from 'jotai';
// import { userToken, userID, userName, userEmail } from './components/tokenJotai';

// function App() {
//   const [token, setToken] = useAtom(userToken);
//   const [userId, setUserId] = useAtom(userID);
//   const [name, setName] = useAtom(userName);
//   const [email, setEmail] = useAtom(userEmail);

//   // On app initialization, load authentication data from sessionStorage
//   useEffect(() => {
//     const storedToken = sessionStorage.getItem('token');
//     const storedUserId = sessionStorage.getItem('userID');
//     const storedName = sessionStorage.getItem('username');
//     const storedEmail = sessionStorage.getItem('email');

//     if (storedToken && !token) {
//       console.log("🔄 Loading auth data from sessionStorage on app init");
//       setToken(storedToken);
//     }
    
//     if (storedUserId && !userId) {
//       setUserId(storedUserId);
//     }
    
//     if (storedName && !name) {
//       setName(storedName);
//     }
    
//     if (storedEmail && !email) {
//       setEmail(storedEmail);
//     }
//   }, []);

//   return (
//     <MantineProvider
//       theme={{
//         fontFamily: "Poppins, sans-serif",
//         shadows: {
//           md: "1px 1px 3px rgba(0,0,0,.25)",
//           xl: "5px 5px 3px rgba(0,0,0,.25)",
//         },
//         headings: {
//           fontFamily: "Open Sans, sans-serif",
//         },
//       }}
//     >
//       <Notifications />
//       <MainRoutes />
//     </MantineProvider>
//   )
// }

// export default App
