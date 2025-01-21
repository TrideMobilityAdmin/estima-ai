import { AppShell, Button, Flex, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, useNavigate } from "react-router-dom";
import gmrIcon from "../../public/GMR_Icon.jpeg";
import Footer from "./footer";
export default function Basic() {
  const navigate = useNavigate();

  const [opened] = useDisclosure();
  return (
    <AppShell
      header={{ height: 60 }}
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
          borderRadius: "0",
        }}
      >
        <Flex pl={20} pt={5} direction="row" justify="space-between" >
          <div>

          <img
                // title="Logo"
                // src={EvRidesLogo}
                src={gmrIcon}
                style={{
                  height: "3em",
                  // width: "2em",
                  cursor: "pointer",
                  borderRadius:15
                  // paddingBottom: "6px",
                }}
                onClick={() => {
                  navigate("/home");
                }}
              />
          </div>
          
          <Group gap={5}>
          <Button
              // leftSection={<IconPhoto size={14} />}
              variant="transparent"
              color="rgba(255, 255, 255, 1)"
              onClick={() => {
                navigate("/tasks");
              }}
            >
              ANALYTICS
            </Button>
            <Footer />
          </Group>
        </Flex>

        {/* <Group align="center" justify="space-between" style={{ flex: 1 }}> */}
          {/* <MantineLogo size={30} /> */}
          {/* <Group>
            <div
              style={{
                paddingTop: "8px",
              }}
            >
              <Space w={10} />
              <img
                title="Logo"
                src={EvRidesLogo}
                style={{
                  height: "1.5em",
                  // width: "2em",
                  cursor: "pointer",
                  // paddingBottom: "6px",
                }}
                // onClick={() => {
                //   navigate("/home/stats");
                // }}
              />
            </div>
          </Group> */}
          {/* <Group ml="xl" gap={0} visibleFrom="sm"> */}
            {/* <UnstyledButton
              className="control"
              onClick={() => {
                navigate("/dashboard");
              }}
            >
              Dashboard
            </UnstyledButton> */}
            {/* <Button
              // leftSection={<IconPhoto size={14} />}
              variant="transparent"
              color="rgba(255, 255, 255, 1)"
              onClick={() => {
                navigate("/tasks");
              }}
            >
              ANALYTICS
            </Button> */}
            {/* <UnstyledButton
              c={"white"}
              // className="control"
              onClick={() => {
                navigate("/tasks");
              }}
            >
              Analytics
            </UnstyledButton> */}
            {/* <Space w="lg" />
          </Group>
        </Group> */}
      </AppShell.Header>
      <AppShell.Main p={0}>
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
