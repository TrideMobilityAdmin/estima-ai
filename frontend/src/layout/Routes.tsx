import {  Route, Routes } from "react-router-dom";
import Basic from "./Basic";
import Dashboard from "../views/Dashboard";
import LandingPage from "../components/landingPage";
import TasksGroup from "../views/Tasks";

const MainRoutes = () => {
  return (
    <>

        <Routes>
          {/* {token ? ( */}
          <Route>
            <Route path="/" element={<Basic />}>
              <Route index element={<LandingPage />} />
              <Route path="/home" element={<LandingPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<TasksGroup />} />
            </Route>
          </Route>
        </Routes>

    </>
  );
};
export default MainRoutes;
