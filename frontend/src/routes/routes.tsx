import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Login from "../layout/Login";
import Landing from "../components/landing";
import Estimate from "../views/estimate";
import CompareEstimate from "../views/compareEstimate";
import PartUsage from "../views/partUsage";
import SkillRequirement from "../views/skillRequirement";
import ExpertInsights from "../views/expertInsights";
import { useEffect } from "react";
import EstimateNew from "../views/estimateNew";
import CompareEstimateNew from "../views/compareEstimateNew";

const MainRoutes = () => {
  // const location = useLocation();
  // const navigate = useNavigate();

  // useEffect(() => {
  //   // Prevent navigating back to restricted pages after logout
  //   if (location.pathname === "/") {
  //     window.history.pushState(null, "", window.location.href);
  //     window.addEventListener("popstate", () => {
  //       window.history.pushState(null, "", window.location.href);
  //     });
  //   }

  //   return () => {
  //     window.removeEventListener("popstate", () => {
  //       window.history.pushState(null, "", window.location.href);
  //     });
  //   };
  // }, [location]);
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Landing />}>
        <Route path="/home/estimate" element={<EstimateNew />} />
        <Route path="/home/compare-estimate" element={<CompareEstimateNew />} />
        <Route path="/home/part-usage" element={<PartUsage />} />
        <Route path="/home/skill-requirement" element={<SkillRequirement />} />
        <Route path="/home/expert-insights" element={<ExpertInsights />} />
      </Route>
    </Routes>
  );
};

export default MainRoutes;


// import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
// import LandingPage from "../components/landingPage";
// import Basic from "../layout/Basic";
// import Login from "../layout/Login";
// import Estimate from "../views/estimate";
// import CompareEstimate from "../views/compareEstimate";
// import PartUsage from "../views/partUsage";
// import SkillRequirement from "../views/skillRequirement";
// import Configuration from "../views/configuration";
// import Landing from "../components/landing";



// const MainRoutes = () => {
//     const navigate = useNavigate();
//     const location = useLocation();

//     return (
//         <>
//         <Routes>
//             <Route>
//                 <Route path="/" element={<Login />} />
//                    <Route path="/home" element={<Landing />}>
//                    {/* <Route path="/home" element={<LandingPage />} /> */}
//                    {/* <Route path="/home" element={<Landing />} /> */}
//                    <Route path="/home/estimate" element={<Estimate />} />
//                    <Route path="/home/compare-estimate" element={<CompareEstimate />} />
//                    <Route path="/home/part-usage" element={<PartUsage />} />
//                    <Route path="/home/skill-requirement" element={<SkillRequirement />} />
//                    <Route path="/home/expert-insights" element={<Configuration />} />
//                 </Route>
//             </Route>
//         </Routes>
//         </>
//     )
// }

// export default MainRoutes;