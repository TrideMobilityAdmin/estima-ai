import { Card, Text, Flex, Group, Select, Notification, SimpleGrid, Space, Title, Grid, TextInput, Accordion, Badge, ScrollArea, Input, Button, ActionIcon } from "@mantine/core";
import { showNotification, useEffect, useState } from "../constants/GlobalImports";
import { DatePickerInput } from "@mantine/dates";
import { IconAlertTriangle, IconCheck, IconCube, IconMenuDeep, IconTool } from "@tabler/icons-react";
import ReactApexChart from "react-apexcharts";
import '../App.css';
import { useApiPartUsage } from "../api/services/partUsageService";
// import { useApiPartUsage } from "../api/services/partUsageService";

export default function PartUsage() {
    const { getPartUsage } = useApiPartUsage(); // API function
    const [inputPartId, setInputPartId] = useState(""); // For input field
    const [validatedPartId, setValidatedPartId] = useState(""); // For API calls
    const [value, setValue] = useState<any>([]); // Date range
    const [partUsageData, setPartUsageData] = useState<any>();
    const [isLoading, setIsLoading] = useState(false);
    const [taskSearch, setTaskSearch] = useState("");
    const [findingSearch, setFindingSearch] = useState("");

    // Fetch data when validatedPartId or date range changes
    useEffect(() => {
        const fetchData = async () => {
            if (!validatedPartId) {
                setPartUsageData(null);
                return;
            }

            setIsLoading(true);
            try {
                const response = await getPartUsage(validatedPartId);
                setPartUsageData(response);
            } catch (error) {
                console.error("Error fetching part usage:", error);
                // showNotification({
                //     title: "Part Not Found!",
                //     message: "Please enter another Part Id",
                //     color: "orange",
                // });
                setPartUsageData(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [validatedPartId, value]);

    // Handle check button click
    const handleCheck = () => {
        setValidatedPartId(inputPartId);
    };

    // Search filter for tasks
    const filteredTasks = partUsageData?.usage?.tasks?.filter((task: any) =>
        task?.taskId?.toLowerCase().includes(taskSearch?.toLowerCase())
    );

    // Search filter for findings
    const filteredFindings = partUsageData?.usage?.findings?.filter((finding: any) =>
        finding?.taskId?.toLowerCase().includes(findingSearch?.toLowerCase())
    );

    // Prepare Data for the tasks wise Bar Graph
    const taskIds = filteredTasks?.map((task: any) => task.taskId);
    const taskWisePackageLength = filteredTasks?.map((task: any) => task?.packages?.length);
    const taskWiseTotalQuantity = filteredTasks?.map((task: any) =>
        task?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0)
    );

    // Prepare Data for the Findings wise Bar Graph
    const findingIds = filteredFindings?.map((task: any) => task?.taskId);
    const findingWisePackageLength = filteredFindings?.map((task: any) => task?.packages?.length);
    const findingWiseTotalQuantity = filteredFindings?.map((task: any) =>
        task?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0)
    );

    // Function to calculate total quantity for tasks
    function calculateTotalTaskQuantity(tasks: any) {
        return tasks?.reduce((total: any, task: any) => {
            const taskQuantity = task?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0);
            return total + taskQuantity;
        }, 0);
    }

    // Function to calculate total quantity for findings
    function calculateTotalFindingQuantity(findings: any) {
        return findings?.reduce((total: any, finding: any) => {
            const findingQuantity = finding?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0);
            return total + findingQuantity;
        }, 0);
    }

    // Process API Data for Date-wise Aggregation
    const processData = (data: any) => {
        const taskCounts: Record<string, number> = {};
        const findingCounts: Record<string, number> = {};

        data?.usage?.tasks?.forEach((task: any) => {
            task.packages.forEach((pkg: any) => {
                const date = pkg?.date?.split("T")[0]; // Extract YYYY-MM-DD
                taskCounts[date] = (taskCounts[date] || 0) + pkg?.quantity;
            });
        });

        data?.usage?.findings?.forEach((finding: any) => {
            finding?.packages?.forEach((pkg: any) => {
                const date = pkg?.date?.split("T")[0];
                findingCounts[date] = (findingCounts[date] || 0) + pkg?.quantity;
            });
        });

        return { taskCounts, findingCounts };
    };

    // Process Data
    const { taskCounts, findingCounts } = processData(partUsageData);

    // Extract Dates & Values for the Area Chart
    const dates = Object.keys({ ...taskCounts, ...findingCounts })?.sort();
    const taskData = dates?.map((date) => taskCounts[date] || 0);
    const findingData = dates?.map((date) => findingCounts[date] || 0);

    // Calculate total counts for Donut Chart
    const totalTasks = taskData?.reduce((sum, val) => sum + val, 0);
    const totalFindings = findingData?.reduce((sum, val) => sum + val, 0);
    const totalSum = totalTasks + totalFindings;
    const donutSeries = totalSum ? [(totalTasks / totalSum) * 100, (totalFindings / totalSum) * 100] : [50, 50];


    return (
        <>
            <div style={{ paddingLeft: 150, paddingRight: 150, paddingTop: 20, paddingBottom: 20 }}>
                <Group justify="flex-end">
                    <TextInput
                        size="xs"
                        label="Enter Part ID"
                        placeholder="Type Part ID"
                        value={inputPartId}
                        onChange={(event) => setInputPartId(event.currentTarget.value)}
                        rightSection={
                            <ActionIcon
                                // size="xs"
                                onClick={handleCheck}
                                disabled={!inputPartId}
                                loading={isLoading}
                                color="green"
                            >
                                <IconCheck />
                            </ActionIcon>
                        }
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
                                    {partUsageData?.usage?.tasks?.length || 0}
                                </Text>
                            </Flex>
                        </Group>
                    </Card>
                    <Card radius='md' >
                        <Group gap='lg'>
                            <IconTool color="#14AE5C" size='39' />
                            <Flex direction='column'>
                                <Text fw={500} fz='sm' c='dimmed'>
                                    Parts Quantity
                                </Text>
                                <Text fw={600} fz='h2' >
                                    {calculateTotalTaskQuantity(partUsageData?.usage?.tasks) || 0}
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
                                    {partUsageData?.usage?.findings?.length || 0}
                                </Text>
                            </Flex>
                        </Group>
                    </Card>
                    <Card radius='md'>
                        <Group gap='lg'>
                            <IconMenuDeep color="#9F6BED" size='39' />
                            <Flex direction='column'>
                                <Text fw={500} fz='sm' c='dimmed'>
                                 Parts Quantity
                                </Text>
                                <Text fw={600} fz='h2' >
                                    {calculateTotalFindingQuantity(partUsageData?.usage?.findings) || 0}
                                </Text>
                            </Flex>
                        </Group>
                    </Card>
                </SimpleGrid>
                <Space h='sm' />
                <Grid>
                    <Grid.Col span={8}>
                        <Card radius='md' h='60vh'>
                            {/* <ReactApexChart
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
                            /> */}
                            <ReactApexChart
                                type="area"
                                height="100%"
                                options={{
                                    chart: { type: "area", height: "100%", zoom: { enabled: false } },
                                    dataLabels: { enabled: false },
                                    stroke: { curve: "smooth", width: 2 },
                                    title: { text: "Daily Trend Analysis", align: "left" },
                                    grid: { row: { colors: ["#f3f3f3", "transparent"], opacity: 0.5 } },
                                    xaxis: { type: "category", categories: dates },
                                }}
                                series={[
                                    { name: "Tasks", data: taskData },
                                    { name: "Findings", data: findingData },
                                ]}
                            />
                        </Card>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Card radius='md' h='60vh'>
                            {/* <ReactApexChart
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
                            /> */}
                            <ReactApexChart
                                type="donut"
                                height="100%"
                                options={{
                                    chart: { type: "donut" },
                                    title: { text: "Distribution Analysis", align: "left" },
                                    plotOptions: { pie: { donut: { size: "65%" } } },
                                    labels: ["Tasks", "Findings"],
                                    legend: { position: "bottom" },
                                    tooltip: {
                                        y: {
                                            formatter: (val) => `${val.toFixed(2)}%`,
                                        },
                                    },
                                }}
                                series={donutSeries}
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
                            <Accordion variant="separated" radius="md">
                                {filteredTasks?.map((task: any) => (
                                    <Accordion.Item key={task?.taskId} value={task?.taskId}>
                                        <Accordion.Control>
                                            <Group>
                                                <IconCube color="#4E66DE" />
                                                {task?.taskId || "-"}
                                            </Group>

                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <ScrollArea h={300} scrollHideDelay={0}>

                                                {task?.packages?.map((pkg: any) => (
                                                    <Card key={pkg?.packageId} p="sm" radius='md' mt="xs" bg='#ebeced'>
                                                        <Group justify="space-between" align="flex-start">
                                                            <Flex direction='column'>
                                                                <Group>
                                                                    <Text c='dimmed' fz='sm'>
                                                                        Package ID :
                                                                    </Text>
                                                                    <Text fw={500} fz='sm'>{pkg?.packageId || "-"}</Text>
                                                                </Group>
                                                                <Group>
                                                                    <Text c='dimmed' fz='sm'>
                                                                        Date :
                                                                    </Text>
                                                                    <Text fw={500} fz='sm'>{pkg?.date || "-"}</Text>
                                                                </Group>
                                                            </Flex>


                                                            <Badge color="blue">Qty: {pkg?.quantity || "-"}</Badge>
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
                            <Accordion variant="separated" radius="md">
                                {filteredFindings?.map((finding: any) => (
                                    <Accordion.Item key={finding?.taskId} value={finding?.taskId}>
                                        <Accordion.Control>
                                            <Group>
                                                <IconAlertTriangle color="#4E66DE" />
                                                {finding?.taskId || "-"}
                                            </Group>
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <ScrollArea h={300} scrollHideDelay={0}>

                                                {finding?.packages?.map((pkg: any) => (
                                                    <Card key={pkg?.packageId} p="sm" radius='md' mt="xs" bg='#ebeced'>
                                                        <Group justify="space-between">
                                                            <Text fw='500'>{pkg?.packageId || "-"}</Text>
                                                            <Badge color="red">Qty: {pkg?.quantity || "-"}</Badge>
                                                        </Group>
                                                        <Group>
                                                            <Text c='dimmed' fz='sm'>
                                                                Log Item :
                                                            </Text>
                                                            <Text fw={500} fz='sm'>{pkg?.logItem || "-"}</Text>
                                                        </Group>
                                                        <Group>
                                                            <Text c='dimmed' fz='sm'>
                                                                Description :
                                                            </Text>
                                                            <Text fw={500} fz='sm'>{pkg?.description || "-"}</Text>
                                                        </Group>
                                                        <Group>
                                                            <Text c='dimmed' fz='sm'>
                                                                Date :
                                                            </Text>
                                                            <Text fw={500} fz='sm'>{pkg?.date || "-"}</Text>
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