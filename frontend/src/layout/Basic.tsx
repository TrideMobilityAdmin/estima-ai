import {gmrIcon,ActionIcon, AppShell, Button, Flex, Group, useDisclosure, Outlet, useNavigate, useState,Text, Menu,IconLogout, IconUser, IconTrash, IconMessageCircle, IconPhoto, IconSearch, IconSettings, IconArrowsLeftRight, Card, Avatar} from "../constants/GlobalImports";

export default function Basic() {

  const navigate = useNavigate();
  const [opened] = useDisclosure();
  const [active, setActive] = useState('');

  const links = [
    { link: '/home/estimate', label: 'ESTIMATE' },
    { link: '/home/compare-estimate', label: 'COMPARE ESTIMATE' },
    { link: '/home/part-usage', label: 'PART USAGE' },
    { link: '/home/skill-requirement', label: 'SKILL REQUIREMENT' },
    { link: '/home/expert-insights', label: 'CONFIGURATION' },
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
        <div style={{
          height: 60, 
          backgroundColor:"#1A237E",
          // background: "rgba(255, 255, 255, 0.3)",
          // backdropFilter: "blur(2px)",
          }}>
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
          <Menu shadow="md" width={250}>
      <Menu.Target>
         <ActionIcon variant="default" color="indigo" size="lg" radius="lg" aria-label="Settings">
      <IconUser style={{ width: '70%', height: '70%' }} width={1.5} />
    </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        {/* <Menu.Item> */}
          <Card  w="100%">
            <Flex direction='column' align='center' justify='center'>
            {/* <Avatar src={gmrIcon} variant="light" radius="md" size="lg" /> */}
                      <div>
                        <img
                          src={gmrIcon}
                          style={{
                            height: "2em",
                            cursor: "pointer",
                            borderRadius: 15,
                          }}
                        />
                      </div>
            {/* <Flex direction='column'> */}
            <Text fw='bold' size="md">
              GMR EstimaAI
            </Text>
            <Text size="xs" c="dimmed">
              gmr@evrides.live
            </Text>
            {/* </Flex> */}
            
            </Flex>
          </Card>
        {/* </Menu.Item> */}
        <Menu.Divider />
        {/* <Menu.Label>Application</Menu.Label>
        <Menu.Item leftSection={<IconSettings size={14} />}>
          Users
        </Menu.Item>
        <Menu.Item leftSection={<IconMessageCircle size={14} />}>
          Messages
        </Menu.Item>
        <Menu.Divider /> */}
        <Menu.Item
          color="red"
          leftSection={<IconLogout size={14} />}
        >
          Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
          </div>
        </Flex>
        </div>
       
      </AppShell.Header>
      
      <AppShell.Main style={{ backgroundColor: "#ebebe6" }} p={0}>
        <Outlet />
      </AppShell.Main>

    </AppShell>
  );
}
