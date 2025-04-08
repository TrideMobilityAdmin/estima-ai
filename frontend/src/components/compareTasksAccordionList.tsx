import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Accordion,
    Card,
    Text,
    Grid,
    Group,
    Title,
    Space,
    TextInput,
    Flex,
    Badge,
    Pagination,
    Center,
    Box,
    ScrollArea,
    Button,
    Tooltip,
    Modal
} from "@mantine/core";
import { IconDownload, IconSearch } from "@tabler/icons-react";
import { AgGridReact } from "ag-grid-react";

interface Task {
    package_number: string;
    task_number: string;
    actual_man_hours_actual: number;
    actual_man_hours_pred: number;
    diff_avg_mh: number;
    accuracy_avg_mh: number;
    task_part_consumption_actual: number;
    task_part_consumption_pred: number;
    diff_total_billable_value_usd_tasks: number;
    accuracy_total_billable_value_usd_tasks: number;
    actual_man_hours_findings_actual: number;
    actual_man_hours_findings_pred: number;
    diff_avg_mh_findings: number;
    accuracy_avg_mh_findings: number;
    findings_part_consumption_actual: number;
    findings_part_consumption_pred: number;
    diff_total_billable_value_usd_findings: number;
    accuracy_total_billable_value_usd_findings: number;
}

