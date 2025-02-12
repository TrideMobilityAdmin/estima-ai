import { Card, Text, Flex, Group, Select, SimpleGrid, Space, Title, Grid, TextInput, Accordion, Badge, ScrollArea, Input } from "@mantine/core";
import { useEffect, useState } from "../constants/GlobalImports";
import { DatePickerInput } from "@mantine/dates";
import { IconAlertTriangle, IconCube, IconMenuDeep, IconTool } from "@tabler/icons-react";
import ReactApexChart from "react-apexcharts";
import '../App.css';
import { useApiPartUsage } from "../api/services/partUsageService";
// import { useApiPartUsage } from "../api/services/partUsageService";

export default function PartUsage() {
    const { getPartUsage } = useApiPartUsage(); // API function
    const [partId, setPartId] = useState<string>(""); // Input field for part ID
    const [value, setValue] = useState<[Date | null, Date | null]>([null, null]); // Date range state
    const [partUsageData, setPartUsageData] = useState<any[]>([]); // Store API response

    // Function to call API when partId or date range changes
    useEffect(() => {
        if (partId) {

            fetchPartUsage(partId);
        }
    }, [partId, value]);

    const fetchPartUsage = async (partId: string) => {
        try {
            const response = await getPartUsage(partId);
            setPartUsageData(response);
        } catch (error) {
            console.error("Error fetching part usage:", error);
        }
    };

    console.log("part usage ui resp >>>>",partUsageData);

    const jsonData = {
        partId: 'P12345',
        partDescription: "Oil Filter",
        usage: {
            tasks: [
                {
                    taskId: 'ST123',
                    taskDescription: 'Routine Engine Inspection',
                    packages: [
                        {
                            packageId: "Package1",
                            date: "2024-12-10",
                            quantity: 3,
                        },
                        {
                            packageId: "Package2",
                            date: "2024-12-12",
                            quantity: 1
                        }
                    ]
                },
                {
                    taskId: 'ST124',
                    taskDescription: 'Hydraulic System Check',
                    packages: [
                        {
                            packageId: "Package1",
                            date: "2024-12-11",
                            quantity: 2,
                        },
                        {
                            packageId: "Package2",
                            date: "2024-12-13",
                            quantity: 5
                        }
                    ]
                }
            ],
            findings: [
                {
                    taskId: 'ST123',
                    taskDescription: 'Routine Engine Inspection',
                    packages: [
                        {
                            packageId: "Package1",
                            finding: "Engine Check",
                            logItem: "L001",
                            description: "Engine oil leakage inspection",
                            date: "2024-12-10",
                            quantity: 2,
                        },
                        {
                            packageId: "Package2",
                            finding: "Air System",
                            logItem: "L003",
                            description: "Air filter replacement",
                            date: "2024-12-12",
                            quantity: 3
                        }
                    ]
                },
                {
                    taskId: 'ST124',
                    taskDescription: 'Hydraulic System Check',
                    packages: [
                        {
                            packageId: "Package1",
                            finding: "Fuel System",
                            logItem: "L002",
                            description: "Fuel pump inspection",
                            date: "2024-12-11",
                            quantity: 1,
                        },
                        {
                            packageId: "Package2",
                            finding: "Hydraulic System",
                            logItem: "L004",
                            description: "Hydraulic fluid refill",
                            date: "2024-12-13",
                            quantity: 4
                        }
                    ]
                },
            ]
        }
    };

    const [taskSearch, setTaskSearch] = useState("");
    const [findingSearch, setFindingSearch] = useState("");

    const filteredTasks = jsonData.usage.tasks.filter((task) =>
        task.taskId.toLowerCase().includes(taskSearch.toLowerCase())
    );

    // Prepare Data for the tasks wise Bar Graph
    const taskIds = filteredTasks.map((task) => task.taskId);
    const taskWisePackageLength = filteredTasks.map((task) => task.packages.length);
    const taskWiseTotalQuantity = filteredTasks.map((task) =>
        task.packages.reduce((sum, pkg) => sum + pkg.quantity, 0)
    );

    const filteredFindings = jsonData.usage.findings.filter((finding) =>
        finding.taskId.toLowerCase().includes(findingSearch.toLowerCase())
    );

    // Prepare Data for the Findings wise Bar Graph
    const findingIds = filteredFindings.map((task) => task.taskId);
    const findingWisePackageLength = filteredFindings.map((task) => task.packages.length);
    const findingWiseTotalQuantity = filteredFindings.map((task) =>
        task.packages.reduce((sum, pkg) => sum + pkg.quantity, 0)
    );

    return (
        <>
            <div style={{ paddingLeft: 150, paddingRight: 150, paddingTop: 20, paddingBottom: 20 }}>
                <Group justify="flex-end">
                <TextInput
        size="xs"
        label="Enter Part ID"
        placeholder="Type Part ID"
        value={partId}
        onChange={(event) => setPartId(event.currentTarget.value)}
      />
                    <DatePickerInput
                        size="xs"
                        w='18vw'
                        type="range"
                        label="Pick dates range"
                        placeholder="Pick dates range"
                        value={value}
                        onChange={setValue}
                    />
                </Group>
                <Space h='sm' />
                <SimpleGrid cols={4}>
                    <Card radius='md'>
                        <Group gap='lg'>
                            <IconCube color="#4E66DE" size='39' />
                            <Flex direction='column'>
                                <Text fw={500} fz='sm' c='dimmed'>
                                    Tasks
                                </Text>
                                <Text fw={600} fz='h2' >
                                    66
                                </Text>
                            </Flex>
                        </Group>
                    </Card>
                    <Card radius='md' >
                        <Group gap='lg'>
                            <IconTool color="#14AE5C" size='39' />
                            <Flex direction='column'>
                                <Text fw={500} fz='sm' c='dimmed'>
                                    Tasks Parts Quantity
                                </Text>
                                <Text fw={600} fz='h2' >
                                    145
                                </Text>
                            </Flex>
                        </Group>
                    </Card>
                    <Card radius='md' >
                        <Group gap='lg'>
                            <IconAlertTriangle color="#EE0D10" size='39' />
                            <Flex direction='column'>
                                <Text fw={500} fz='sm' c='dimmed'>
                                    Findings
                                </Text>
                                <Text fw={600} fz='h2' >
                                    44
                                </Text>
                            </Flex>
                        </Group>
                    </Card>
                    <Card radius='md'>
                        <Group gap='lg'>
                            <IconMenuDeep color="#9F6BED" size='39' />
                            <Flex direction='column'>
                                <Text fw={500} fz='sm' c='dimmed'>
                                    Findings Parts Quantity
                                </Text>
                                <Text fw={600} fz='h2' >
                                    144
                                </Text>
                            </Flex>
                        </Group>
                    </Card>
                </SimpleGrid>
                <Space h='sm' />
                <Grid>
                    <Grid.Col span={8}>
                        <Card radius='md' h='60vh'>
                            <ReactApexChart
                                type="area"
                                height='100%'
                                options={{
                                    chart: {
                                        type: "area",
                                        height: "100%",
                                        zoom: { enabled: false },
                                    },
                                    dataLabels: { enabled: false },
                                    stroke: {
                                        curve: "smooth",
                                        width: 2, // Reduce line thickness
                                    },
                                    title: {
                                        text: "Daily Trend Analysis",
                                        align: "left",
                                    },
                                    grid: {
                                        row: { colors: ["#f3f3f3", "transparent"], opacity: 0.5 },
                                    },
                                    xaxis: {
                                        type: "category",
                                        categories: ["Feb - 01", "Feb - 02", "Feb - 03", "Feb - 04", "Feb - 05", "Feb - 06"],
                                        // title: { text: "Date" },
                                    },
                                    yaxis: {
                                        // title: { text: "Count" },
                                    },
                                }}
                                series={[
                                    {
                                        name: "Tasks",
                                        data: [4, 10, 6, 20, 4, 9],
                                    },
                                    {
                                        name: "Findings",
                                        data: [4, 10, 6, 20, 4, 9].reverse(),
                                    },
                                ]}
                            />
                        </Card>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Card radius='md' h='60vh'>
                            <ReactApexChart
                                type="donut"
                                height='100%'
                                options={{
                                    chart: {
                                        type: "donut",
                                    },
                                    title: {
                                        text: "Distribution Analysis",
                                        align: "left",
                                    },
                                    plotOptions: {
                                        pie: {
                                            donut: {
                                                size: "65%", // Adjusted to center the donut
                                            },
                                        },
                                    },
                                    labels: ["Tasks", "Findings"],
                                    legend: {
                                        position: "bottom",
                                    },
                                    responsive: [
                                        {
                                            breakpoint: 480,
                                            options: {
                                                chart: {
                                                    width: 200,
                                                },
                                                legend: {
                                                    position: "bottom",
                                                },
                                            },
                                        },
                                    ],
                                }}
                                series={[
                                    44,
                                    55
                                ]}
                            />
                        </Card>
                    </Grid.Col>
                </Grid>
                <Space h='md' />
                <SimpleGrid cols={2}>

                    <Card radius='md' h='95vh' style={{ overflowY: "auto" }}>
                        <Title order={5}>
                            Tasks
                        </Title>
                        <Card
                            style={{
                                width: "100%",
                                height: "600px", // Increase the Card height
                                overflowX: "auto", // Enable horizontal scrolling
                                overflowY: "hidden", // Prevent vertical scrolling
                                scrollbarWidth: 'thin',

                            }}
                        >
                            <div
                                style={{
                                    width: Math.max(taskIds?.length * 80, 400), // Set minimum width to 400px or adjust as needed
                                }}
                                className="scrollable-container"
                            >
                                <ReactApexChart
                                    type="bar"
                                    height={250}
                                    width={Math.max(taskIds?.length * 80, 400)} // Dynamic width for scrolling
                                    options={{
                                        chart: {
                                            type: "bar",
                                            height: 350,
                                            width: Math.max(taskIds?.length * 80, 400), // Ensures chart expands with tasks
                                            toolbar: { show: true },
                                        },
                                        plotOptions: {
                                            bar: {
                                                horizontal: false,
                                                columnWidth: "50%",
                                                borderRadius: 5,
                                                borderRadiusApplication: "end",
                                            },
                                        },
                                        //   title: { text: "Tasks Details", align: "left" },
                                        colors: ["#4E66DE", "#F39C12"],
                                        dataLabels: { enabled: true },
                                        xaxis: { categories: taskIds },
                                        yaxis: { title: { text: "Packages Data" } },
                                        fill: { opacity: 1 },
                                        tooltip: { y: { formatter: (val: number) => `${val} items` } },
                                        grid: { padding: { right: 20 } },
                                        responsive: [
                                            {
                                                breakpoint: 600,
                                                options: {
                                                    plotOptions: {
                                                        bar: { columnWidth: "70%" },
                                                    },
                                                },
                                            },
                                        ],
                                    }}
                                    series={[
                                        { name: "Packages", data: taskWisePackageLength },
                                        { name: "Quantity", data: taskWiseTotalQuantity },
                                    ]}
                                />
                            </div>
                        </Card>


                        <TextInput
                            placeholder="Search Tasks..."
                            value={taskSearch}
                            onChange={(e) => setTaskSearch(e.currentTarget.value)}
                            mb="md"
                        />
                        <ScrollArea h='90vh' scrollbarSize={0} scrollHideDelay={0}>
                            <Accordion defaultValue={filteredTasks[0].taskId} variant="separated" radius="md">
                                {filteredTasks.map((task) => (
                                    <Accordion.Item key={task.taskId} value={task.taskId}>
                                        <Accordion.Control>
                                            <Group>
                                                <IconCube color="#4E66DE" />
                                                {task.taskId}
                                            </Group>

                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <ScrollArea h={300} scrollHideDelay={0}>

                                                {task.packages.map((pkg) => (
                                                    <Card key={pkg.packageId} p="sm" radius='md' mt="xs" bg='#ebeced'>
                                                        <Group justify="space-between" align="flex-start">
                                                            <Flex direction='column'>
                                                                <Group>
                                                                    <Text c='dimmed' fz='sm'>
                                                                        Package ID :
                                                                    </Text>
                                                                    <Text fw={500} fz='sm'>{pkg.packageId}</Text>
                                                                </Group>
                                                                <Group>
                                                                    <Text c='dimmed' fz='sm'>
                                                                        Date :
                                                                    </Text>
                                                                    <Text fw={500} fz='sm'>{pkg.date}</Text>
                                                                </Group>
                                                            </Flex>


                                                            <Badge color="blue">Qty: {pkg.quantity}</Badge>
                                                        </Group>
                                                    </Card>
                                                ))}
                                            </ScrollArea>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                ))}
                            </Accordion>
                        </ScrollArea>
                    </Card>
                    <Card radius='md' h='95vh' style={{ overflowY: "auto" }}>
                        <Title order={5}>
                            Findings
                        </Title>
                        <Card
                            style={{
                                width: "100%",
                                height: "600px", // Increase the Card height
                                overflowX: "auto", // Enable horizontal scrolling
                                overflowY: "hidden", // Prevent vertical scrolling
                                scrollbarWidth: 'thin',

                            }}
                        >
                            <div
                                style={{
                                    width: Math.max(taskIds?.length * 80, 400), // Set minimum width to 400px or adjust as needed
                                }}
                                className="scrollable-container"
                            >
                                <ReactApexChart
                                    type="bar"
                                    height='250'
                                    width={Math.max(findingIds?.length * 80, 400)} // Dynamic width for horizontal scrolling

                                    options={
                                        {
                                            chart: {
                                                type: "bar",
                                                height: 350,
                                                width: Math.max(findingIds?.length * 80, 400), // Dynamic width for horizontal scrolling
                                                toolbar: {
                                                    show: true,
                                                },
                                            },
                                            plotOptions: {
                                                bar: {
                                                    horizontal: false,
                                                    columnWidth: "50%",
                                                    borderRadius: 5,
                                                    borderRadiusApplication: "end",
                                                },
                                            },
                                            // title: {
                                            //     text: "Findings Details",
                                            //     align: "left",
                                            // },
                                            colors: ["#4E66DE", "#F39C12"], // Custom colors for bars
                                            dataLabels: {
                                                enabled: true,
                                            },
                                            xaxis: {
                                                categories: findingIds,
                                            },
                                            yaxis: {
                                                title: {
                                                    text: "Packages Data",
                                                },
                                            },
                                            fill: {
                                                opacity: 1,
                                            },
                                            tooltip: {
                                                y: {
                                                    formatter: (val: number) => `${val} items`,
                                                },
                                            },
                                            grid: {
                                                padding: {
                                                    right: 20,
                                                },
                                            },
                                            responsive: [
                                                {
                                                    breakpoint: 600,
                                                    options: {
                                                        plotOptions: {
                                                            bar: {
                                                                columnWidth: "60%",
                                                            },
                                                        },
                                                    },
                                                },
                                            ],
                                        }
                                    }
                                    series={[
                                        { name: "Packages", data: findingWisePackageLength },
                                        { name: "Quantity", data: findingWiseTotalQuantity },
                                    ]}
                                />
                            </div>
                        </Card>
                        <TextInput
                            placeholder="Search Findings..."
                            value={findingSearch}
                            onChange={(e) => setFindingSearch(e.currentTarget.value)}
                            mb="md"
                        />
                        <ScrollArea h='90vh' scrollbarSize={0} scrollHideDelay={0}>
                            <Accordion defaultValue={filteredFindings[0].taskId} variant="separated" radius="md">
                                {filteredFindings.map((finding) => (
                                    <Accordion.Item key={finding.taskId} value={finding.taskId}>
                                        <Accordion.Control>
                                            <Group>
                                                <IconAlertTriangle color="#4E66DE" />
                                                {finding.taskId}
                                            </Group>
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <ScrollArea h={300} scrollHideDelay={0}>

                                                {finding.packages.map((pkg) => (
                                                    <Card key={pkg.packageId} p="sm" radius='md' mt="xs" bg='#ebeced'>
                                                        <Group justify="space-between">
                                                            <Text fw='500'>{pkg.finding}</Text>
                                                            <Badge color="red">Qty: {pkg.quantity}</Badge>
                                                        </Group>
                                                        <Group>
                                                            <Text c='dimmed' fz='sm'>
                                                                Log Item :
                                                            </Text>
                                                            <Text fw={500} fz='sm'>{pkg.logItem}</Text>
                                                        </Group>
                                                        <Group>
                                                            <Text c='dimmed' fz='sm'>
                                                                Description :
                                                            </Text>
                                                            <Text fw={500} fz='sm'>{pkg.description}</Text>
                                                        </Group>
                                                        <Group>
                                                            <Text c='dimmed' fz='sm'>
                                                                Date :
                                                            </Text>
                                                            <Text fw={500} fz='sm'>{pkg.date}</Text>
                                                        </Group>
                                                    </Card>
                                                ))}
                                            </ScrollArea>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                ))}
                            </Accordion>
                        </ScrollArea>
                    </Card>
                </SimpleGrid>
            </div>
        </>
    )
}