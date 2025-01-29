import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import LandingPage from "../components/landingPage";
import Basic from "../layout/Basic";
import Login from "../layout/Login";
import Estimate from "../views/estimate";
import CompareEstimate from "../views/compareEstimate";
import PartUsage from "../views/partUsage";
import SkillRequirement from "../views/skillRequirement";
import Configuration from "../views/configuration";



const MainRoutes = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <>
        <Routes>
            <Route>
                <Route path="/" element={<Login />} />
                   <Route path="/home" element={<Basic />}>
                   <Route path="/home" element={<LandingPage />} />
                   <Route path="/home/estimate" element={<Estimate />} />
                   <Route path="/home/compare-estimate" element={<CompareEstimate />} />
                   <Route path="/home/part-usage" element={<PartUsage />} />
                   <Route path="/home/skill-requirement" element={<SkillRequirement />} />
                   <Route path="/home/configuration" element={<Configuration />} />
                </Route>
            </Route>
        </Routes>
        </>
    )
}

export default MainRoutes;