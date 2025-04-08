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
// import CompareEstimateNew from "../views/compareEstimateNew";
import CompareNew from "../views/compareNew";

const MainRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Landing />}>
        <Route path="/home/estimate" element={<EstimateNew />} />
        <Route path="/home/compare-estimate" element={<CompareNew />} />
        <Route path="/home/part-usage" element={<PartUsage />} />
        <Route path="/home/skill-requirement" element={<SkillRequirement />} />
        <Route path="/home/expert-insights" element={<ExpertInsights />} />
      </Route>
    </Routes>
  );
};

export default MainRoutes;

// import { Route, Routes, Navigate } from "react-router-dom";
// import Login from "../layout/Login";
// import Landing from "../components/landing";
// import Estimate from "../views/estimate";
// import CompareEstimate from "../views/compareEstimate";
// import PartUsage from "../views/partUsage";
// import SkillRequirement from "../views/skillRequirement";
// import ExpertInsights from "../views/expertInsights";
// import { useEffect } from "react";
// import EstimateNew from "../views/estimateNew";
// import AuthGuard from "../components/AuthGuard";

// const MainRoutes = () => {
//   return (
//     <Routes>
//       <Route path="/" element={<Login />} />
//       <Route 
//         path="/home" 
//         element={
//           <AuthGuard>
//             <Landing />
//           </AuthGuard>
//         }
//       >
//         <Route index element={<Navigate to="/home/estimate" replace />} />
//         <Route path="estimate" element={<EstimateNew />} />
//         <Route path="compare-estimate" element={<CompareEstimate />} />
//         <Route path="part-usage" element={<PartUsage />} />
//         <Route path="skill-requirement" element={<SkillRequirement />} />
//         <Route path="expert-insights" element={<ExpertInsights />} />
//       </Route>
//       <Route path="*" element={<Navigate to="/" replace />} />
//     </Routes>
//   );
// };

// export default MainRoutes;