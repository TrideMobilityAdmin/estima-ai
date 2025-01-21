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
  Badge,
} from "@mantine/core";
import TableCreation from "./TableCreation";
import { useEffect, useState } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { GetGroupsByTask } from "../types/analyticsTypes";
import { Query } from "../gql/graphql";
import { useQuery } from "urql";

export default function GroupsComponent(props: any) {
  console.log("props  taskId>>>>", props?.taskID);

  const [groupsDataQuery] = useQuery<Query>({
    query: GetGroupsByTask,
    variables: {
      sourceTask: props?.taskID,
    },
  });

  const [groupsData, setGroupsData] = useState<any>();

  useEffect(() => {
    const { data } = groupsDataQuery;
    if (data?.GetGroupsByTask?.length) {
      setGroupsData(data?.GetGroupsByTask);
    }
  }, [groupsDataQuery, props?.taskID]);

  console.log("props data grps >>>>", groupsData);

  // Grouping the items by the "Group" property
  const groupedData = groupsData?.reduce((acc: any, curr: any) => {
    const groupKey = curr.Group;
    if (!acc[groupKey]) {
      acc[groupKey] = {
        Group: groupKey,
        data: [curr],
      };
    } else {
      acc[groupKey].data.push(curr);
    }
    return acc;
  }, {});

  // Converting the grouped data into an array
  const formattedData = groupedData ? Object.values(groupedData) : [];

  // Now, formattedData contains the desired format
  console.log("formattedData >> ", formattedData);

  // const groupedData = groupsData?.reduce((acc:any, obj:any) => {
  //   const { Group, ...rest } = obj;
  //   if (!acc[Group]) {
  //     acc[Group] = [];
  //   }
  //   acc[Group].push(rest);
  //   return acc;
  // }, {});

  // const groupedData = groupsData?.reduce((groups :any, item:any) => {
  //   const group = item.Group;
  //   groups[group] = groups[group] || [];
  //   groups[group].push(item);
  //   return groups;
  // }, {});

  // console.log(groupedData);

  // console.log("grouped data ",groupedData);
  // Converting the grouped data object to an array of group name objects
  // const finalOutput = Object.entries(groupedData).map(([groupName, tasks]) => ({
  //   groupName,
  //   tasks,
  // }));

  // console.log("finalOutput >>>",finalOutput);

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
  // const rows = formattedData?.map((element: any) =>
  //   element?.data[0]?.SpareQty?.map((el: any) => (
  //     <Table.Tr key={el?.Group}>
  //       <Table.Td style={{ width: "30%" }}>{el?.PartDescription}</Table.Td>
  //       <Table.Td style={{ width: "30%" }}>{el?.IssuedPart}</Table.Td>
  //       <Table.Td>{el?.MovAvgQtyRounded}</Table.Td>
  //       <Table.Td>{el?.Unit}</Table.Td>
  //     </Table.Tr>
  //   ))
  // );

  const [openedItems, setOpenedItems] = useState<
    Record<string | number, boolean>
  >({});
  const handleToggle = (index: number) => {
    // Specify index type as number (assuming your indexes are numbers)
    setOpenedItems({ ...openedItems, [index]: !openedItems[index] });
  };
  // .sort((a :any, b:any) => a.Group - b.Group)

  return (
    <>
      <Group>
        <Card withBorder radius={10}>
          <Group>
            {/* <Title order={5}>{props?.taskID}</Title> */}
            <Badge radius="md" variant="light" color={"cyan"} size="lg">
              <Title order={5}>{props?.taskID}</Title>
            </Badge>

            <Group>
              <Text c={"grey"} size={"md"}>
                Groups :
              </Text>
              <Badge radius="md" color={"cyan"} size="lg">
                <Title order={5}>{formattedData?.length}</Title>
              </Badge>
            </Group>
          </Group>
        </Card>
      </Group>
      {formattedData?.length > 0 ? (
        formattedData?.map((el: any, index: any) => {
          return (
            <div key={index}>
              <Card style={{ backgroundColor: "#F5F5F5" }} p={10}>
                <Group
                  p={0}
                  justify="space-between"
                  onClick={() => handleToggle(index)}
                >
                  <Title order={5}>Group - {el?.Group}</Title>
                  <ActionIcon
                    variant="default"
                    size="xl"
                    radius="xl"
                    aria-label="Settings"
                    onClick={() => handleToggle(index)}
                  >
                    {openedItems[index] ? (
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
              </Card>
              <Space h={10} />
              <Collapse
                key={index}
                in={openedItems[index]}
                style={{
                  maxHeight: openedItems[index] ? "2000px" : "",
                  overflow: "hidden",
                  transition: "max-height 0.3s ease-in-out",
                }}
              >
                <div>
                  {/* <Grid p={0}>
          <Grid.Col span={9}> */}
                  <Card withBorder radius={10}>
                    <Grid justify="flex-start">
                      <Grid.Col span={1.2}>
                        <Text>Description :</Text>
                      </Grid.Col>
                      <Grid.Col span={10}>
                        <Text c={"grey"}>{el?.data[0]?.Description}</Text>
                      </Grid.Col>
                    </Grid>
                    <Grid justify="flex-start">
                      <Grid.Col span={1.2}>
                        <Text>Corrective Action :</Text>
                      </Grid.Col>
                      <Grid.Col span={10}>
                        <Text c={"grey"}>{el?.data[0]?.CorrectiveAction}</Text>
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
                              <Progress
                                value={parseInt(el?.data[0]?.GroupProb)}
                              />
                            </Grid.Col>
                            <Grid.Col span={2}>
                              <Title order={5} ta={"end"}>
                                {el?.data[0]?.GroupProb}
                              </Title>
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
                              <Group justify="flex-end">
                                {el?.data[0]?.MHGMin} Hrs
                              </Group>
                              <Progress
                                color="green"
                                value={(el?.data[0]?.MHGEst * 100) / 100}
                              />
                            </Grid.Col>
                          </Grid>

                          <Grid justify="flex-start" align="center">
                            <Grid.Col span={2}>
                              <Text>Estimated</Text>
                            </Grid.Col>
                            <Grid.Col span={10}>
                              <Group justify="flex-end">
                                {el?.data[0]?.MHGEst} Hrs
                              </Group>
                              <Progress
                                color="yellow"
                                value={(el?.data[0]?.MHGEst * 100) / 100}
                              />
                            </Grid.Col>
                          </Grid>

                          <Grid justify="flex-start" align="center">
                            <Grid.Col span={2}>
                              <Text>Max</Text>
                            </Grid.Col>
                            <Grid.Col span={10}>
                              <Group justify="flex-end">
                                {el?.data[0]?.MHGMax} Hrs
                              </Group>
                              <Progress
                                color="red"
                                value={(el?.data[0]?.MHGMax * 100) / 100}
                              />
                            </Grid.Col>
                          </Grid>
                        </Flex>
                      </Card>
                      <Space h={10} />
                      <Card withBorder radius={10}>
                        <Group justify="space-between">
                          <Title order={5}> Est Spare Cost </Title>
                          <Text>
                            $ {el?.data[0]?.SparesCostGroupEst?.toFixed(2).toString()}{" "}
                          </Text>
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
                        <Table withRowBorders={false}>
                          <Table.Thead >
                            <Table.Tr>
                              <Table.Th>Part Desc</Table.Th>
                              <Table.Th>Part Number</Table.Th>
                              <Table.Th>Qty</Table.Th>
                              <Table.Th>Unt</Table.Th>
                              <Table.Th>Probability</Table.Th>
                              <Table.Th>Price($)</Table.Th>
                            </Table.Tr>
                          </Table.Thead>

                          <Table.Tbody>
                            {el?.data[0]?.SpareQty?.map((ele: any) => (
                              <Table.Tr key={ele?.Group}>
                                <Table.Td style={{ width: "35%" }}>
                                  {ele?.PartDescription}
                                </Table.Td>
                                <Table.Td style={{ width: "35%" }}>
                                  {ele?.IssuedPart}
                                </Table.Td>
                                <Table.Td>{ele?.MovAvgQtyRounded}</Table.Td>
                                <Table.Td>{ele?.Unit}</Table.Td>
                                <Table.Td>{ele?.Probability}</Table.Td>
                                <Table.Td>{ele?.MoVAvgPrice?.toFixed(2).toString()}</Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
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
                              Cost: el?.data[0]?.SparesCostGroupMin,
                            },
                            // {
                            //   date: "Estimated",
                            //   Cost: el?.data[0]?.SparesCostGroupEst,
                            // },
                            {
                              date: "Max",
                              Cost: el?.data[0]?.SparesCostGroupMax,
                            },
                          ]}
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
                      // "Man Hrs",
                    ]}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    tableData={
                      el?.data?.map((tab: any) => {
                        return [
                          tab?.LogItem,
                          tab?.Description,
                          tab?.CorrectiveAction,
                          // tab?.MHGEst
                        ];
                      })
                      // [
                      // el?.LogItem ? el?.LogItem : "", // Show "" if LogItem is missing
                      // el?.Description ? el?.Description : "",
                      // el?.CorrectiveAction ? el?.CorrectiveAction : "",
                      // el?.MHGEst ? el?.MHGEst : "",
                      // ]
                    }
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
                </div>
              </Collapse>
            </div>
          );
        })
      ) : (
        <></>
      )}
    </>
  );
}
