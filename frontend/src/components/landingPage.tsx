import { Title, Text, Container, Overlay } from "@mantine/core";

export default function LandingPage() {
  return (
    <>
      {/* <div
  style={{
    position: "relative",
    height: "100vh",
    width: "100vw",
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.65)), url(${aircraftBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed", // Fixed background to prevent scrolling
    backgroundRepeat: "no-repeat", // No repeating of the image
  }}
>
  <Stack align="center">
    <Space h={250} />
    <Title
      style={{
        color: "white",
        fontSize: 60,
        fontWeight: 900,
        lineHeight: 1.1,
      }}
      order={1}
    >
      AIRCRAFT MAINTENANCE SERVICE & SUPPORT
    </Title>
    <Text
      style={{
        color: "white",
        maxWidth: 900,
        fontSize: 25,
        textAlign: "center",
      }}
      size="xl"
      mt="xl"
    >
     Were dedicated to a world-class experience throughout the lifetime of aircraft ownership with service and support to help you maintain your aircraft
    </Text>
    {/* <Text
      style={{
        color: "whitegradient="linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, .65) 40%)"",
        maxWidth: 900,
        fontSize: 25,
        textAlign: "center",
      }}
      size="xl"
    >
      Intelligent EvTracking
    </Text> 
  </Stack>
</div> */}

{/* <Box >
      <BackgroundImage
        src={aircraftBg}
        radius="sm"
      >
        <Container h={"800"}>
        <Center p="md">
          <Text c="white">
            BackgroundImage component can be used to add any content on image. It is useful for hero
            headers and other similar sections
          </Text>
        </Center>
        </Container>
      </BackgroundImage>
    </Box> */}


      <div
        style={{
          position: "relative",
          backgroundImage: "url(aircraftService.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          height: "100vh",
          width: "100vw", // Full width of the viewport
          margin: 0, // Remove default margin
          padding: 0, // Remove default padding
        }}
      >
        <Overlay
          gradient="linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, .65) 40%)"
          opacity={1}
          zIndex={0}
        />
        <Container
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: `20`,
            zIndex: 1,
            position: "relative",
            height: "100vh",
            // [theme.fn.smallerThan("sm")]: {
            //   height: 500,
            //   paddingBottom: `calc(${theme.spacing.xl} * 3)`,
            // },
          }}
          size={"lg"}
        >
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
            AIRCRAFT MAINTENANCE SERVICE & SUPPORT
          </Title>
          <Text
            style={{
              color: "white",
              maxWidth: 900,
              fontSize: 25,
              textAlign: "center",
            }}
            size="xl"
            mt="xl"
          >
            Were dedicated to a world-class experience throughout the lifetime
            of aircraft ownership with service and support to help you maintain
            your aircraft
          </Text>
          <Text
            style={{
              color: "white",
              maxWidth: 900,
              fontSize: 25,
              textAlign: "center",
            }}
            size="xl"
          >
            {" "}
           
          </Text>
        </Container>
      </div>
    </>
  );
}
