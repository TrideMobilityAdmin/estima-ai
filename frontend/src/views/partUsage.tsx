import { Card, Text, Flex, Group, SimpleGrid, Space, Title, Grid, TextInput, Button, ActionIcon, Center, ThemeIcon, Tooltip, Divider } from "@mantine/core";
import { useEffect, useState } from "../constants/GlobalImports";
import { DatePickerInput } from "@mantine/dates";
import { IconAlertTriangle, IconCalendar, IconCube, IconMenuDeep, IconSettingsDown, IconSettingsSearch, IconTool } from "@tabler/icons-react";
import '../App.css';
import { useApiPartUsage } from "../api/services/partUsageService";
import dayjs from "dayjs";
import { AreaChart } from "@mantine/charts";
import { Box } from '@mui/material';
import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";
import AircraftPieCharts from "../components/partUsAircraftModelwiseGrpahs";
import DonutChartComponent from "../components/partUsDonutChart";
import DonutChartComponentPartSupplied from "../components/partUsPartSuppliedChart";
import PackageWiseQuantityChart from "../components/packageWiseQuantityChart";
import TaskAccordion from "../components/taskAccordion";
// import { useApiPartUsage } from "../api/services/partUsageService";

export default function PartUsage() {
    const { getPartUsage, getMultiPartUsage } = useApiPartUsage();
    const [inputPartIds, setInputPartIds] = useState<string[]>([]);
    const [validatedPartIds, setValidatedPartIds] = useState<string[]>([]);

    const handleInputChange = (event: any) => {
        const value = event.currentTarget.value;
        setInputPartId(value);

        // Split the input by commas and trim whitespace, then filter out empty strings
        const idsArray = value.split(',')
            .map((id: any) => id.trim())
            .filter((id: any) => id !== '');

        setInputPartIds(idsArray);
    };
    console.log("part ids >>>>", inputPartIds);

    // Handle check button click
    // const handleCheck = () => {
    //     setValidatedPartId(inputPartId);
    // };
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleCheck = () => {
        setValidatedPartIds(inputPartIds); // Only set part IDs
        setRefreshTrigger(prev => prev + 1); // Force useEffect to run again
    };
    
    const [inputPartId, setInputPartId] = useState(""); // For input field
    const [selectedPartId, setSelectedPartId] = useState("");
    const [loadingPartId, setLoadingPartId] = useState<string | null>(null);
    // const today = dayjs().startOf("day").toDate();
    // const twoDaysAgo = dayjs().subtract(2, "day").startOf("day").toDate();

    const today = dayjs().endOf("day").toDate(); // Today
    const tenDaysAgo = dayjs().subtract(9, "day").startOf("day").toDate(); // 10 days including today
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([tenDaysAgo, today]);

    // const twoDaysAgo = dayjs("2023-01-21").startOf("day").toDate(); // March 27, 2024
    // const today = dayjs("2023-09-03").endOf("day").toDate(); // April 3, 2024
    // const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([twoDaysAgo, today]); // Date range
    
    const [multiPartUsageData, setMultiPartUsageData] = useState<any>();
    const [multiPartMergedData, setMultiPartMergedData] = useState<any>();
    const [isMultioading, setIsMultiLoading] = useState(false);
    const [partUsageData, setPartUsageData] = useState<any>();
    const [taskSearch, setTaskSearch] = useState("");
    const [findingSearch, setFindingSearch] = useState("");



    useEffect(() => {
        const fetchMultiPartData = async () => {
            // Skip API call if this is the initial render (refreshTrigger is 0)
            // or if any required data is missing
            if (
                refreshTrigger === 0 || // Skip the initial render
                !validatedPartIds || 
                validatedPartIds.length === 0 || 
                !dateRange[0] || 
                !dateRange[1]
            ) {
                setIsMultiLoading(false);
                setMultiPartUsageData(null);
                setMultiPartMergedData([]);
                return;
            }
    
            try {
                setIsMultiLoading(true); // Move loading here!
                setMultiPartMergedData([]);
    
                const startDate = dayjs(dateRange[0]).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
                const endDate = dayjs(dateRange[1]).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
    
                const response: any = await getMultiPartUsage(validatedPartIds, startDate, endDate);
    
                if (response) {
                    setMultiPartUsageData(response);
    
                    const taskParts = response?.taskParts || [];
                    const findingsHMVParts = response?.findingsHMVParts || [];
                    const findingsNonHMVTasks = response?.findingsNonHMVTasks || [];
    
                    const mergedData = taskParts.map((task: any) => ({
                        ...task,
                        findingsHMVParts: findingsHMVParts.filter((finding: any) => finding?.partId === task?.partId),
                        findingsNonHMVTasks: findingsNonHMVTasks.filter((finding: any) => finding?.partId === task?.partId),
                    }));
    
                    setMultiPartMergedData(mergedData);
                }
            } catch (error) {
                console.error("Error fetching part usage:", error);
                setMultiPartUsageData(null);
                setMultiPartMergedData([]);
            } finally {
                setIsMultiLoading(false); // ✅ Finish loading after fetch
            }
        };
    
        fetchMultiPartData();
    
        return () => {
            setMultiPartUsageData(null);
            setMultiPartMergedData([]);
        };
    }, [validatedPartIds, dateRange, refreshTrigger]);
    
    console.log("Multi Validated Parts >>>>", validatedPartIds);
    console.log("Multi part data >>>>", multiPartUsageData);
    console.log("Multi part merged data >>>>", multiPartMergedData);

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedPartId || !dateRange[0] || !dateRange[1]) {
                setPartUsageData(null);
                setLoadingPartId(null);
                return;
            }
            
            setLoadingPartId(selectedPartId);
            
            try {
                // Format dates to required API format
                const startDate = dayjs(dateRange[0]).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
                const endDate = dayjs(dateRange[1]).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");

                // Call API
                const response = await getPartUsage(selectedPartId, startDate, endDate);

                if (response) {
                    setPartUsageData(response);
                }
            } catch (error) {
                console.error("Error fetching part usage:", error);
                setPartUsageData(null);
            } finally {
                setLoadingPartId(null);
            }
        };

        fetchData();
    }, [selectedPartId, dateRange]);
    console.log("partt usage data by single >>>>", partUsageData);


    // Prepare data for Daily trend analysis
    const chartData = partUsageData?.dateWiseQty?.map((item: any) => ({
        date: item.date,
        tasks: item.tasksqty,
        findings: item.findingsqty,
    }))?.sort((a: any, b: any) => {
        // Create proper Date objects from the date strings
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        // Compare the dates
        return dateA.getTime() - dateB.getTime();
    }) || [];
    


    // Combine tasks and nonHmvTasks arrays
    const combinedTasks = useMemo(() => {
        if (!partUsageData?.usage) return [];

        const tasks = partUsageData.usage.tasks || [];
        const nonHmvTasks = partUsageData.usage.findings?.nonHmvTasks || [];

        // Add a property to identify the source of each task
        const tasksWithSource = tasks.map((task: any) => ({
            ...task,
            source: 'tasks'
        }));

        const nonHmvTasksWithSource = nonHmvTasks.map((task: any) => ({
            ...task,
            source: 'nonHmvTasks'
        }));

        // Combine both arrays
        return [...tasksWithSource, ...nonHmvTasksWithSource];
    }, [partUsageData?.usage]);

    // Filtered tasks are now handled inside TaskAccordion component



    // Old chart data preparation removed - now using package-wise data

    // Transform MPD data to package-wise format (combining tasks and nonHmvTasks)
    const mpdPackageWiseData = useMemo(() => {
        if (!combinedTasks || combinedTasks.length === 0) {
            return [];
        }

        const packageMap = new Map<string, number>();

        // Process all tasks (both regular tasks and nonHmvTasks)
        combinedTasks.forEach((task: any) => {
            if (task?.packages && Array.isArray(task.packages)) {
                task.packages.forEach((pkg: any) => {
                    if (pkg?.packageId && pkg?.quantity) {
                        const existingQuantity = packageMap.get(pkg.packageId) || 0;
                        packageMap.set(pkg.packageId, existingQuantity + pkg.quantity);
                    }
                });
            }
        });

        // Convert map to array and sort by quantity (descending)
        const result = Array.from(packageMap.entries())
            .map(([packageId, quantity]) => ({
                packageId,
                quantity: Math.round(quantity)
            }))
            .sort((a, b) => b.quantity - a.quantity);
        
        return result;
    }, [combinedTasks]);

    // Transform Findings data to package-wise format (HMV tasks only)
    const findingsPackageWiseData = useMemo(() => {
        if (!partUsageData?.usage?.findings?.hmvTasks) return [];

        const packageMap = new Map<string, number>();

        // Process HMV findings tasks
        partUsageData.usage.findings.hmvTasks.forEach((finding: any) => {
            if (finding?.packages && Array.isArray(finding.packages)) {
                finding.packages.forEach((pkg: any) => {
                    if (pkg?.packageId && pkg?.quantity) {
                        const existingQuantity = packageMap.get(pkg.packageId) || 0;
                        packageMap.set(pkg.packageId, existingQuantity + pkg.quantity);
                    }
                });
            }
        });

        // Convert map to array and sort by quantity (descending)
        const result = Array.from(packageMap.entries())
            .map(([packageId, quantity]) => ({
                packageId,
                quantity: Math.round(quantity)
            }))
            .sort((a, b) => b.quantity - a.quantity);
            
        return result;
    }, [partUsageData?.usage?.findings?.hmvTasks]);

    // Function to calculate total quantity for tasks
    function calculateTotalTaskQuantity(tasks: any) {
        return tasks?.reduce((total: any, task: any) => {
            const taskQuantity = task?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0);
            return Math.round(total + taskQuantity);
        }, 0);
    }

    // Function to calculate total quantity for findings
    function calculateTotalFindingQuantity(findings: any) {
        return findings?.reduce((total: any, finding: any) => {
            const findingQuantity = finding?.packages?.reduce((sum: any, pkg: any) => sum + pkg?.quantity, 0);
            return Math.round(total + findingQuantity);
        }, 0);
    }

    const CustomHeader = ({ defaultName, tooltipName }: any) => {
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
                        w='21vw'
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
                        label="Enter Part ID's"
                        placeholder="Ex: CN20, CFC, ABC123..."
                        value={inputPartId}
                        // onChange={(event) => setInputPartId(event.currentTarget.value)}
                        onChange={handleInputChange}
                    />
                    <Button
                        size="xs"
                        onClick={handleCheck}
                        disabled={!inputPartId}
                        loading={isMultioading}
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
                            Spare Parts
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
                            rowData={multiPartMergedData || []}
                            columnDefs={[
                                {
                                    field: "partId",
                                    headerName: "Part ID",
                                    // headerComponent: (params : any) => <CustomHeader defaultName="Part ID" tooltipName="Part ID" />,
                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    flex: 1,
                                },
                                {
                                    field: "partDescription",
                                    headerName: "Description",
                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    // width:600
                                    flex: 4
                                },
                                {
                                    field: "totalTasks",
                                    headerName: "Tasks",
                                    headerComponent: () => <CustomHeader defaultName="Tasks" tooltipName="Total Tasks" />,
                                    sortable: true,
                                    // filter: true,
                                    // floatingFilter: true,
                                    resizable: true,
                                    flex: 1,
                                    cellRenderer: (val: any) => {
                                        // Calculate the sum of totalTasks from the main data and findingsNonHMVTasks
                                        const mainTasks = val.data.totalTasks || 0;
                                        const nonHMVTasks = val.data.findingsNonHMVTasks?.reduce(
                                            (sum: number, f: any) => sum + (f?.totalTasks || 0),
                                            0
                                        ) || 0;

                                        // Return the combined total
                                        return <Text>{mainTasks + nonHMVTasks}</Text>;
                                    }
                                },
                                {
                                    field: "totalTasksQty",
                                    headerName: "Parts Qty",
                                    headerComponent: () => <CustomHeader defaultName="Parts Qty" tooltipName="Tasks Parts Qty" />,
                                    sortable: true,
                                    // filter: true,
                                    // floatingFilter: true,
                                    resizable: true,
                                    flex: 1,
                                    cellRenderer: (val: any) => {
                                        // Calculate the sum of totalTasksQty from the main data and findingsNonHMVTasks
                                        const mainQty = val.data.totalTasksQty || 0;
                                        const nonHMVQty = val.data.findingsNonHMVTasks?.reduce(
                                            (sum: number, f: any) => sum + (f?.totalTasksQty || 0),
                                            0
                                        ) || 0;

                                        // Return the combined total
                                        return <Text>{Math.round(mainQty + nonHMVQty)}</Text>;
                                    }
                                },
                                {
                                    field: "findingsHMVParts",
                                    headerName: "Findings",
                                    headerComponent: () => <CustomHeader defaultName="Findings" tooltipName="Total Findings" />,
                                    sortable: true,
                                    // filter: true,
                                    // floatingFilter: true,
                                    resizable: true,
                                    flex: 1,
                                    cellRenderer: (val: any) => {
                                        return (
                                            <Text>
                                                {val.data.findingsHMVParts?.reduce((sum: number, f: any) => sum + (f?.totalFindings || 0), 0)}
                                            </Text>
                                        )
                                    }
                                },
                                {
                                    field: "findingsHMVParts",
                                    headerName: "Parts Qty",
                                    headerComponent: () => <CustomHeader defaultName="Parts Qty" tooltipName="Findings Parts Qty" />,
                                    sortable: true,
                                    // filter: true,
                                    // floatingFilter: true,
                                    resizable: true,
                                    flex: 1,
                                    cellRenderer: (val: any) => {
                                        return (
                                            <Text>
                                                {Math.round(val.data.findingsHMVParts?.reduce((sum: number, f: any) => sum + (f?.totalFindingsQty || 0), 0))}
                                            </Text>
                                        )
                                    }
                                },
                                {
                                    // field: "actions",
                                    headerName: "Actions",
                                    flex: 1,
                                    resizable: true,
                                    cellRenderer: (val: any) => {
                                        const isCurrentPartLoading = loadingPartId === val.data.partId;
                                        
                                        return (
                                            <Group mt='xs' align="center" justify="center">
                                                <Tooltip label="Get Part Data">
                                                    <ActionIcon
                                                        size={20}
                                                        color="teal"
                                                        variant="light"
                                                        loading={isCurrentPartLoading}
                                                        disabled={loadingPartId !== null && !isCurrentPartLoading}
                                                        onClick={() => {
                                                            if (!isCurrentPartLoading) {
                                                                setSelectedPartId(val.data.partId);
                                                            }
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
                
                {/* Conditionally render Part Usage section only when data is available */}
                {(partUsageData) && (
                    <>
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
                                    {partUsageData?.partId || selectedPartId}
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
                                    {combinedTasks?.length || 0}
                                </Text>
                            </Flex>
                        </Group>
                    </Card>
                    <Card radius='md' >
                        <Group gap='lg'>
                            <IconTool color="#14AE5C" size='39' />
                            <Flex direction='column'>
                                <Text fw={500} fz='sm' c='dimmed'>
                                    Tasks - Parts Quantity
                                </Text>
                                <Text fw={600} fz='h2' >
                                    {calculateTotalTaskQuantity(combinedTasks) || 0}
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
                                    {partUsageData?.usage?.findings?.hmvTasks?.length || 0}
                                </Text>
                            </Flex>
                        </Group>
                    </Card>
                    <Card radius='md'>
                        <Group gap='lg'>
                            <IconMenuDeep color="#9F6BED" size='39' />
                            <Flex direction='column'>
                                <Text fw={500} fz='sm' c='dimmed'>
                                    Findings - Parts Quantity
                                </Text>
                                <Text fw={600} fz='h2' >
                                    {calculateTotalFindingQuantity(partUsageData?.usage?.findings?.hmvTasks) || 0}
                                </Text>
                            </Flex>
                        </Group>
                    </Card>
                </SimpleGrid>
                <Space h='sm' />
                <Grid>
                    <Grid.Col span={8}>
                        <Card radius="md" h="60vh">
                            <Title order={5} c="dimmed">Date Trend Analysis</Title>

                            {chartData?.length > 0 ? (
                                <div style={{ overflowX: "auto", width: "100%", height: '50vh' }}>
                                    <div style={{ width: `${chartData.length * 80}px`, minWidth: "600px" }}>
                                        <AreaChart
                                            h={260}
                                            data={chartData}
                                            withLegend
                                            dataKey="date"
                                            xAxisLabel="Date"
                                            yAxisLabel="Count"
                                            xAxisProps={{
                                                interval: 0, // Ensures all labels are displayed
                                                angle: -45, // Rotates labels for better visibility
                                                textAnchor: "end",
                                            }}
                                            series={[
                                                { name: "tasks", color: "rgba(17, 166, 0, 1)", label: "Tasks" },
                                                { name: "findings", color: "rgba(0, 149, 255, 1)", label: "Findings" },
                                            ]}
                                            connectNulls
                                            curveType="natural"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <Center>
                                    <Text c="dimmed" pt={150}>No Data Found</Text>
                                </Center>
                            )}
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={4}>
                        <Card radius='md' h='60vh'>
                            <Title order={5} c='dimmed'>
                                Distribution Analysis (%)
                            </Title>
                            <DonutChartComponent partUsageData={partUsageData} /> 
                        </Card>
                    </Grid.Col>
                </Grid>
                <Space h='md' />
                <AircraftPieCharts partUsageData={partUsageData} />

                <Space h='md' />
                <Grid>
                    <Grid.Col span={6}>
                        <DonutChartComponentPartSupplied title="MPD - Part Supplied" partUsageData={partUsageData} type="MPD" />
                    </Grid.Col>
                    <Grid.Col span={6}>
                        <DonutChartComponentPartSupplied title="Findings - Part Supplied" partUsageData={partUsageData} type="Findings" />
                    </Grid.Col>
                </Grid>
                <Space h='md' />
                <SimpleGrid cols={2}>
                    <PackageWiseQuantityChart 
                        title="MPD - Package-wise Quantities" 
                        data={mpdPackageWiseData} 
                    />
                    <PackageWiseQuantityChart 
                        title="Findings - Package-wise Quantities" 
                        data={findingsPackageWiseData} 
                    />
                </SimpleGrid>
                <Space h='md' />
                <SimpleGrid cols={2}>
                    <TaskAccordion
                        title="MPD"
                        data={combinedTasks || []}
                        searchValue={taskSearch}
                        onSearchChange={setTaskSearch}
                        icon="task"
                    />
                    
                    <TaskAccordion
                        title="Findings"
                        data={partUsageData?.usage?.findings?.hmvTasks || []}
                        searchValue={findingSearch}
                        onSearchChange={setFindingSearch}
                        icon="finding"
                    />
                </SimpleGrid>
                    </>
                )}
            </div>
        </>
    )
}
// const data = {
//     "taskParts": [
//         {
//             "totalTasksQty": 1,
//             "partId": "425A200-5",
//             "partDescription": "DEMISTER",
//             "totalTasks": 1
//         },
//         {
//             "totalTasksQty": 225,
//             "partId": "CN20",
//             "partDescription": "CLEANING SOLVENT",
//             "totalTasks": 36
//         }
//     ],
//     "findingsHMVParts": [
//         {
//             "totalFindingsQty": 11,
//             "partId": "CN20",
//             "partDescription": "CLEANINGSOLVENT",
//             "totalFindings": 3
//         }
//     ],
//     "findingsNonHMVTasks": []
// };
// const data2 = [
//     {
//         "totalTasksQty": 1,
//         "partId": "425A200-5",
//         "partDescription": "DEMISTER",
//         "totalTasks": 1,
//         "findingsHMVParts": [
//             {
//                 "totalFindingsQty": 11,
//                 "partId": "425A200-5",
//                 "partDescription": "CLEANINGSOLVENT",
//                 "totalFindings": 3
//             },
//         ],
//         "findingsNonHMVTasks": []
//     },
//     {
//         "totalTasksQty": 225,
//         "partId": "CN20",
//         "partDescription": "CLEANING SOLVENT",
//         "totalTasks": 36,
//         "findingsHMVParts": [
//             {
//                 "totalFindingsQty": 5,
//                 "partId": "CN20",
//                 "partDescription": "CLEANINGSOLVENT",
//                 "totalFindings": 1
//             }
//         ],
//         "findingsNonHMVTasks": []
//     }
// ]
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
                            {/* <Grid>
                    <Grid.Col span={6}>
                        <Card radius='md' h='60vh'>
                            <Title order={5} c='dimmed'>
                                MPD - Aircraft wise Quantity
                            </Title>
                            <BarChart
                                h={300}
                                withLegend
                                data={partUsageData?.aircraftDetails?.task_parts_aircraft_details?.aircraftModels || []}
                                dataKey="aircraftModel"
                                series={[
                                    { name: 'count', color: 'rgba(0, 49, 196, 1)' },
                                ]}
                                xAxisProps={{
                                    interval: 0, // Ensures all labels are displayed
                                    angle: -45, // Rotates labels for better visibility
                                    textAnchor: 'end',
                                  }}
                                tickLine="y"
                                barProps={{ radius: 10 }}
                                maxBarWidth={40} // Adjust the gap between categories
                            // barGap={5} // Adjust the gap between bars
                            />
                        </Card>
                    </Grid.Col>
                    <Grid.Col span={6}>
                        <Card radius='md' h='60vh'>
                            <Title order={5} c='dimmed'>
                                Findings - Aircraft wise Quantity
                            </Title>
                            <BarChart
                                h={300}
                                withLegend
                                data={partUsageData?.aircraftDetails?.sub_task_parts_aircraft_details?.aircraftModels || []}
                                dataKey="aircraftModel"
                                series={[
                                    { name: 'count', color: 'rgba(0, 49, 196, 1)' },
                                ]}
                                xAxisProps={{
                                    interval: 0, // Ensures all labels are displayed
                                    angle: -45, // Rotates labels for better visibility
                                    textAnchor: 'end',
                                  }}
                                tickLine="y"
                                barProps={{ radius: 10 }}
                                maxBarWidth={40} // Adjust the gap between categories
                            // barGap={5} // Adjust the gap between bars
                            />
                        </Card>
                    </Grid.Col>
                    
                </Grid> */}
                {/* <Center>
                                <DonutChart
                                    withLabelsLine
                                    withLabels
                                    withTooltip
                                    labelsType="percent"
                                    size={182}
                                    thickness={30}
                                    data={donutData}
                                />
                            </Center> */}
                            {/* <Grid>
                    <Grid.Col span={6}>
                        <Card radius='md' h='60vh'>
                            <Title order={5} c='dimmed'>
                                MPD - Part Supplied
                            </Title>
                            <BarChart
                                h={300}
                                withLegend
                                data={partUsageData?.aircraftDetails?.task_parts_aircraft_details?.stockStatuses?.map((status: any) => ({
                                    ...status,
                                    color: getAirlineColor(status.statusCode)
                                })) || []}
                                dataKey="statusCode"
                                series={[
                                    {
                                        name: 'count',
                                        color: 'blue'
                                    },
                                ]}
                                tickLine="y"
                                xAxisProps={{
                                    interval: 0, // Ensures all labels are displayed
                                    angle: -45, // Rotates labels for better visibility
                                    textAnchor: 'end',
                                }}
                                barProps={{ radius: 10 }}
                                maxBarWidth={40}
                            />
                        </Card>
                    </Grid.Col>
                    <Grid.Col span={6}>
                        <Card radius='md' h='60vh'>
                            <Title order={5} c='dimmed'>
                                Findings - Part Supplied
                            </Title>
                            <BarChart
                                h={300}
                                withLegend
                                data={partUsageData?.aircraftDetails?.sub_task_parts_aircraft_details?.stockStatuses?.map((status: any) => ({
                                    ...status,
                                    color: getAirlineColor(status.statusCode)
                                })) || []}
                                dataKey="statusCode"
                                series={[
                                    {
                                        name: 'count',
                                        color: 'blue'
                                    },
                                ]}
                                tickLine="y"
                                xAxisProps={{
                                    interval: 0, // Ensures all labels are displayed
                                    angle: -45, // Rotates labels for better visibility
                                    textAnchor: 'end',
                                }}
                                barProps={{ radius: 10 }}
                                maxBarWidth={40}
                            />
                        </Card>
                    </Grid.Col>
                </Grid> */}