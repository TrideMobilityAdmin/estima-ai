import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Basic from "./Basic";
import Dashboard from "../views/Dashboard";

const MainRoutes = () => {
  return (
    <>
      <Router>
        <Routes>
          {/* {token ? ( */}
          <Route>
            <Route path="/" element={<Basic />}>
              <Route index path="/home/analysis" element={<Dashboard />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </>
  );
};
export default MainRoutes;
