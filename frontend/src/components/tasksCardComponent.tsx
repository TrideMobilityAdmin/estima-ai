import { AreaChart } from "@mantine/charts";
import {
  Card,
  SimpleGrid,
  Title,
  Text,
  Group,
  Flex,
  Space,
  Progress,
  Grid,
  Table,
  ScrollArea,
} from "@mantine/core";
import { useQuery } from "urql";
import { Query, SpareCosting } from "../gql/graphql";
import { GetSpareDetailsByTask } from "../types/analyticsTypes";
import { useEffect, useState } from "react";

export default function TasksCard(props: any) {
  const [groupsDataQuery] = useQuery<Query>({
    query: GetSpareDetailsByTask,
    variables: {
      sourceTask: props?.taskID,
    },
  });

  const [groupsData, setGroupsData] = useState<SpareCosting[]>([]);

  useEffect(() => {
    const { data } = groupsDataQuery;
    if (data?.GetSpareDetailsByTask?.length)
      setGroupsData(data?.GetSpareDetailsByTask || []);
  }, [groupsDataQuery, props?.taskID]);

  console.log("data-----", groupsData);
  console.log("tsakID-----", props?.taskID);
  // const elements = [
  //   { position: 6, name: "SLEEVE", partDesc: "DAN341-01", units: "EV" },
  //   { position: 7, name: "CONNECTOR", partDesc: "EN3646A61210BW", units: "EV" },
  //   { position: 39, name: "SCREW", partDesc: "MS21042-08", units: "EV" },
  //   { position: 56, name: "WASHER", partDesc: "NAS1149CN832R", units: "EV" },
  //   { position: 58, name: "BRAID", partDesc: "ABS1509D180NN", units: "EV" },
  //   {
  //     position: 6,
  //     name: "BONDINGSTRAP",
  //     partDesc: "D5518110700000",
  //     units: "EV",
  //   },
  //   { position: 7, name: "LEAD", partDesc: "E0088-10-125NN", units: "EV" },
  //   { position: 56, name: "METHYLETHYLKETONE", partDesc: "MEK", units: "EV" },
  //   { position: 58, name: "RIVET", partDesc: "NAS1097KE5-12", units: "EV" },
  //   {
  //     position: 6,
  //     name: "FuelTankSealant",
  //     partDesc: "P/S 890 A1/2",
  //     units: "EV",
  //   },
  //   { position: 7, name: "SEALANT", partDesc: "PR-1422 A2", units: "EV" },
  // ];
  const rows = groupsData[0]?.SpareQty?.map((el, index) => (
    <Table.Tr key={index}>
      <Table.Td >{el?.PartDescription || "-"}</Table.Td>
      <Table.Td >{el?.IssuedPart || "-"}</Table.Td>
      <Table.Td>{el?.MovAvgQtyRounded || "-"}</Table.Td>
      <Table.Td>{el?.Unit || "-"}</Table.Td>
      <Table.Td>{el?.Probability || "-"}</Table.Td>
      <Table.Td>{(el?.MoVAvgPrice)?.toFixed(2).toString() || "-"}</Table.Td>
    </Table.Tr>
  ));

  // const data = [
  //   {
  //     date: "Min",
  //     Cost: groupsData[0]?.SparesCostTaskMin || 0,
  //   },
  //   {
  //     date: "Estimated",
  //     Cost: groupsData[0]?.SparesCostTaskEst || 0,
  //   },
  //   {
  //     date: "Max",
  //     Cost: groupsData[0]?.SparesCostTaskMax || 0,
  //   },
  // ];

  //  const barData = [
  //   { month: 'Min', ManHrs: 2, },
  //   { month: 'Estimated', ManHrs: 8,  },
  //   { month: 'Max', ManHrs: 15, },
  // ];

  return (
    <>
      <SimpleGrid cols={3}>
        <Flex direction={"column"}>
          <Card withBorder radius={10}>
            <Flex gap="lg" direction="column">
              <Title order={5}>Probability</Title>

              <Grid justify="flex-start" align="center">
                <Grid.Col span={10}>
                  <Progress value={parseInt(groupsData[0]?.TaskProb)} />
                </Grid.Col>
                <Grid.Col span={2}>
                  <Title order={5} ta={"end"}>
                    {groupsData[0]?.TaskProb || 0}
                  </Title>
                </Grid.Col>
              </Grid>
            </Flex>
          </Card>
          <Space h={10} />
          <Card withBorder radius={10}>
            <Flex gap="lg" direction="column">
              <Title order={5}>Est Man Hrs.</Title>
              {/* <BarChart
                h={150}
                data={barData}
                dataKey="month"
                orientation="vertical"
                yAxisProps={{ width: 80 }}
                
                // barProps={{ radius: 10 }}
                series={[{ name: "ManHrs", color: "green.6" }]}
              /> */}
              <Grid justify="flex-start" align="center">
                <Grid.Col span={2}>
                  <Text>Min</Text>
                </Grid.Col>
                <Grid.Col span={10}>
                  <Group justify="flex-end">{groupsData[0]?.MHTMin} Hrs</Group>
                  <Progress color="green" value={groupsData[0]?.MHTMin} />
                </Grid.Col>
              </Grid>

              <Grid justify="flex-start" align="center">
                <Grid.Col span={2}>
                  <Text>Estimated</Text>
                </Grid.Col>
                <Grid.Col span={10}>
                  <Group justify="flex-end">{groupsData[0]?.MHTEst} Hrs</Group>
                  <Progress color="yellow" value={groupsData[0]?.MHTEst} />
                </Grid.Col>
              </Grid>

              <Grid justify="flex-start" align="center">
                <Grid.Col span={2}>
                  <Text>Max</Text>
                </Grid.Col>
                <Grid.Col span={10}>
                  <Group justify="flex-end">{groupsData[0]?.MHTMax} Hrs</Group>
                  <Progress color="red" value={groupsData[0]?.MHTMax} />
                </Grid.Col>
              </Grid>
            </Flex>
          </Card>
          <Space h={10} />
          <Card withBorder radius={10}>
            <Group justify="space-between">
              <Title order={5}> Est Spare Cost </Title>
              <Text>$ {groupsData[0]?.SparesCostTaskEst?.toFixed(2).toString() || 0}</Text>
            </Group>
          </Card>
        </Flex>
        <Card withBorder radius={10}>
          <ScrollArea
            h={320}
            type="hover"
            scrollbarSize={4}
            scrollHideDelay={50}
          >
            <Table miw={500} withRowBorders={false}>
              <Table.Thead
              >
                <Table.Tr>
                  <Table.Th>Part Desc</Table.Th>
                  <Table.Th>Part Number</Table.Th>
                  <Table.Th>Qty</Table.Th>
                  <Table.Th>Unt</Table.Th>
                  <Table.Th>Probability</Table.Th>
                  <Table.Th>Price($)</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>{rows}</Table.Tbody>
              {/* <Table.Caption>Scroll page to see sticky thead</Table.Caption> */}
            </Table>
          </ScrollArea>
        </Card>
        <Card withBorder radius={10}>
          <Flex gap="lg" direction="column">
            <Title order={5}>Spare Cost ($)</Title>
            <AreaChart
              h={280}
              data={[
                {
                  date: "Min",
                  Cost: groupsData[0]?.SparesCostTaskMin * (0.012) || 0,
                },
                // {
                //   date: "Estimated",
                //   Cost: groupsData[0]?.SparesCostTaskEst || 0,
                // },
                {
                  date: "Max",
                  Cost: groupsData[0]?.SparesCostTaskMax * (0.012) || 0,
                },
              ]}
              dataKey="date"
              series={[{ name: "Cost", color: "indigo.6" }]}
              curveType="natural"
              connectNulls
            />
          </Flex>
        </Card>
      </SimpleGrid>
    </>
  );
}
