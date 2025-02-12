
// ====================================================================
//  NO BACKGROUND IMAGE 
import React, { useState, useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import {
  Container,
  Flex,
  Title,
  Text,
  Space,
  Button,
  Menu,
  ActionIcon,
  Avatar,
  Card,
} from "@mantine/core";
import {
  IconUser,
  IconSettings,
  IconMessageCircle,
  IconLogout,
} from "@tabler/icons-react";
import gmrIcon from "../../public/GMR_Icon.jpeg";
import aircraftServiceBg from "../../public/airCraft6.jpeg";
import bgEstimate from "../../public/airCraft10.jpg";
import bgCompareEstimate from "../../public/airCraft8.jpg";
import bgPartUsage from "../../public/airCraftPartsUsage.webp";
import bgSkillRequirement from "../../public/airCraftSkill.webp";
import bgConfiguration from "../../public/airCraft8.jpg";

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);

  useEffect(() => {
    setActive(location.pathname);
  }, [location.pathname]);

  const isLandingPage = location.pathname === "/home";

  // Map routes to specific background images
  const backgroundMap: Record<string, string> = {
    "/home/estimate": bgEstimate,
    "/home/compare-estimate": bgCompareEstimate,
    "/home/part-usage": bgPartUsage,
    "/home/skill-requirement": bgSkillRequirement,
    "/home/expert-insights": bgConfiguration,
  };

  // Determine active background image
  const activeBg = isLandingPage
    ? aircraftServiceBg
    : backgroundMap[location.pathname] || "#f7f7f7";

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        backgroundColor: !isLandingPage ? "gray" : "transparent",
      }}
    >
      {/* Fixed Background */}
      {isLandingPage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${activeBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: 1,
          }}
        />
      )}

      {/* Gradient Overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isLandingPage
            ? "rgba(0, 0, 0, 0.4)"
            : "rgba(255, 255, 255, 0.9)",
          zIndex: 2,
          backdropFilter: isLandingPage ? "blur(0px)" : "blur(5px)",
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: 70,
          padding: "0 16px",
          zIndex: 100,
          backgroundColor: isLandingPage
            ? "rgba(0, 0, 0, 0.1)"
            : "rgba(255, 255, 255, 1)",
          backdropFilter: isLandingPage ? "blur(5px)" : "none",
          transition: "background-color 0.3s ease",
        }}
      >
        {/* Left Logo */}
        <div>
          <img
            src={gmrIcon}
            style={{
              height: "3em",
              cursor: "pointer",
              borderRadius: 15,
            }}
            onClick={() => {
              navigate("/home");
              setActive("/home");
            }}
            alt="GMR Logo"
          />
        </div>

        {/* Center Navigation */}
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { link: "/home/estimate", label: "ESTIMATE" },
            { link: "/home/compare-estimate", label: "COMPARE ESTIMATE" },
            { link: "/home/part-usage", label: "PART USAGE" },
            { link: "/home/skill-requirement", label: "SKILL REQUIREMENT" },
            { link: "/home/expert-insights", label: "EXPERT INSIGHTS" },
          ].map((link) => (
            <Button
              key={link.label}
              variant="subtle"
              style={{
                color: active === link.link ? "#1A237E" : isLandingPage ? "white" : "#333",
                borderBottom: active === link.link ? "2px solid #bdc2f2" : "none",
                borderRadius: 0,
                backgroundColor:
                  active === link.link
                    ? "rgba(255, 255, 255, 0.2)"
                    : "transparent",
                transition: "all 0.3s ease",
                cursor: "pointer",
                padding: "8px 16px",
              }}
              onClick={() => {
                navigate(link.link);
                setActive(link.link);
              }}
            >
              {link.label}
            </Button>
          ))}
        </div>

        {/* Right Profile */}
        <Menu shadow="md" width={250}>
          <Menu.Target>
            <ActionIcon
              variant="default"
              color="indigo"
              size="lg"
              radius="lg"
              aria-label="Settings"
            >
              <IconUser style={{ width: "70%", height: "70%" }} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Card w="100%">
              <Flex direction="column" align="center" justify="center">
                <Avatar src={gmrIcon} variant="light" radius="md" size="lg" />
                <Text fw="bold" size="md">
                  GMR EstimaAI
                </Text>
                <Text size="xs" c="dimmed">
                  gmr@evrides.live
                </Text>
              </Flex>
            </Card>
            <Menu.Divider />
            <Menu.Label>Application</Menu.Label>
            <Menu.Item leftSection={<IconSettings size={14} />}>
              Users
            </Menu.Item>
            <Menu.Item leftSection={<IconMessageCircle size={14} />}>
              Messages
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={14} />}
              onClick={() => navigate("/")}
            >
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        {isLandingPage ? (
          <Container
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
              position: "relative",
            }}
            size="lg"
          >
            <Flex align="center" justify="center" direction="column">
              <Title
                style={{
                  color: "white",
                  fontSize: 60,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  textAlign: "center",
                }}
                order={1}
              >
                EstimaAI
              </Title>
              <Title c="white" fw="600" fz="25">
                Intelligent RFQ Predictor
              </Title>
            </Flex>

            <Space h="lg" />

            <Text
              style={{
                color: "white",
                maxWidth: 900,
                fontSize: 20,
                textAlign: "center",
              }}
              size="lg"
              mt="xl"
            >
              Advanced AI-powered solutions to optimize RFQ predictions tailored
              for the aviation industry.
            </Text>
          </Container>
        ) : (
          <div
            style={{
              paddingTop: 70,
              minHeight: "100vh",
            }}
          >
            <Outlet />
          </div>
        )}
      </div>
    </div>
  );
};

