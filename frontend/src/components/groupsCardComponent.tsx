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
  Collapse,
  ActionIcon,
} from "@mantine/core";
import TableCreation from "./TableCreation";
import { useState } from "react";
import {
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";

export default function GroupsCard() {
  const elements = [
    { position: 6, name: "SLEEVE", partDesc: "DAN341-01", units: "EV" },
    { position: 7, name: "CONNECTOR", partDesc: "EN3646A61210BW", units: "EV" },
    { position: 39, name: "SCREW", partDesc: "MS21042-08", units: "EV" },
    { position: 56, name: "WASHER", partDesc: "NAS1149CN832R", units: "EV" },
    { position: 58, name: "BRAID", partDesc: "ABS1509D180NN", units: "EV" },
    { position: 6, name: "BONDINGSTRAP", partDesc: "D5518110700000", units: "EV" },
    { position: 7, name: "LEAD", partDesc: "E0088-10-125NN", units: "EV" },
    { position: 56, name: "METHYLETHYLKETONE", partDesc: "MEK", units: "EV" },
    { position: 58, name: "RIVET", partDesc: "NAS1097KE5-12", units: "EV" },
    { position: 6, name: "FuelTankSealant", partDesc: "P/S 890 A1/2", units: "EV" },
    { position: 7, name: "SEALANT", partDesc: "PR-1422 A2", units: "EV" },
  ];
  const rows = elements.map((element) => (
    <Table.Tr key={element.name}>
      <Table.Td>{element.name}</Table.Td>
      <Table.Td>{element.partDesc}</Table.Td>
      <Table.Td>{element.position}</Table.Td>
      <Table.Td>{element.units}</Table.Td>
    </Table.Tr>
  ));

  const data = [
    {
      date: "Min",
      Cost: 100,
    },
    {
      date: "Estimated",
      Cost: 600,
    },
    {
      date: "Max",
      Cost: 200,
    },
  ];
  const [opened, setOpened] = useState(false);
  return (
    <>
      <Group justify="space-between">
        <Title order={5}>Group - 01</Title>
        <ActionIcon
          variant="default"
          size="xl"
          radius="xl"
          aria-label="Settings"
          onClick={() => setOpened((o) => !o)}
        >
          {opened ? (
            <IconChevronUp
              style={{ width: "70%", height: "70%" }}
              stroke={1.5}
            />
          ) : (
            <IconChevronDown
              style={{ width: "70%", height: "70%" }}
              stroke={1.5}
            />
          )}
        </ActionIcon>
      </Group>
      <Space h={10} />
      <Collapse
        in={opened}
        style={{
          maxHeight: opened ? "1000px" : "",
          overflow: "hidden",
          transition: "max-height 0.3s ease-in-out",
        }}
      >
        {/* <Grid p={0}>
          <Grid.Col span={9}> */}
        <Card withBorder radius={10}>
          <Grid justify="flex-start">
            <Grid.Col span={1.2}>
              <Text >Description :</Text>
            </Grid.Col>
            <Grid.Col span={10}>
            <Text c={"grey"}>
              DURING INSPECTION FOUND BULK CARGO DOOR FRAME STOP FITTING
              HARDWARE FOUND DAMAGED SAME NEED TO BE REPLACED.
            </Text>
            </Grid.Col>
          </Grid>
          <Grid justify="flex-start">
            <Grid.Col span={1.2}>
              <Text >Corrective Action :</Text>
            </Grid.Col>
            <Grid.Col span={10}>
            <Text c={"grey"} >
              DURING INSPECTION FOUND BULK CARGO DOOR FRAME STOP FITTING
              HARDWARE FOUND DAMAGED SAME NEED TO BE REPLACED.DURING INSPECTION FOUND BULK CARGO DOOR FRAME STOP FITTING
              HARDWARE FOUND DAMAGED SAME NEED TO BE REPLACED.
            </Text>
            </Grid.Col>
          </Grid>
        </Card>
        {/* </Grid.Col> */}
        {/* <Grid.Col span={3}>
            <Card p={10} withBorder radius={10}>
              <Group justify="space-between">
                <Group>
                  <Text c={"grey"}>No of Aircrafts :</Text>
                  <Text>4</Text>
                </Group>
                <Group>
                  <Text c={"grey"}>Frequency :</Text>
                  <Text>2.4</Text>
                </Group>
              </Group>
            </Card>
          </Grid.Col> */}
        {/* </Grid> */}
        <Space h={10} />
        <SimpleGrid cols={3}>
          <Flex direction={"column"}>
            <Card withBorder radius={10}>
              <Flex gap="lg" direction="column">
                <Title order={5}>Probability</Title>

                <Grid justify="flex-start" align="center">
                  <Grid.Col span={10}>
                    <Progress value={50} />
                  </Grid.Col>
                  <Grid.Col span={2}>
                    <Title order={5} ta={"end"}>60%</Title>
                  </Grid.Col>
                </Grid>
              </Flex>
            </Card>
            <Space h={10} />
            <Card withBorder radius={10}>
              <Flex gap="lg" direction="column">
                <Title order={5}>Est Man Hrs.</Title>

                <Grid justify="flex-start" align="center">
                  <Grid.Col span={2}>
                    <Text>Min</Text>
                  </Grid.Col>
                  <Grid.Col span={10}>
                    <Group justify="flex-end">5</Group>
                    <Progress color="green" value={30} />
                  </Grid.Col>
                </Grid>

                <Grid justify="flex-start" align="center">
                  <Grid.Col span={2}>
                    <Text>Average</Text>
                  </Grid.Col>
                  <Grid.Col span={10}>
                    <Group justify="flex-end">9</Group>
                    <Progress color="yellow" value={50} />
                  </Grid.Col>
                </Grid>

                <Grid justify="flex-start" align="center">
                  <Grid.Col span={2}>
                    <Text>Max</Text>
                  </Grid.Col>
                  <Grid.Col span={10}>
                    <Group justify="flex-end">15</Group>
                    <Progress color="red" value={80} />
                  </Grid.Col>
                </Grid>
              </Flex>
            </Card>
          </Flex>
          <Card withBorder radius={10}>
            <ScrollArea h={280} type="auto" offsetScrollbars scrollbarSize={6}>
              <Table withRowBorders={false}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Part Desc</Table.Th>
                    <Table.Th>Part Number</Table.Th>
                    <Table.Th>Qty</Table.Th>
                    <Table.Th>Unt</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>{rows}</Table.Tbody>
                {/* <Table.Caption>Scroll page to see sticky thead</Table.Caption> */}
              </Table>
            </ScrollArea>
          </Card>
          <Card withBorder radius={10}>
            <Flex gap="lg" direction="column">
              <Title order={5}>Est Spare Cost</Title>
              <AreaChart
                h={250}
                data={data}
                dataKey="date"
                series={[{ name: "Cost", color: "orange.6" }]}
                curveType="natural"
                connectNulls
              />
            </Flex>
          </Card>
        </SimpleGrid>
        <Space h={15} />

        <TableCreation
          tableHeading={[
            "Log Item",
            "Description",
            "Corrective Action",
            "Man Hrs",
          ]}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tableData={[]}
          // {telematics
          //   .sort((a, b) => {
          //     return (
          //       dayjs(a?.time_stamp).unix() - dayjs(b?.time_stamp).unix()
          //     );
          //   })
          //   .slice((page - 1) * 10, page * 10)
          //   .map((el: Telematics) => {
          //     return [
          //       dayjs(el?.time_stamp).format("MMM-DD HH:mm:ss"),
          //       el?.speed.toFixed(2),
          //       el?.distance.toFixed(2),
          //       el?.altitude.toFixed(2),
          //       el?.signal.toFixed(2),
          //       el?.auxiliaryVoltage.toFixed(2),
          //       el?.remainingRange.toFixed(2),
          //       el?.batteryVoltage.toFixed(2),
          //       el?.batteryCurrent.toFixed(2),
          //       el?.cellMaxVoltage.toFixed(2),
          //       el?.cellMinVoltage.toFixed(2),
          //       el?.batterySoc.toFixed(2),
          //       el?.mcuDcVoltage.toFixed(2),
          //       el?.mcuDcCurrent.toFixed(2),
          //       el?.mcuAcrmsCurrent.toFixed(2),
          //       el?.mcuSpeed.toFixed(2),
          //       el?.mcuTemperature.toFixed(2),
          //       el?.mcuTotalOdo.toFixed(2),
          //       el?.mcuTripInfo.toFixed(2),
          //       el?.maxTemperature.toFixed(2),
          //       el?.throughput.toFixed(2),
          //       el?.batterySoh.toFixed(2),
          //       el?.latitude.toFixed(4),
          //       el?.longitude.toFixed(4),
          //     ];
          //   })}
        />
      </Collapse>
    </>
  );
}