const TaskListCompareScreen: React.FC<{ tasksEligible: any[], tasksNotEligible: any[] }> = ({ tasksEligible, tasksNotEligible  }) => {
    const [taskSearch, setTaskSearch] = useState("");
    const [openedAccordion, setOpenedAccordion] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const taskListRef = useRef<HTMLDivElement>(null);

    const filteredTasks = useMemo(() => {
        const search = taskSearch?.trim()?.toLowerCase();
        if (!search) return tasksEligible;
        return tasksEligible?.filter(task => task?.task_number?.toLowerCase()?.includes(search));
    }, [tasksEligible, taskSearch]);

    useEffect(() => {
        setCurrentPage(1);
    }, [taskSearch]);

    const paginatedTasks = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTasks?.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTasks, currentPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        taskListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const parts = [
        { partId: "12345", desc: "Part A", qty: 2, predQty: 4, unit: "pcs", price: 10.5 },
        { partId: "67890", desc: "Part B", qty: 1, predQty: 2, unit: "pcs", price: 20.0 },
        { partId: "54321", desc: "Part C", qty: 3, predQty: 6, unit: "pcs", price: 15.75 },
        { partId: "09876", desc: "Part D", qty: 4, predQty: 3, unit: "pcs", price: 5.25 },
    ];
    const notAvailable = [
        {
            taskId : "200002-01-1",
            manHrs : 3,
            sparesCost : 35,
        },
        {
            taskId : "200121-01-1",
            manHrs : 5,
            sparesCost : 50,
        },
        {
            taskId : "200435-01-1 (LH)",
            manHrs : 4,
            sparesCost : 25,
        },
    ];
     const [opened, setOpened] = useState(false);    
    return (
        <>
        <Modal
  opened={opened}
  onClose={() => {
    setOpened(false);
    // form.reset();
  }}
  size={800}
  withCloseButton={true}
  styles={{
    header: { 
      padding: '16px',
      width: '100%'
    },
    title: { 
      width: '100%',
      margin: 0
    }
  }}
  title={
    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Title order={4} c='dimmed'>
        Tasks Not Eligible for Comparision
      </Title>
      <Button
        size="xs"
        rightSection={<IconDownload size={14} />}
        variant="light"
      >
        Download
      </Button>
    </div>
  }
>
                                <Box style={{flex:1, height: '400px' }}>
                                                                                                                        <div
                                                                                                                            className="ag-theme-alpine"
                                                                                                                            style={{
                                                                                                                                width: "100%",
                                                                                                                                height: "100%",
                                                                                                                            }}
                                                                                                                        >
                                                                                                                            <style>
                                                                                                                                {`
                                                                                                                                .ag-theme-alpine {
                                                                                                                                    --ag-header-background-color: #f8f9fa;
                                                                                                                                    --ag-odd-row-background-color: #ffffff;
                                                                                                                                    --ag-even-row-background-color: #f9f9f9;
                                                                                                                                    --ag-row-hover-color: #f1f3f5;
                                                                                                                                    --ag-border-color: #e9ecef;
                                                                                                                                    --ag-font-size: 13px;
                                                                                                                                }
                                                                                                                                
                                                                                                                                .ag-theme-alpine .ag-header-cell {
                                                                                                                                    font-weight: 600;
                                                                                                                                    color: #495057;
                                                                                                                                }
                                                                                                                                
                                                                                                                                .ag-theme-alpine .ag-row {
                                                                                                                                    border-bottom: 1px solid var(--ag-border-color);
                                                                                                                                }
                                                                                                            
                                                                                                                                .ag-theme-alpine .ag-cell {
                                                                                                                                    padding: 8px;
                                                                                                                                }
                                                                                                                                `}
                                                                                                                            </style>
                                                                                                                            <AgGridReact
                                                                                                                                rowData={notAvailable || []}
                                                                                                                                domLayout="normal"
                                                                                                                                columnDefs={[
                                                                                                                                    {
                                                                                                                                        field: "taskId",
                                                                                                                                        headerName: "Task ID",
                                                                                                                                        flex: 1.5,
                                                                                                                                        minWidth: 120,
                                                                                                                                        sortable: true,
                                                                                                                                        resizable: true,
                                                                                                                                        filter: true,
                                                                                                                                        floatingFilter: true,
                                                                                                                                    },
                                                                                                                                    {
                                                                                                                                        field: "manHrs",
                                                                                                                                        headerName: "Man Hours",
                                                                                                                                        flex: 1.5,
                                                                                                                                        minWidth: 120,
                                                                                                                                        sortable: true,
                                                                                                                                        resizable: true,
                                                                                                                                        // filter: true,
                                                                                                                                        // floatingFilter: true,
                                                                                                                                    },
                                                                                                                                    {
                                                                                                                                        field: "sparesCost",
                                                                                                                                        headerName: "Spare Cost",
                                                                                                                                        flex: 0.8,
                                                                                                                                        minWidth: 80,
                                                                                                                                        filter: 'agNumberColumnFilter',
                                                                                                                                        cellRenderer: (val: any) => {
                                                                                                                                            return <>
                                                                                                                                                <Text>
                                                                                                                                                    {val?.data?.sparesCost?.toFixed(2)}
                                                                                                                                                </Text>
                                                                                                                                            </>
                                                                                                                                        }
                                                                                                                                    }
                                                                                                                                ]}
                                                                                                                                pagination={true}
                                                                                                                                paginationPageSize={10}
                                                                                                                            />
                                                                                                                        </div>
                                                                                                                    </Box>
                                                   
                            </Modal>
        <Card radius='md' ref={taskListRef} p="md" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Section: Title and Search */}
            <Box mb="md" style={{ flex: '0 0 auto' }}>
                <Group justify="space-between">
                    <Flex direction='column'>
                        <Title order={3}>Task Analysis</Title>
                        {/* <Text fz='xs'>Detailed Breakdown of Tasks metrics and predictions</Text> */}
                    </Flex>
                    <Group>
                    <TextInput
                        placeholder="Search Tasks..."
                        value={taskSearch}
                        leftSection={<IconSearch />}
                        onChange={(e) => setTaskSearch(e.currentTarget.value)}
                        size="xs"
                    />
                    <Tooltip label="Show Not Eligible Tasks">
                                         <Button 
                                         variant="light" 
                                         color="red" 
                                         size="xs" 
                                         radius="sm"
                                            onClick={() => setOpened(true)}
                                         >
                                            Not Eligible
                                        </Button>
                                    </Tooltip>
                    </Group>
                </Group>
            </Box>

            {/* Middle Section: Scrollable Accordion */}
            <Box style={{ flex: '1 1 auto', marginBottom: "16px" }}>
                <ScrollArea style={{ height: "calc(100vh - 200px)" }} offsetScrollbars scrollbarSize={1}>
                    {paginatedTasks?.length > 0 ? (
                        <Accordion
                            variant="separated"
                            radius="md"
                            value={openedAccordion}
                            onChange={(value) => setOpenedAccordion(value)}
                        >
                            {paginatedTasks?.map((task: any) => (
                                <Accordion.Item key={task?.task_number} value={task?.task_number}>
                                    <Accordion.Control
                                        style={{
                                            paddingLeft: 10,
                                            paddingRight: 10,
                                            background: openedAccordion === task?.task_number
                                                ? "linear-gradient(90deg,rgb(78, 95, 228), #4364F7)"
                                                : "transparent",
                                            color: openedAccordion === task?.task_number ? "#fff" : "#000",
                                            borderRadius: "10px",
                                            height: 65,
                                        }}
                                    >
                                        <Group justify="space-between" style={{ width: "100%", padding: "12px 16px" }}>
                                            <div>
                                                <Group>
                                                    <Text fz='sm'>Task :</Text>
                                                    <Title order={5} fz='sm'>{task?.task_number || "-"}</Title>
                                                </Group>
                                            </div>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                            <Group>
                                                <Title order={4}>
                                                    Accuracy
                                                </Title>
                                                <Badge variant="filled" color="teal" size="lg" radius="md">{task?.accuracy?.toFixed(0) || 0} %</Badge>
                                            </Group>
                                            <Grid pt='xs'>
                                                {/* Man Hours Analysis */}
                                                <Grid.Col span={6}>
                                                    <Card bg="#f2f2f2">
                                                        <Title order={5}>Task - MH</Title>
                                                        <Group justify="space-between">
                                                            <Text size="sm">Actual</Text>
                                                            <Text fw={600} fz="md">{Math.round(task?.actual_man_hours_actual) || 0} hr</Text>
                                                        </Group>
                                                        <Group justify="space-between">
                                                            <Text size="sm">Predicted</Text>
                                                            <Text fw={600} fz="md">{Math.round(task?.actual_man_hours_pred) || 0} hr</Text>
                                                        </Group>
                                                        <Group justify="space-between">
                                                            <Text size="sm">Difference</Text>
                                                            <Text fw={600} fz="md" c="#a8020a">{Math.round(task?.diff_avg_mh) || 0} hr</Text>
                                                        </Group>
                                                    </Card>
                                                </Grid.Col>

                                                {/* Part Consumption */}
                                                <Grid.Col span={6}>
                                                    <Card bg="#f2f2f2">
                                                        <Title order={5}>Task - Spares</Title>
                                                        <Group justify="space-between">
                                                            <Text size="sm">Actual</Text>
                                                            <Text fw={600} fz="md">{task?.task_part_consumption_actual?.toFixed(2) || 0} $</Text>
                                                        </Group>
                                                        <Group justify="space-between">
                                                            <Text size="sm">Predicted</Text>
                                                            <Text fw={600} fz="md">{task?.task_part_consumption_pred?.toFixed(2) || 0} $</Text>
                                                        </Group>
                                                        <Group justify="space-between">
                                                            <Text size="sm">Difference</Text>
                                                            <Text fw={600} fz="md" c="#a8020a">{task?.diff_total_billable_value_usd_tasks?.toFixed(2) || 0} $</Text>
                                                        </Group>
                                                    </Card>
                                                </Grid.Col>
                                            </Grid>
                                            <Space h='sm' />

                                            <Box style={{flex:1, height: '400px' }}>
                                                <div
                                                    className="ag-theme-alpine"
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                    }}
                                                >
                                                    <style>
                                                        {`
                                                        .ag-theme-alpine {
                                                            --ag-header-background-color: #f8f9fa;
                                                            --ag-odd-row-background-color: #ffffff;
                                                            --ag-even-row-background-color: #f9f9f9;
                                                            --ag-row-hover-color: #f1f3f5;
                                                            --ag-border-color: #e9ecef;
                                                            --ag-font-size: 13px;
                                                        }
                                                        
                                                        .ag-theme-alpine .ag-header-cell {
                                                            font-weight: 600;
                                                            color: #495057;
                                                        }
                                                        
                                                        .ag-theme-alpine .ag-row {
                                                            border-bottom: 1px solid var(--ag-border-color);
                                                        }
                                    
                                                        .ag-theme-alpine .ag-cell {
                                                            padding: 8px;
                                                        }
                                                        `}
                                                    </style>
                                                    <AgGridReact
                                                        rowData={parts || []}
                                                        domLayout="normal"
                                                        columnDefs={[
                                                            {
                                                                field: "partId",
                                                                headerName: "Part Number",
                                                                flex: 1.5,
                                                                minWidth: 120,
                                                                sortable: true,
                                                                resizable: true,
                                                                filter: true,
                                                                floatingFilter: true,
                                                            },
                                                            {
                                                                field: "desc",
                                                                headerName: "Description",
                                                                flex: 1.5,
                                                                minWidth: 120,
                                                                sortable: true,
                                                                resizable: true,
                                                                filter: true,
                                                                floatingFilter: true,
                                                            },
                                                            {
                                                                field: "qty",
                                                                headerName: "Actual Qty",
                                                                flex: 0.8,
                                                                minWidth: 80,
                                                                filter: 'agNumberColumnFilter',
                                                                cellRenderer: (val: any) => {
                                                                    return <>
                                                                        <Text>
                                                                            {val?.data?.qty?.toFixed(2)}
                                                                        </Text>
                                                                    </>
                                                                }
                                                            },
                                                            {
                                                                field: "predQty",
                                                                headerName: "Pred Qty",
                                                                flex: 0.8,
                                                                minWidth: 80,
                                                                filter: 'agNumberColumnFilter',
                                                                cellRenderer: (val: any) => {
                                                                    return <>
                                                                        <Text>
                                                                            {val?.data?.predQty?.toFixed(2)}
                                                                        </Text>
                                                                    </>
                                                                }
                                                            },
                                                        ]}
                                                        pagination={true}
                                                        paginationPageSize={10}
                                                    />
                                                </div>
                                            </Box>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    ) : (
                        <Center>
                            <Text c='gray' p={150}>
                                No Data Found
                            </Text>
                        </Center>
                    )}
                </ScrollArea>
            </Box>

            {/* Bottom Section: Pagination */}
            <Box style={{ flex: '0 0 auto' }}>
                {filteredTasks?.length > 0 && (
                    <Center>
                        <Pagination
                            color='rgb(78, 95, 228)'
                            total={Math.ceil(filteredTasks?.length / itemsPerPage)}
                            value={currentPage}
                            onChange={handlePageChange}
                        />
                    </Center>
                )}
            </Box>

        </Card>

        </>
    );
};

export default TaskListCompareScreen;