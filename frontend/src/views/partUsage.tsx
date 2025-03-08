import { Card, Text, Flex, Group, Select, Notification, SimpleGrid, Space, Title, Grid, TextInput, Accordion, Badge, ScrollArea, Input, Button, ActionIcon, Center, ThemeIcon, Tooltip, Divider } from "@mantine/core";
import { showNotification, useEffect, useState } from "../constants/GlobalImports";
import { DatePickerInput } from "@mantine/dates";
import { IconAlertTriangle, IconCalendar, IconCheck, IconCube, IconMenuDeep, IconReport, IconSettingsBolt, IconSettingsDown, IconSettingsSearch, IconTool } from "@tabler/icons-react";
import ReactApexChart from "react-apexcharts";
import '../App.css';
import { useApiPartUsage } from "../api/services/partUsageService";
import { showAppNotification } from "../components/showNotificationGlobally";
import dayjs, { Dayjs } from "dayjs";
import { AreaChart, BarChart, DonutChart, LineChart } from "@mantine/charts";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { Box } from '@mui/material';
import { AgGridReact } from "ag-grid-react";

// import { useApiPartUsage } from "../api/services/partUsageService";

export default function PartUsage() {
    const { getPartUsage } = useApiPartUsage(); // API function
    const [inputPartId, setInputPartId] = useState(""); // For input field
    const [validatedPartId, setValidatedPartId] = useState(""); // For API calls
    // const today = dayjs().startOf("day").toDate();
    // const twoDaysAgo = dayjs().subtract(2, "day").startOf("day").toDate();
    const twoDaysAgo = dayjs("2024-03-27").startOf("day").toDate(); // March 27, 2024
    const today = dayjs("2024-04-03").endOf("day").toDate(); // April 3, 2024
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([twoDaysAgo, today]); // Date range
    // Initialize with Dayjs objects
    // const twoDaysAgo = dayjs("2024-03-27").startOf("day"); // March 27, 2024
    // const today = dayjs("2024-04-03").endOf("day"); // April 3, 2024
    // const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([twoDaysAgo, today]); // Date range

    const [partUsageData, setPartUsageData] = useState<any>();
    const [isLoading, setIsLoading] = useState(false);
    const [taskSearch, setTaskSearch] = useState("");
    const [findingSearch, setFindingSearch] = useState("");
    const [donutData, setDonutData] = useState<any>([]);

    const [taskData, setTaskData] = useState<any>([]);
    const [findingData, setFindingData] = useState<any>([]);
    const [dates, setDates] = useState<any>([]);
    const [donutSeries, setDonutSeries] = useState<any>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!validatedPartId || !dateRange[0] || !dateRange[1]) {
                setPartUsageData(null);
                return;
            }
            setIsLoading(true);
            try {
                // Format dates to required API format
                const startDate = dayjs(dateRange[0]).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
                const endDate = dayjs(dateRange[1]).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");

                // Call API
                const response = await getPartUsage(validatedPartId, startDate, endDate);
                if (response) {
                    setPartUsageData(response);
                    processDonutData(response);
                    // processUsageData(response);
                }
            } catch (error) {
                console.error("Error fetching part usage:", error);
                setPartUsageData(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [validatedPartId, dateRange]);

    // Prepare data for Mantine AreaChart
    const chartData = partUsageData?.dateWiseQty?.map((item: any) => ({
        date: item.date,
        tasks: item.tasksqty,
        findings: item.findingsqty,
    })) || [];

    const processDonutData = (data: any) => {
        const totalTasks = data?.usage?.tasks?.reduce((acc: any, task: any) => {
            return acc + task?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0);
        }, 0);

        const totalFindings = data?.usage?.findings?.reduce((acc: any, finding: any) => {
            return acc + finding?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0);
        }, 0);

        // Prepare data for the donut chart
        const total = totalTasks + totalFindings;

        const tasksPercentage = total > 0 ? (totalTasks / total) * 100 : 0;
        const findingsPercentage = total > 0 ? (totalFindings / total) * 100 : 0;

        setDonutData([
            { name: 'Tasks', value: tasksPercentage, color: 'cyan' },
            { name: 'Findings', value: findingsPercentage, color: 'yellow' },
        ]);
    };



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

    // // Prepare Data for the tasks wise Bar Graph
    // const taskIds = filteredTasks?.map((task: any) => task.taskId);
    // const taskWisePackageLength = filteredTasks?.map((task: any) => task?.packages?.length);
    // const taskWiseTotalQuantity = filteredTasks?.map((task: any) =>
    //     task?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0)
    // );

    // // Prepare Data for the Findings wise Bar Graph
    // const findingIds = filteredFindings?.map((task: any) => task?.taskId);
    // const findingWisePackageLength = filteredFindings?.map((task: any) => task?.packages?.length);
    // const findingWiseTotalQuantity = filteredFindings?.map((task: any) =>
    //     task?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0)
    // );

    // Prepare Data for the tasks wise Bar Graph
    const taskIds = filteredTasks?.map((task: any) => task.taskId);
    const taskWisePackageLength = filteredTasks?.map((task: any) => task?.packages?.length);
    const taskWiseTotalQuantity = filteredTasks?.map((task: any) =>
        task?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0)
    );

    // Prepare Data for the Findings wise Bar Graph
    const findingIds = filteredFindings?.map((finding: any) => finding?.taskId);
    const findingWisePackageLength = filteredFindings?.map((finding: any) => finding?.packages?.length);
    const findingWiseTotalQuantity = filteredFindings?.map((finding: any) =>
        finding?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0)
    );

    // Prepare data for Mantine BarChart
    const tasksChartData = taskIds?.map((taskId: any, index: any) => ({
        taskId,
        packages: taskWisePackageLength[index] || 0,
        quantity: taskWiseTotalQuantity[index] || 0,
    })) || [];

    const findingChartData = findingIds?.map((findingId: any, index: any) => ({
        findingId,
        packages: findingWisePackageLength[index] || 0,
        quantity: findingWiseTotalQuantity[index] || 0,
    })) || [];

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

    const multParts = [
        {
            partID : '425A200-5',
            desc : 'Part Description about 425A200-5',
            totalTask : '40',
            tasksPartQty : '44',
            totalFindigs : '66',
            findigsPartQty : '66'
        },
        {
            partID : '4200200-6',
            desc : 'Description of the part for 4200200-6',
            totalTask : '20',
            tasksPartQty : '20',
            totalFindigs : '50',
            findigsPartQty : '60'
        },
        {
            partID : '4200A00-1',
            desc : 'Part Description for 4200A00-1',
            totalTask : '25',
            tasksPartQty : '40',
            totalFindigs : '44',
            findigsPartQty : '66'
        }
    ]

    const CustomHeader = ({ defaultName, tooltipName }:any) => {
        return (
          <Tooltip label={tooltipName} withArrow>
            <span style={{ cursor: 'pointer' }}>{defaultName}</span>
          </Tooltip>
        );
      };
      

    return (
        <>
            <div style={{ paddingLeft: 150, paddingRight: 150, paddingTop: 20, paddingBottom: 20 }}>
                <Group justify="flex-end" align="end">
                {/* <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ backgroundColor: 'none', padding: 0, borderRadius: 1, width: '350px' }}>
                <DemoContainer components={['DateRangePicker']}>
                    <DateRangePicker
                        value={dateRange}
                        onChange={(newValue) => setDateRange(newValue)}
                        localeText={{ start: 'Start Date', end: 'End Date' }}
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: '0.875rem', // Smaller font size
                            },
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'white', // White background for the input
                                height: '35px', // Smaller height for the input
                            },
                            '& .MuiInputBase-input': {
                                padding: '8px 12px', // Adjust padding for smaller height
                            },
                        }}
                    />
                </DemoContainer>
            </Box>
        </LocalizationProvider> */}
                    <DatePickerInput
                        size="xs"
                        w='18vw'
                        type="range"
                        label="Pick dates range"
                        placeholder="Pick dates range"
                        value={dateRange}
                        onChange={setDateRange}
                        leftSection={<IconCalendar size='20' />}
                        popoverProps={{ withinPortal: true }}
                    />
                    <TextInput
                        size="xs"
                        label="Enter Part ID"
                        placeholder="Type Part ID"
                        value={inputPartId}
                        onChange={(event) => setInputPartId(event.currentTarget.value)}
                    // rightSection={
                    //     <ActionIcon
                    //         // size="xs"
                    //         onClick={handleCheck}
                    //         disabled={!inputPartId}
                    //         loading={isLoading}
                    //         color="green"
                    //     >
                    //         <IconCheck />
                    //     </ActionIcon>
                    // }
                    />
                    <Button
                        size="xs"
                        onClick={handleCheck}
                        disabled={!inputPartId}
                        loading={isLoading}
                        color="green"
                    >
                        Submit
                    </Button>
                </Group>
                <Space h='sm' />
                <Card>
                    <Group align="center" gap='sm'>
                        <ThemeIcon variant="light">
                            <IconSettingsSearch />
                        </ThemeIcon>
                        <Title order={5} >
                            Multiple Spare Parts
                        </Title>
                    </Group>
                    <Space h='sm' />
                    <div
                        className="ag-theme-alpine"
                        style={{
                            width: "100%",
                            border: "none",
                            height: "100%",

                        }}
                    >
                        <style>
                            {`
/* Remove the borders and grid lines */
.ag-theme-alpine .ag-root-wrapper, 
.ag-theme-alpine .ag-root-wrapper-body,
.ag-theme-alpine .ag-header,
.ag-theme-alpine .ag-header-cell,
.ag-theme-alpine .ag-body-viewport {
border: none;
}

/* Remove the cell highlight (border) on cell click */
.ag-theme-alpine .ag-cell-focus {
outline: none !important; /* Remove focus border */
box-shadow: none !important; /* Remove any box shadow */
}

/* Remove row border */
.ag-theme-alpine .ag-row {
border-bottom: none;
}
`}
                        </style>

                        <AgGridReact
                            pagination
                            paginationPageSize={5}
                            domLayout="autoHeight" // Ensures height adjusts dynamically
                            rowData={multParts || []}
                            columnDefs={[
                                
                                {
                                    field: "partID",
                                    headerName: "Part ID",
                                    // headerComponent: (params : any) => <CustomHeader defaultName="Part ID" tooltipName="Part ID" />,
                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    flex:1,
                                },
                                {
                                    field: "desc",
                                    headerName: "Description",
                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    // width:600
                                    flex: 4
                                },
                                {
                                    field: "totalTask",
                                    headerName: "Tasks",
                                    headerComponent: (params :any) => <CustomHeader defaultName="Tasks" tooltipName="Total Tasks" />,

                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    // width:600
                                    flex: 1
                                },
                                {
                                    field: "tasksPartQty",
                                    headerName: "Parts Qty",
                                    headerComponent: (params :any) => <CustomHeader defaultName="Parts Qty" tooltipName="Tasks Parts Qty" />,
                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    // width:600
                                    flex: 1
                                },
                                {
                                    field: "totalFindigs",
                                    headerName: "Findings",
                                    headerComponent: (params :any) => <CustomHeader defaultName="Findings" tooltipName="Total Findings" />,
                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    // width:600
                                    flex: 1
                                },
                                {
                                    field: "findigsPartQty",
                                    headerName: "Parts Qty",
                                    headerComponent: (params :any) => <CustomHeader defaultName="Parts Qty" tooltipName="Findings Parts Qty" />,
                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    // width:600
                                    flex: 1
                                },
                                {
                                    // field: "actions",
                                    headerName: "Actions",
                                    // sortable: true,
                                    // filter: true,
                                    // floatingFilter: true,
                                    flex: 1,
                                    resizable: true,
                                    // editable: true,
                                    cellRenderer: (val: any) => {
                                        return (
                                            <Group mt='xs' align="center" justify="center">
                                                
                                                <Tooltip label="Get Part Data">
                                                    <ActionIcon
                                                        size={20}
                                                        color="teal"
                                                        variant="light"
                                                        // disabled={val?.data?.status?.toLowerCase() !== "completed"}
                                                        onClick={() => {
                                                            // setSelectedEstimateIdReport(val.data.estID);
                                                            // handleValidateSkillsTasks(val.data.tasks);
                                                            // setOpened(true);
                                                        }}
                                                    >
                                                        <IconSettingsDown />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>

                                        );
                                    },
                                },
                            ]}
                        />
                    </div>

                </Card>
                {/* <Space h='sm' /> */}
                <Divider
                    variant="dashed"
                    labelPosition="center"
                    color={"gray"}
                    pb='sm'
                    pt='sm'
                    label={
                        <>
                            <Box >Part Usage</Box>
                        </>
                    }
                />
                <Grid>
                    <Grid.Col span={4}>
                        <Card>
                            <Group>
                                <Text fw='500' c='dimmed'>
                                    Selected Part -
                                </Text>
                                <Text fw='600'>
                                    {partUsageData?.partId || validatedPartId}
                                </Text>
                            </Group>

                        </Card>
                    </Grid.Col>
                    <Grid.Col span={8}>
                        <Card>
                            <Group>
                                <Text fw='500' c='dimmed'>
                                    Description -
                                </Text>
                                <Text fw='600'>
                                    {partUsageData?.partDescription || "-"}
                                </Text>
                            </Group>
                        </Card>
                    </Grid.Col>
                </Grid>

                <Space h='sm' />
                <SimpleGrid cols={4}>
                    <Card radius='md'>
                        <Group gap='lg'>
                            <IconCube color="#4E66DE" size='39' />
                            <Flex direction='column'>
                                <Text fw={500} fz='sm' c='dimmed'>
                                    Source Tasks
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
                        <Card radius='md' h='50vh'>
                            {/* <ReactApexChart
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
                    /> */}
                            <Title order={5} c='dimmed'>
                                Daily Trend Analysis
                            </Title>
                            <AreaChart
                                h={250}
                                data={chartData}
                                withLegend
                                dataKey="date"
                                xAxisLabel="Date"
                                yAxisLabel="Count"
                                series={[
                                    { name: 'tasks', color: 'rgba(17, 166, 0, 1)' },
                                    { name: 'findings', color: 'rgba(0, 149, 255, 1)' },
                                ]}
                                connectNulls
                                curveType="natural"
                            />

                        </Card>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Card radius='md' h='50vh'>

                            {/* <ReactApexChart
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
                    /> */}
                            <Title order={5} c='dimmed'>
                                Distribution Analysis (%)
                            </Title>
                            <Center>
                                <DonutChart
                                    withLabelsLine
                                    withLabels
                                    withTooltip
                                    labelsType="percent"
                                    size={182}
                                    thickness={30}
                                    data={donutData}
                                />
                            </Center>

                        </Card>
                    </Grid.Col>
                </Grid>
                <Space h='md' />
                <Grid>
                    <Grid.Col span={7}>
                        <Card radius='md' h='60vh'>
                            {/* <ReactApexChart
                                type="bar"
                                height='100%'
                                options={{
                                    chart: {
                                        type: 'bar',
                                        height: 350
                                    },
                                    title: { text: "Aircraft wise Qty", align: "left" },
                                    plotOptions: {
                                        bar: {
                                            horizontal: false,
                                            columnWidth: '20%',
                                            borderRadius: 5,
                                            borderRadiusApplication: 'end'
                                        },
                                    },
                                    dataLabels: {
                                        enabled: false
                                    },
                                    stroke: {
                                        show: true,
                                        width: 2,
                                        colors: ['transparent']
                                    },
                                    xaxis: {
                                        categories: partUsageData?.aircraftDetails?.aircraftModels?.map((ele : any)=> ele?.aircraftModel || "unknown")
                                        // ['AIRBUS', 'ATR', 'BOEING MAX', 'BOEING NG'],
                                    },
                                    yaxis: {
                                        title: {
                                            text: 'Part Quantity'
                                        }
                                    },
                                    fill: {
                                        opacity: 1
                                    },
                                    tooltip: {
                                        y: {
                                            // formatter: function (val) {
                                            //   return "$ " + val + " thousands"
                                            // }
                                        }
                                    }
                                }}
                                series={[{
                                    name: 'Air Craft',
                                    data:  partUsageData?.aircraftDetails?.aircraftModels?.map((ele : any)=> ele?.count || 0)
                                }]}
                            /> */}
                            <Title order={5} c='dimmed'>
                                Aircraft wise Quantity
                            </Title>
                            <BarChart
                                h={300}
                                withLegend
                                data={partUsageData?.aircraftDetails?.aircraftModels || []}
                                dataKey="aircraftModel"
                                series={[
                                    { name: 'count', color: 'rgba(0, 49, 196, 1)' },
                                ]}
                                tickLine="y"
                                barProps={{ radius: 10 }}
                                maxBarWidth={40} // Adjust the gap between categories
                            // barGap={5} // Adjust the gap between bars
                            />
                        </Card>
                    </Grid.Col>
                    <Grid.Col span={5}>
                        <Card radius='md' h='60vh'>
                            {/* <ReactApexChart
                                type="bar"
                                height='100%'
                                options={{
                                    chart: {
                                        type: 'bar',
                                        height: 350
                                    },
                                    title: { text: "Part Distribution", align: "left" },
                                    plotOptions: {
                                        bar: {
                                            horizontal: false,
                                            columnWidth: '30%',
                                            borderRadius: 5,
                                            borderRadiusApplication: 'end'
                                        },
                                    },
                                    dataLabels: {
                                        enabled: false
                                    },
                                    stroke: {
                                        show: true,
                                        width: 2,
                                    },
                                    xaxis: {
                                        categories: partUsageData?.aircraftDetails?.stockStatusCodes?.map((ele: any) => ele?.stockStatus || "unknown")
                                        // ['MRO', 'Customer',],
                                    },
                                    yaxis: {
                                        title: {
                                            text: 'Part Quantity'
                                        }
                                    },
                                    fill: {
                                        opacity: 1
                                    },
                                    tooltip: {
                                        y: {
                                            // formatter: function (val) {
                                            //   return "$ " + val + " thousands"
                                            // }
                                        }
                                    },
                                    colors: ['#FF5733', '#33FF57']
                                }}
                                series={[{
                                    name: 'Quantity',
                                    data: partUsageData?.aircraftDetails?.stockStatusCodes?.map((ele: any) => ele?.count || 0)
                                }]}
                            /> */}
                            <Title order={5} c='dimmed'>
                                Part Supplied
                            </Title>
                            <BarChart
                                h={300}
                                withLegend
                                data={partUsageData?.aircraftDetails?.stockStatusCodes || []}
                                dataKey="stockStatus"
                                series={[
                                    { name: 'count', color: 'rgba(196, 147, 0, 1)' },
                                ]}
                                tickLine="y"

                                barProps={{ radius: 10 }}
                                maxBarWidth={40} // Adjust the gap between categories
                            // barGap={5} // Adjust the gap between bars
                            />
                        </Card>
                    </Grid.Col>
                </Grid>
                <Space h='md' />
                <SimpleGrid cols={2}>
                    <Card>
                        <Title order={5} c='dimmed'>
                            MPD - Packages & Qty
                        </Title>
                        <Card
                            style={{
                                width: "100%",
                                height: "350px", // Increase the Card height
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
                                {/* <ReactApexChart
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
                            /> */}
                                <BarChart
                                    h={300}
                                    data={tasksChartData}
                                    dataKey="taskId"
                                    series={[
                                        { name: 'packages', color: '#1445B6' },
                                        { name: 'quantity', color: '#D6B575' },
                                    ]}
                                    xAxisLabel="Tasks"
                                    yAxisLabel="Count"
                                    tickLine="y"
                                    barProps={{ radius: 10 }}

                                />
                            </div>
                        </Card>
                    </Card>
                    <Card>
                        <Title order={5} c='dimmed'>
                            Findings - Packages & Qty
                        </Title>
                        <Card
                            style={{
                                width: "100%",
                                height: "350px", // Increase the Card height
                                overflowX: "auto", // Enable horizontal scrolling
                                overflowY: "hidden", // Prevent vertical scrolling
                                scrollbarWidth: 'thin',

                            }}
                        >

                            <div
                                style={{
                                    width: Math.max(findingIds?.length * 80, 400), // Set minimum width to 400px or adjust as needed
                                }}
                                className="scrollable-container"
                            >
                                {/* <ReactApexChart
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
                            /> */}
                                <BarChart
                                    h={300}
                                    data={findingChartData}
                                    dataKey="findingId"
                                    series={[
                                        { name: 'packages', color: '#1445B6' },
                                        { name: 'quantity', color: '#D6B575' },
                                    ]}
                                    maxBarWidth={40}
                                    xAxisLabel="Findings"
                                    yAxisLabel="Count"
                                    tickLine="y"
                                    barProps={{ radius: 10 }}
                                // barCategoryGap={10} // Adjust the gap between categories
                                // barGap={5} // Adjust the gap between bars
                                />
                            </div>
                        </Card>
                    </Card>

                </SimpleGrid>
                <Space h='md' />
                <SimpleGrid cols={2}>
                    <Card radius='md' h={partUsageData?.usage! ? '90vh' : '40vh'} style={{ overflowY: "auto" }}>
                        <Title order={5}>
                            MPD
                        </Title>

                        <TextInput
                            placeholder="Search Tasks..."
                            value={taskSearch}
                            onChange={(e) => setTaskSearch(e.currentTarget.value)}
                            mb="md"
                        />
                        {
                            filteredTasks?.length > 0 ? (
                                <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
                                    <Accordion variant="separated" radius="md">
                                        {filteredTasks?.map((task: any, index: number) => (
                                            <Accordion.Item key={`${task?.taskId} - ${index}`} value={`${task?.taskId} - ${index}`}>
                                                <Accordion.Control>
                                                    <Group>
                                                        <IconCube color="#4E66DE" />
                                                        {task?.taskId || "-"}
                                                    </Group>

                                                </Accordion.Control>
                                                <Accordion.Panel>
                                                    <ScrollArea h={task?.packages?.length > 3 ? 250 : 150} scrollHideDelay={0}>


                                                        <Text fz='xs'>
                                                            <Text span c="gray" inherit>Description : </Text>
                                                            {task?.taskDescription || "-"}
                                                        </Text>


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
                            ) : (
                                <>
                                    <Center p={50}>
                                        <Text >
                                            No Tasks Found
                                        </Text>
                                    </Center>

                                </>
                            )
                        }

                    </Card>
                    <Card radius='md' h={partUsageData?.usage! ? '90vh' : '40vh'} style={{ overflowY: "auto" }}>
                        <Title order={5}>
                            Findings
                        </Title>

                        <TextInput
                            placeholder="Search Findings..."
                            value={findingSearch}
                            onChange={(e) => setFindingSearch(e.currentTarget.value)}
                            mb="md"
                        />
                        {
                            filteredFindings?.length > 0 ? (
                                <ScrollArea h={'85vh'} scrollbarSize={0} scrollHideDelay={0}>
                                    <Accordion variant="separated" radius="md">
                                        {filteredFindings?.map((finding: any, index: number) => (
                                            <Accordion.Item key={`${finding?.taskId} - ${index}`} value={`${finding?.taskId} - ${index}`}>
                                                <Accordion.Control>
                                                    <Group>
                                                        <IconAlertTriangle color="#4E66DE" />
                                                        {finding?.taskId || "-"}
                                                    </Group>
                                                </Accordion.Control>
                                                <Accordion.Panel>
                                                    <ScrollArea h={300} scrollHideDelay={0}>
                                                        <Text fz='xs'>
                                                            <Text span c="gray" inherit>Description : </Text>
                                                            {finding?.taskDescription || "-"}
                                                        </Text>
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
                            ) : (
                                <>
                                    <Center p={50}>
                                        <Text >
                                            No Findings Found
                                        </Text>
                                    </Center>

                                </>
                            )
                        }

                    </Card>
                </SimpleGrid>
            </div>
        </>
    )
}

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