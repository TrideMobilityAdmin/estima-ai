import { Title, Text, Container, Overlay, Flex, Space } from "@mantine/core";
import aircraftServiceBg from '../../public/aircraftService.jpg';
// import aircraftServiceBg from '../../public/airCraft4.jpg';
export default function LandingPage() {
  return (
    <>
      <div
        style={{
          position: "relative",
          backgroundImage: `url(${aircraftServiceBg})`,
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
          <Flex align='center' justify='center' direction='column'>
            <Title
              style={{
                color: "white",
                fontSize: 70,
                fontWeight: 900,
                lineHeight: 1.1,
                textAlign: "center",
              }}
              order={1}
            >
              EstimaAI
            </Title>
            <Title
              // style={{
              //   color: "white",
              //   fontSize: 25,
              //   fontWeight: 600,
              //   // lineHeight: 1.1,
              //   textAlign: "center",
              // }}
              c='white'
              fw='600'
              fz='30'
            >
              Intelligent RFQ Predictor
            </Title>
          </Flex>

          <Space h='lg' />

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
            Advanced AI-powered solutions to optimize RFQ predictions tailored for the aviation industry.
          </Text>

        </Container>
      </div>
    </>
  );
}
