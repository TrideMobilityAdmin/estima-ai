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
    Center
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

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

const TaskListCompareScreen: React.FC<{ tasks: any[] }> = ({ tasks }) => {
    const [taskSearch, setTaskSearch] = useState("");
    const [openedAccordion, setOpenedAccordion] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const taskListRef = useRef<HTMLDivElement>(null);

    const filteredTasks = useMemo(() => {
        const search = taskSearch?.trim()?.toLowerCase();
        if (!search) return tasks;
        return tasks?.filter(task => task?.task_number?.toLowerCase()?.includes(search));
    }, [tasks, taskSearch]);

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

    return (
        <Card radius='md'  ref={taskListRef}>
            <Group justify="space-between">
                <Flex direction='column'>
                    <Title order={3}>Task Analysis</Title>
                    <Text fz='xs'>Detailed Breakdown of Tasks metrics and predictions</Text>
                </Flex>
                <TextInput
                    placeholder="Search Tasks..."
                    value={taskSearch}
                    leftSection={<IconSearch />}
                    onChange={(e) => setTaskSearch(e.currentTarget.value)}
                    size="sm"
                />
            </Group>
            <Space h='md' />
            {
                paginatedTasks?.length > 0 ? (
                    <>
                        <Accordion
                            variant="separated"
                            radius="md"
                            value={openedAccordion}
                            onChange={(value) => setOpenedAccordion(value)}
                        >
                            {paginatedTasks?.map((task: any) => (
                                <Accordion.Item key={task?.task_number} value={task?.task_number}>
                                    <Accordion.Control
                                        // onClick={() => toggleAccordion(task?.task_number)}
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
                                                {/* <Group>
                                                    <Text fz='sm'>Package :</Text>
                                                    <Title order={5} fz='sm'>{task?.package_number}</Title>
                                                </Group> */}
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
                                            <Grid.Col span={3}>
                                                <Card bg="#e7e6e8">
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
                                            <Grid.Col span={3}>
                                                <Card bg="#e7e6e8">
                                                    <Title order={5}>Task - Spares</Title>
                                                    <Group justify="space-between">
                                                        <Text size="sm">Actual</Text>
                                                        <Text fw={600} fz="md">{task?.task_part_consumption_actual.toFixed(2) || 0} $</Text>
                                                    </Group>
                                                    <Group justify="space-between">
                                                        <Text size="sm">Predicted</Text>
                                                        <Text fw={600} fz="md">{task?.task_part_consumption_pred.toFixed(2) || 0} $</Text>
                                                    </Group>
                                                    <Group justify="space-between">
                                                        <Text size="sm">Difference</Text>
                                                        <Text fw={600} fz="md" c="#a8020a">{task?.diff_total_billable_value_usd_tasks.toFixed(2) || 0} $</Text>
                                                    </Group>
                                                </Card>
                                            </Grid.Col>

                                            {/* Findings - Man Hours Analysis */}
                                            <Grid.Col span={3}>
                                                <Card bg="#e7e6e8">
                                                    <Title order={5}>Findings - MH</Title>
                                                    <Group justify="space-between">
                                                        <Text size="sm">Actual</Text>
                                                        <Text fw={600} fz="md">{Math.round(task?.actual_man_hours_findings_actual) || 0} hr</Text>
                                                    </Group>
                                                    <Group justify="space-between">
                                                        <Text size="sm">Predicted</Text>
                                                        <Text fw={600} fz="md">{Math.round(task?.actual_man_hours_findings_pred) || 0} hr</Text>
                                                    </Group>
                                                    <Group justify="space-between">
                                                        <Text size="sm">Difference</Text>
                                                        <Text fw={600} fz="md" c="#a8020a">{Math.round(task?.diff_avg_mh_findings) || 0} hr</Text>
                                                    </Group>
                                                </Card>
                                            </Grid.Col>

                                            {/* Finding - Part Consumption */}
                                            <Grid.Col span={3}>
                                                <Card bg="#e7e6e8">
                                                    <Title order={5}>Findings - Spares</Title>
                                                    <Group justify="space-between">
                                                        <Text size="sm">Actual</Text>
                                                        <Text fw={600} fz="md">{task?.findings_part_consumption_actual.toFixed(2) || 0} $</Text>
                                                    </Group>
                                                    <Group justify="space-between">
                                                        <Text size="sm">Predicted</Text>
                                                        <Text fw={600} fz="md">{task?.findings_part_consumption_pred.toFixed(2) || 0} $</Text>
                                                    </Group>
                                                    <Group justify="space-between">
                                                        <Text size="sm">Difference</Text>
                                                        <Text fw={600} fz="md" c="#a8020a">{task?.diff_total_billable_value_usd_findings.toFixed(2) || 0} $</Text>
                                                    </Group>
                                                </Card>
                                            </Grid.Col>
                                        </Grid>
                                        {/* <Divider my="sm" /> */}
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </>
                ) : (
                    <>
                        <Center>
                            <Text c='gray' p={150}>
                                No Data Found
                            </Text>
                        </Center>

                    </>
                )
            }

            <Space h='md' />    
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

        </Card>
    );
};

export default TaskListCompareScreen;

// import React, { useMemo, useState } from "react";
// import {
//     Accordion,
//     Card,
//     Text,
//     Grid,
//     Group,
//     Title,
//     Divider,
//     ScrollArea,
//     Space,
//     TextInput,
//     Flex,
//     Badge
// } from "@mantine/core";
// import { IconSearch } from "@tabler/icons-react";

// interface Task {
//     package_number: string;
//     task_number: string;
//     actual_man_hours_actual: number;
//     actual_man_hours_pred: number;
//     diff_avg_mh: number;
//     accuracy_avg_mh: number;
//     task_part_consumption_actual: number;
//     task_part_consumption_pred: number;
//     diff_total_billable_value_usd_tasks: number;
//     accuracy_total_billable_value_usd_tasks: number;
//     actual_man_hours_findings_actual: number;
//     actual_man_hours_findings_pred: number;
//     diff_avg_mh_findings: number;
//     accuracy_avg_mh_findings: number;
//     findings_part_consumption_actual: number;
//     findings_part_consumption_pred: number;
//     diff_total_billable_value_usd_findings: number;
//     accuracy_total_billable_value_usd_findings: number;
// }

// interface TaskListProps {
//     tasks: Task[];
// }

// const TaskListCompareScreen: React.FC<any> = ({ tasks }) => {
//     const [taskSearch, setTaskSearch] = useState("");
//     const [openedAccordion, setOpenedAccordion] = useState<string | null>(null);

//     const filteredTasks = useMemo(() => {
//         if (!taskSearch) return tasks;
//         return tasks.filter((task : any) =>
//             task?.task_number?.toLowerCase().includes(taskSearch?.toLowerCase())
//         );
//     }, [tasks, taskSearch]);

//     return (
//         <Card radius='md' h='85vh' style={{ overflowY: "auto" }}>
//             <Group justify="space-between">
//                 <Flex direction='column'>
//                     <Title order={3}>Task Analysis</Title>
//                     <Text fz='xs'>Detailed Breakdown of Tasks metrics and predictions</Text>
//                 </Flex>
//                 <TextInput
//                     placeholder="Search Tasks..."
//                     value={taskSearch}
//                     leftSection={<IconSearch />}
//                     onChange={(e) => setTaskSearch(e.currentTarget.value)}
//                     // mb="md"
//                     size="sm"

//                 />
//             </Group>
//             <Space h='md' />
//             <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
//                 <Accordion
//                     variant="separated"
//                     radius="md"
//                     value={openedAccordion}
//                     onChange={(value) => setOpenedAccordion(value)}
//                 >
//                     {filteredTasks?.map((task : any) => (
//                         <Accordion.Item key={task?.task_number} value={task?.task_number}>
//                             <Accordion.Control
//                                 style={{
//                                     paddingLeft: 10,
//                                     paddingRight: 10,
//                                     background: openedAccordion === task?.task_number
//                                         ? "linear-gradient(90deg,rgb(78, 95, 228), #4364F7)"
//                                         : "transparent",
//                                     color: openedAccordion === task?.task_number ? "#fff" : "#000",
//                                     borderRadius: "10px",
//                                     height: 65,
//                                 }}
//                             >
//                                 <Group justify="space-between" style={{ width: "100%", padding: "12px 16px" }}>
//                                     <div>
//                                         {/* <Group>
//                                             <Text fz='sm'>Package :</Text>
//                                             <Title order={5} fz='sm'>{task?.package_number}</Title>
//                                         </Group> */}
//                                         <Group>
//                                             <Text fz='sm'>Task :</Text>
//                                             <Title order={5} fz='sm'>{task?.task_number || "-"}</Title>
//                                         </Group>
//                                     </div>
//                                 </Group>
//                             </Accordion.Control>
//                             <Accordion.Panel>
//                             <Group>
//                                         <Title order={4}>
//                                             Accuracy
//                                         </Title>
//                                         <Badge variant="filled" color="teal" size="lg" radius="md">{task?.accuracy?.toFixed(0) || 0} %</Badge>
//                                     </Group>
//                                 <Grid pt='xs'>
//                                     {/* Man Hours Analysis */}
//                                     <Grid.Col span={3}>
//                                         <Card bg="#e7e6e8">
//                                             <Title order={5}>Man Hours</Title>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Actual</Text>
//                                                 <Text fw={600} fz="md">{task?.actual_man_hours_actual} hrs</Text>
//                                             </Group>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Predicted</Text>
//                                                 <Text fw={600} fz="md">{task?.actual_man_hours_pred} hrs</Text>
//                                             </Group>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Difference</Text>
//                                                 <Text fw={600} fz="md" c="#a8020a">{task?.diff_avg_mh} hrs</Text>
//                                             </Group>
//                                         </Card>
//                                     </Grid.Col>

//                                     {/* Part Consumption */}
//                                     <Grid.Col span={3}>
//                                         <Card bg="#e7e6e8">
//                                             <Title order={5}>Part Consumption</Title>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Actual</Text>
//                                                 <Text fw={600} fz="md">$ {task?.task_part_consumption_actual.toFixed(2)}</Text>
//                                             </Group>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Predicted</Text>
//                                                 <Text fw={600} fz="md">$ {task?.task_part_consumption_pred.toFixed(2)}</Text>
//                                             </Group>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Difference</Text>
//                                                 <Text fw={600} fz="md" c="#a8020a">$ {task?.diff_total_billable_value_usd_tasks.toFixed(2)}</Text>
//                                             </Group>
//                                         </Card>
//                                     </Grid.Col>

//                                     {/* Findings - Man Hours Analysis */}
//                                     <Grid.Col span={3}>
//                                         <Card bg="#e7e6e8">
//                                             <Title order={5}>Finding - Man Hours</Title>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Actual</Text>
//                                                 <Text fw={600} fz="md">{task?.actual_man_hours_findings_actual} hrs</Text>
//                                             </Group>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Predicted</Text>
//                                                 <Text fw={600} fz="md">{task?.actual_man_hours_findings_pred} hrs</Text>
//                                             </Group>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Difference</Text>
//                                                 <Text fw={600} fz="md" c="#a8020a">{task?.diff_avg_mh_findings} hrs</Text>
//                                             </Group>
//                                         </Card>
//                                     </Grid.Col>

//                                     {/* Finding - Part Consumption */}
//                                     <Grid.Col span={3}>
//                                         <Card bg="#e7e6e8">
//                                             <Title order={5}>Finding - Consumption</Title>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Actual</Text>
//                                                 <Text fw={600} fz="md">$ {task?.findings_part_consumption_actual.toFixed(2)}</Text>
//                                             </Group>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Predicted</Text>
//                                                 <Text fw={600} fz="md">$ {task?.findings_part_consumption_pred.toFixed(2)}</Text>
//                                             </Group>
//                                             <Group justify="space-between">
//                                                 <Text size="sm">Difference</Text>
//                                                 <Text fw={600} fz="md" c="#a8020a">$ {task?.diff_total_billable_value_usd_findings.toFixed(2)}</Text>
//                                             </Group>
//                                         </Card>
//                                     </Grid.Col>
//                                 </Grid>
//                                 {/* <Divider my="sm" /> */}


//                             </Accordion.Panel>
//                         </Accordion.Item>
//                     ))}
//                 </Accordion>
//             </ScrollArea>
//         </Card>

//     );
// };

// export default TaskListCompareScreen;

{/* Accuracy Metrics */ }
{/* <Grid>
                                    <Grid.Col span={3}>
                                        <Card bg="#e7e6e8">
                                            <Group justify="space-between">
                                                <Text size="sm">Accuracy</Text>
                                                <Text fw={700} fz="md" c="#05800d">
                                                    {((task.actual_man_hours_actual / task.actual_man_hours_pred) * 100).toFixed(2) + ' %'}
                                                </Text>
                                            </Group>
                                        </Card>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Card bg="#e7e6e8">
                                            <Group justify="space-between">
                                                <Text size="sm">Accuracy</Text>
                                                <Text fw={600} fz="md" c="#05800d">
                                                    {((task.task_part_consumption_actual / task.task_part_consumption_pred) * 100).toFixed(2) + ' %'
                                                    }
                                                </Text>
                                            </Group>
                                        </Card>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Card bg="#e7e6e8">
                                            <Group justify="space-between">
                                                <Text size="sm">Accuracy</Text>
                                                <Text fw={600} fz="md" c="#05800d">
                                                    {((task.actual_man_hours_findings_actual / task.actual_man_hours_findings_pred) * 100).toFixed(2) + ' %'
                                                    }
                                                </Text>
                                            </Group>
                                        </Card>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Card bg="#e7e6e8">
                                            <Group justify="space-between">
                                                <Text size="sm">Accuracy</Text>
                                                <Text fw={600} fz="md" c="#05800d">
                                                    {((task.findings_part_consumption_actual / task.findings_part_consumption_pred) * 100).toFixed(2) + ' %'
                                                    }
                                                </Text>
                                            </Group>
                                        </Card>
                                    </Grid.Col>
                                </Grid> */}