import { AppShell, Group, Space, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";

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
          background: " #6ea3f7 ",
        }}
      >
        <Group justify="space-between" style={{ flex: 1 }}>
          {/* <MantineLogo size={30} /> */}
          <Group>
            <div
              style={{
                paddingTop: "8px",
              }}
            >
              <Group>
                <img
                  title="Logo"
                  src={""}
                  style={{
                    height: "2em",
                    // width: "2em",
                    cursor: "pointer",
                    // paddingBottom: "6px",
                  }}
                  // onClick={() => {
                  //   navigate("/home/stats");
                  // }}
                />

                <img
                  title="Logo"
                  src={""}
                  style={{
                    height: "2em",
                    cursor: "pointer",
                    paddingLeft: "-10",
                    // paddingBottom: "6px",
                  }}
                  // onClick={() => {
                  //   navigate("/home/stats");
                  // }}
                />
              </Group>
            </div>
          </Group>
          <Group ml="xl" gap={0} visibleFrom="sm">
            <UnstyledButton
              className="control"
              onClick={() => {
                navigate("/home/dashboard");
              }}
            >
              Dashboard
            </UnstyledButton>
            <UnstyledButton
              className="control"
              onClick={() => {
                navigate("/home/analysis");
              }}
            >
              Analysis
            </UnstyledButton>

            <UnstyledButton
              className="control"
              onClick={() => {
                navigate("/home/results");
              }}
            >
              Result
            </UnstyledButton>
            <UnstyledButton
              className="control"
              onClick={() => {
                navigate("/home/Prediction");
              }}
            >
              Prediction Model
            </UnstyledButton>
            {/* <UnstyledButton
                className="control"
                onClick={() => {
                  navigate("/home/maps");
                }}
              >
                Map
              </UnstyledButton> */}
            <Space w="lg" />
            <div
              style={{
                paddingTop: "8px",
              }}
            >
              <img
                title="Logo"
                src={""}
                style={{
                  width: "7em",
                  cursor: "pointer",
                }}
                onClick={() => {
                  navigate("/home/dashboard");
                }}
              />
            </div>
          </Group>
        </Group>
      </AppShell.Header>
    </AppShell>
  );
}
