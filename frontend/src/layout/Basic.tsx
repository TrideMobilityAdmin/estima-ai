import {ActionIcon, AppShell, Button, Flex, Group, useDisclosure, Outlet, useNavigate, useState} from "../constants/GlobalImports";
import gmrIcon from "../../public/GMR_Icon.jpeg";
import { MdPerson } from "react-icons/md";
export default function Basic() {

  const navigate = useNavigate();
  const [opened] = useDisclosure();
  const [active, setActive] = useState('');

  const links = [
    { link: '/home/estimate', label: 'ESTIMATE' },
    { link: '/home/compare-estimate', label: 'COMPARE ESTIMATE' },
    { link: '/home/part-usage', label: 'PART USAGE' },
    { link: '/home/skill-requirement', label: 'SKILL REQUIREMENT' },
    { link: '/home/configuration', label: 'CONFIGURATION' },
  ];


  return (
    <AppShell
      header={{ height: 60}}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { desktop: true, mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header
        style={{
          background: "#1A237E",
          // background: colors.gmrColor1,
          borderRadius: "0",
        }}
      >
        <div style={{height: 60, backgroundColor:"#1A237E"}}>
        <Flex pl={20} pt={5} pr={20} direction="row" align='center' justify="space-between" >
          <div>
            <img
              src={gmrIcon}
              style={{
                height: "3em",
                // width: "2em",
                cursor: "pointer",
                borderRadius: 15
                // paddingBottom: "6px",
              }}
              onClick={() => {
                navigate("/home");
                setActive('');
              }}
            />
          </div>

          <Group gap={5}>

          {links.map((link) => (
              <Button
                key={link.label}
                variant="subtle"
                style={{
                  color: active === link.link ? "yellow" : "white",
                  backgroundColor: active === link.link ? "rgba(255, 255, 0, 0.1)" : "transparent",
                }}
                onClick={() => {
                  setActive(link.link); // Set the clicked button as active
                  navigate(link.link); // Navigate to the respective link
                }}
              >
                {link.label}
              </Button>
            ))}
            {/* <Footer /> */}
          </Group>

          <div>
          <ActionIcon variant="default" color="indigo" size="lg" radius="lg" aria-label="Settings">
      <MdPerson style={{ width: '70%', height: '70%' }} width={1.5} />
    </ActionIcon>
          </div>
        </Flex>
        </div>
        {/* <div style={{height: 60, backgroundColor:"white"}}>
        <Flex pl={20} pt={5} pr={20} direction="row" align='center' justify="space-between" >
          <div>
            <img
              src={gmrIcon}
              style={{
                height: "3em",
                // width: "2em",
                cursor: "pointer",
                borderRadius: 15
                // paddingBottom: "6px",
              }}
              onClick={() => {
                navigate("/home");
                setActive('');
              }}
            />
          </div>

          <Group gap={5}>

          {links.map((link) => (
              <Button
                key={link.label}
                variant="subtle"
                style={{
                  color: active === link.link ? "blue" : "#1A237E",
                  backgroundColor: active === link.link ? "rgba(255, 255, 0, 0.1)" : "transparent",
                }}
                onClick={() => {
                  setActive(link.link); // Set the clicked button as active
                  navigate(link.link); // Navigate to the respective link
                }}
              >
                {link.label}
              </Button>
            ))}
          </Group>

          <div>
          <ActionIcon variant="default" color="indigo" size="lg" radius="lg" aria-label="Settings">
      <MdPerson style={{ width: '70%', height: '70%' }} width={1.5} />
    </ActionIcon>
          </div>
        </Flex>
        </div> */}
      </AppShell.Header>
      
      <AppShell.Main style={{ backgroundColor: "#ebebe6" }} p={0}>
        <Outlet />
      </AppShell.Main>

      {/* <AppShell.Footer style={{
          // background: "#E7E7E7",
          // borderRadius: "0",
        }}>
        <Footer />
      </AppShell.Footer> */}
    </AppShell>
  );
}