export default Landing;

// ====================================================================
//  FULL BACKGROUND IMAGE 

// import React, { useState, useEffect } from "react";
// import { useNavigate, Outlet, useLocation } from "react-router-dom";
// import {
//   Container,
//   Flex,
//   Title,
//   Text,
//   Space,
//   Button,
//   Menu,
//   ActionIcon,
//   Avatar,
//   Card,
// } from "@mantine/core";
// import {
//   IconUser,
//   IconSettings,
//   IconMessageCircle,
//   IconLogout,
// } from "@tabler/icons-react";
// import gmrIcon from "../../public/GMR_Icon.jpeg";
// import aircraftServiceBg from "../../public/airCraft6.jpeg";
// import bgEstimate from "../../public/airCraft10.jpg";
// import bgCompareEstimate from "../../public/airCraft8.jpg";
// import bgPartUsage from "../../public/airCraftPartsUsage.webp";
// import bgSkillRequirement from "../../public/airCraftSkill.webp";
// import bgConfiguration from "../../public/airCraft8.jpg";
// import defaultBg from "../../public/airCraft8.jpg";
// import LandingPage from "./landingPage";

// const Landing: React.FC = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [active, setActive] = useState(location.pathname);

//   useEffect(() => {
//     setActive(location.pathname);
//   }, [location.pathname]);

//   const isLandingPage = location.pathname === "/home";

//   // Map routes to specific background images
//   const backgroundMap: Record<string, string> = {
//     "/home/estimate": bgEstimate,
//     "/home/compare-estimate": bgCompareEstimate,
//     "/home/part-usage": bgPartUsage,
//     "/home/skill-requirement": bgSkillRequirement,
//     "/home/expert-insights": bgConfiguration,
//   };

//   // Determine active background image
//   const activeBg = backgroundMap[location.pathname] || aircraftServiceBg;

//   const links = [
//     { link: "/home/estimate", label: "ESTIMATE" },
//     { link: "/home/compare-estimate", label: "COMPARE ESTIMATE" },
//     { link: "/home/part-usage", label: "PART USAGE" },
//     { link: "/home/skill-requirement", label: "SKILL REQUIREMENT" },
//     { link: "/home/expert-insights", label: "CONFIGURATION" },
//   ];

//   return (
//     <div style={{ height: "100vh", overflow: "hidden", position: "relative" }}>
//       {/* Fixed Background */}
//       <div
//         style={{
//           position: "fixed",
//           top: 0,
//           left: 0,
//           right: 0,
//           bottom: 0,
//           backgroundImage: `url(${activeBg})`,
//           backgroundSize: "cover",
//           backgroundPosition: "center",
//           zIndex: 1,
//           // background: "rgba(255, 255, 255, 0.3)",
//         }}
//       />

