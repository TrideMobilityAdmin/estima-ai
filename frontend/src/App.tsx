import { MantineProvider } from "@mantine/core";
import "./App.css";
import "@mantine/charts/styles.css";
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
