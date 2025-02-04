import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import MainRoutes from './routes/routes';

function App() {
  const [count, setCount] = useState(0)

  return (
    // <>
    //   <div>
    //     <a href="https://vite.dev" target="_blank">
    //       <img src={viteLogo} className="logo" alt="Vite logo" />
    //     </a>
    //     <a href="https://react.dev" target="_blank">
    //       <img src={reactLogo} className="logo react" alt="React logo" />
    //     </a>
    //   </div>
    //   <h1>Vite + React</h1>
    //   <div className="card">
    //     <button onClick={() => setCount((count) => count + 1)}>
    //       count is {count}
    //     </button>
    //     <p>
    //       Edit <code>src/App.tsx</code> and save to test HMR
    //     </p>
    //   </div>
    //   <p className="read-the-docs">
    //     Click on the Vite and React logos to learn more
    //   </p>
    // </>
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