//       {/* Gradient Overlay */}
//       <div
//         style={{
//           position: "fixed",
//           top: 0,
//           left: 0,
//           right: 0,
//           bottom: 0,
//           background:
//             isLandingPage
//               ?
//               "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.2)",
//           // : "linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.2) 60%, rgba(255, 255, 255, 1) 100%)",
//           zIndex: 2,
//           backdropFilter: isLandingPage ? "blur(0px)" : "blur(4px)",
//         }}
//       />

//       {/* Header - Fixed Position */}
//       <div
//         style={{
//           position: "fixed",
//           top: 0,
//           width: "100%",
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           height: 70,
//           padding: "0 16px",
//           zIndex: 100,
//           backgroundColor: "rgba(0, 0, 0, 0.1)",
//           backdropFilter: "blur(5px)",
//         }}
//       >
//         {/* Left Logo */}
//         <div>
//           <img
//             src={gmrIcon}
//             style={{
//               height: "3em",
//               cursor: "pointer",
//               borderRadius: 15,
//             }}
//             onClick={() => {
//               navigate("/home");
//               setActive("/home");
//             }}
//             alt="GMR Logo"
//           />
//         </div>

//         {/* Center Navigation */}
//         <div style={{ display: "flex", gap: "8px" }}>
//           {links.map((link) => (
//             <Button
//               key={link.label}
//               variant="subtle"
//               style={{
//                 color: active === link.link ? "#1A237E" : "white",
//                 borderBottom: active === link.link ? "2px solid #bdc2f2" : "none",
//                 borderRadius: 0,
//                 backgroundColor: active === link.link ? "rgba(255, 255, 255, 0.2)" : "transparent",
//                 transition: "all 0.3s ease",
//                 cursor: "pointer",
//                 padding: "8px 16px",
//               }}
//               onClick={() => {
//                 navigate(link.link);
//                 setActive(link.link);
//               }}
//             >
//               {link.label}
//             </Button>
//           ))}
//         </div>

//         {/* Right Profile */}
//         <Menu shadow="md" width={250}>
//           <Menu.Target>
//             <ActionIcon
//               variant="default"
//               color="indigo"
//               size="lg"
//               radius="lg"
//               aria-label="Settings"
//             >
//               <IconUser style={{ width: "70%", height: "70%" }} />
//             </ActionIcon>
//           </Menu.Target>

//           <Menu.Dropdown>
//             <Card w="100%">
//               <Flex direction="column" align="center" justify="center">
//                 <Avatar src={gmrIcon} variant="light" radius="md" size="lg" />
//                 <Text fw="bold" size="md">
//                   GMR EstimaAI
//                 </Text>
//                 <Text size="xs" c="dimmed">
//                   gmr@evrides.live
//                 </Text>
//               </Flex>
//             </Card>
//             <Menu.Divider />
//             <Menu.Label>Application</Menu.Label>
//             <Menu.Item leftSection={<IconSettings size={14} />}>
//               Users
//             </Menu.Item>
//             <Menu.Item leftSection={<IconMessageCircle size={14} />}>
//               Messages
//             </Menu.Item>
//             <Menu.Divider />
//             <Menu.Item
//               color="red"
//               leftSection={<IconLogout size={14} />}
//               onClick={() => navigate("/")}
//             >
//               Logout
//             </Menu.Item>
//           </Menu.Dropdown>
//         </Menu>
//       </div>

//       {/* Scrollable Content Area */}
//       <div
//         style={{
//           position: "relative",
//           zIndex: 10,
//           height: "100vh",
//           overflowY: "auto",
//         }}
//       >
//         {isLandingPage ? (
//           <Container
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               justifyContent: "center",
//               alignItems: "center",
//               height: "100vh",
//               position: "relative",
//             }}
//             size="lg"
//           >
//             <Flex align="center" justify="center" direction="column">
//               <Title
//                 style={{
//                   color: "white",
//                   fontSize: 60,
//                   fontWeight: 900,
//                   lineHeight: 1.1,
//                   textAlign: "center",
//                 }}
//                 order={1}
//               >
//                 EstimaAI
//               </Title>
//               <Title c="white" fw="600" fz="25">
//                 Intelligent RFQ Predictor
//               </Title>
//             </Flex>

