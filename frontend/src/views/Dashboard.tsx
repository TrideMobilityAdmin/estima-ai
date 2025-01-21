import {
  Card,
  Center,
  Container,
  Flex,
  Group,
  SimpleGrid,
  Title,
} from "@mantine/core";
import { AreaChart, PieChart } from "@mantine/charts";
import "@mantine/charts/styles.css";

export default function Dashboard() {
  const AreaData = [
    {
      date: "Mar 22",
      Apples: 2890,
      Oranges: 2338,
      Tomatoes: 2452,
    },
    {
      date: "Mar 23",
      Apples: 2756,
      Oranges: 2103,
      Tomatoes: 2402,
    },
    {
      date: "Mar 24",
      Apples: 3322,
      Oranges: 986,
      Tomatoes: 1821,
    },
    {
      date: "Mar 25",
      Apples: 3470,
      Oranges: 2108,
      Tomatoes: 2809,
    },
    {
      date: "Mar 26",
      Apples: 3129,
      Oranges: 1726,
      Tomatoes: 2290,
    },
  ];
  const PieData = [
    { name: "USA", value: 400, color: "indigo.6" },
    { name: "India", value: 300, color: "yellow.6" },
    { name: "Japan", value: 300, color: "teal.6" },
    { name: "Other", value: 200, color: "gray.6" },
  ];
  return (
    <>
      <Container fluid>
        <Title>Dashboard</Title>
        <SimpleGrid cols={3}>
          <Card withBorder radius="md" shadow="md">
            <AreaChart
              h={300}
              data={AreaData}
              dataKey="date"
              series={[
                { name: "Apples", color: "indigo.6" },
                { name: "Oranges", color: "blue.6" },
                { name: "Tomatoes", color: "teal.6" },
              ]}
              curveType="natural"
            />
          </Card>

          <Card
            withBorder
            shadow="lg"
            className="graphcard reactive"
            style={{
              borderRadius: "20px",
            }}
          >
            <Center>
              <PieChart
                data={PieData}
                size={300}
                withLabels
                labelsPosition="inside"
              />
            </Center>
          </Card>
          <Card withBorder radius="md" shadow="md">
            <Flex>
              <Group>
                <Card withBorder radius="md" shadow="md"></Card>
              </Group>
            </Flex>
          </Card>
        </SimpleGrid>
      </Container>
    </>
  );
}
