import { MantineProvider } from "@mantine/core";
import "./App.css";
import MainRoutes from "./layout/Routes";

function App() {
  return (
    <>
      <MantineProvider>
        <MainRoutes />
      </MantineProvider>
    </>
  );
}

export default App;