//             <Space h="lg" />

//             <Text
//               style={{
//                 color: "white",
//                 maxWidth: 900,
//                 fontSize: 20,
//                 textAlign: "center",
//               }}
//               size="lg"
//               mt="xl"
//             >
//               Advanced AI-powered solutions to optimize RFQ predictions tailored
//               for the aviation industry.
//             </Text>
//           </Container>
//         ) : (
//           <div
//             style={{
//               paddingTop: 70,
//               minHeight: "100vh",
//             }}
//           >
//             <Outlet />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Landing;

// ====================================================================
//  FULL BACKGROUND WITH FADING TO BOTTOM

// import React, { useState, useEffect } from "react";
// import { useNavigate, Outlet, useLocation } from "react-router-dom";
// import {
//   Container,
//   Flex,
//   Title,
//   Text,
//   Space,
//   Button,
//   Menu,
//   ActionIcon,
//   Avatar,
//   Card,
// } from "@mantine/core";
// import {
//   IconUser,
//   IconSettings,
//   IconMessageCircle,
//   IconLogout,
// } from "@tabler/icons-react";
// import gmrIcon from "../../public/GMR_Icon.jpeg";
// import aircraftServiceBg from "../../public/airCraft6.jpeg";
// import bgEstimate from "../../public/airCraft10.jpg";
// import bgCompareEstimate from "../../public/airCraft8.jpg";
// import bgPartUsage from "../../public/airCraftPartsUsage.webp";
// import bgSkillRequirement from "../../public/airCraftSkill.webp";
// import bgConfiguration from "../../public/airCraft8.jpg";
// import defaultBg from "../../public/airCraft8.jpg";
// import LandingPage from "./landingPage";

// const Landing: React.FC = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [active, setActive] = useState(location.pathname);

//   useEffect(() => {
//     setActive(location.pathname);
//   }, [location.pathname]);

//   const isLandingPage = location.pathname === "/home";

//   // Map routes to specific background images
//   const backgroundMap: Record<string, string> = {
//     "/home/estimate": bgEstimate,
//     "/home/compare-estimate": bgCompareEstimate,
//     "/home/part-usage": bgPartUsage,
//     "/home/skill-requirement": bgSkillRequirement,
//     "/home/expert-insights": bgConfiguration,
//   };

//   // Determine active background image
//   const activeBg = backgroundMap[location.pathname] || aircraftServiceBg;

//   const links = [
//     { link: "/home/estimate", label: "ESTIMATE" },
//     { link: "/home/compare-estimate", label: "COMPARE ESTIMATE" },
//     { link: "/home/part-usage", label: "PART USAGE" },
//     { link: "/home/skill-requirement", label: "SKILL REQUIREMENT" },
//     { link: "/home/expert-insights", label: "CONFIGURATION" },
//   ];

//   return (
//     <div style={{ height: "100vh", overflow: "hidden", position: "relative" }}>
//       {/* Fixed Background */}
//       <div
//         style={{
//           position: "fixed",
//           top: 0,
//           left: 0,
//           right: 0,
//           bottom: 0,
//           backgroundImage: `url(${activeBg})`,
//           backgroundSize: "cover",
//           backgroundPosition: "center",
//           zIndex: 1,
//         }}
//       />

//       {/* Gradient Overlay */}
//       <div
//         style={{
//           position: "fixed",
//           top: 0,
//           left: 0,
//           right: 0,
//           bottom: 0,
//           background: isLandingPage
//             ? "rgba(0, 0, 0, 0.4)"
//             : "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 50%, rgba(255, 255, 255, 1) 50%)",
//           zIndex: 2,
//           backdropFilter: isLandingPage ? "blur(0px)" : "blur(4px)",
//         }}
//       />

//       {/* Header - Fixed Position */}
//       <div
//         style={{
//           position: "fixed",
//           top: 0,
//           width: "100%",
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           height: 70,
//           padding: "0 16px",
//           zIndex: 100,
//           backgroundColor: "rgba(0, 0, 0, 0.1)",
//           backdropFilter: "blur(5px)",
//         }}
//       >
//         {/* Left Logo */}
//         <div>
//           <img
//             src={gmrIcon}
//             style={{
//               height: "3em",
//               cursor: "pointer",
//               borderRadius: 15,
//             }}
//             onClick={() => {
//               navigate("/home");
//               setActive("/home");
//             }}
//             alt="GMR Logo"
//           />
//         </div>

//         {/* Center Navigation */}
//         <div style={{ display: "flex", gap: "8px" }}>
//           {links.map((link) => (
//             <Button
//               key={link.label}
//               variant="subtle"
//               style={{
//                 color: active === link.link ? "#1A237E" : "white",
//                 borderBottom: active === link.link ? "2px solid #bdc2f2" : "none",
//                 borderRadius: 0,
//                 backgroundColor: active === link.link ? "rgba(255, 255, 255, 0.2)" : "transparent",
//                 transition: "all 0.3s ease",
//                 cursor: "pointer",
//                 padding: "8px 16px",
//               }}
//               onClick={() => {
//                 navigate(link.link);
//                 setActive(link.link);
//               }}
//             >
//               {link.label}
//             </Button>
//           ))}
//         </div>

//         {/* Right Profile */}
//         <Menu shadow="md" width={250}>
//           <Menu.Target>
//             <ActionIcon
//               variant="default"
//               color="indigo"
//               size="lg"
//               radius="lg"
//               aria-label="Settings"
//             >
//               <IconUser style={{ width: "70%", height: "70%" }} />
//             </ActionIcon>
//           </Menu.Target>

//           <Menu.Dropdown>
//             <Card w="100%">
//               <Flex direction="column" align="center" justify="center">
//                 <Avatar src={gmrIcon} variant="light" radius="md" size="lg" />
//                 <Text fw="bold" size="md">
//                   GMR EstimaAI
//                 </Text>
//                 <Text size="xs" c="dimmed">
//                   gmr@evrides.live
//                 </Text>
//               </Flex>
//             </Card>
//             <Menu.Divider />
//             <Menu.Label>Application</Menu.Label>
//             <Menu.Item leftSection={<IconSettings size={14} />}>
//               Users
//             </Menu.Item>
//             <Menu.Item leftSection={<IconMessageCircle size={14} />}>
//               Messages
//             </Menu.Item>
//             <Menu.Divider />
//             <Menu.Item
//               color="red"
//               leftSection={<IconLogout size={14} />}
//               onClick={() => navigate("/")}
//             >
//               Logout
//             </Menu.Item>
//           </Menu.Dropdown>
//         </Menu>
//       </div>

//       {/* Scrollable Content Area */}
//       <div
//         style={{
//           position: "relative",
//           zIndex: 10,
//           height: "100vh",
//           overflowY: "auto",
//         }}
//       >
//         {isLandingPage ? (
//           <Container
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               justifyContent: "center",
//               alignItems: "center",
//               height: "100vh",
//               position: "relative",
//             }}
//             size="lg"
//           >
//             <Flex align="center" justify="center" direction="column">
//               <Title
//                 style={{
//                   color: "white",
//                   fontSize: 60,
//                   fontWeight: 900,
//                   lineHeight: 1.1,
//                   textAlign: "center",
//                 }}
//                 order={1}
//               >
//                 EstimaAI
//               </Title>
//               <Title c="white" fw="600" fz="25">
//                 Intelligent RFQ Predictor
//               </Title>
//             </Flex>

//             <Space h="lg" />

//             <Text
//               style={{
//                 color: "white",
//                 maxWidth: 900,
//                 fontSize: 20,
//                 textAlign: "center",
//               }}
//               size="lg"
//               mt="xl"
//             >
//               Advanced AI-powered solutions to optimize RFQ predictions tailored
//               for the aviation industry.
//             </Text>
//           </Container>
//         ) : (
//           <div
//             style={{
//               paddingTop: 70,
//               minHeight: "100vh",
//             }}
//           >
//             <Outlet />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Landing;
