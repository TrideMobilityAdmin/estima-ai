import { Card, Group, SimpleGrid, Title, Text, ScrollArea, Badge, Button, Divider, Box, Flex, Space, Accordion, Progress, TextInput, LoadingOverlay, Center } from "@mantine/core";
import { useState } from "react";
import DropZoneExcel from "../components/fileDropZone";
import { MdLensBlur, MdOutlineArrowForward } from "react-icons/md";
import { IconAlertTriangle, IconClock, IconCube, IconMessage2Down } from "@tabler/icons-react";
import ReactApexChart from "react-apexcharts";
import { useApi } from "../api/services/estimateSrvice";
import { useApiSkillAnalysis } from "../api/services/skillsService";
import { showNotification } from "@mantine/notifications";
import { ApexOptions } from 'apexcharts';
import SkillsDonutChart from "../components/skillsDonut";

export default function SkillRequirement() {
    const { validateTasks } = useApi();
    const { getSkillAnalysis } = useApiSkillAnalysis();

    const [tasks, setTasks] = useState<string[]>([]);
    const [validatedTasks, setValidatedTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loading, setLoading] = useState(false); // Add loading state

    const [skillAnalysisData, setSkillAnalysisData] = useState<any>(null);

    const handleFiles = (files: File[]) => {
        console.log("Uploaded files:", files);
    };

    //  Extracted tasks are passed to validation API
    const handleTasks = async (extractedTasks: string[]) => {
        setIsLoading(true);
        setTasks(extractedTasks);

        console.log("Extracted Tasks:", extractedTasks);
        const response = await validateTasks(extractedTasks);
        setValidatedTasks(response);
        setIsLoading(false);

        const invalidTasks = response?.filter((task) => task?.status === false);
        if (invalidTasks.length > 0) {
            showNotification({
                title: "Tasks Not Available!",
                message: `${invalidTasks.length} tasks are not available. Only valid tasks will be used to Skill Analysis.`,
                color: "orange",
                style: { position: "fixed", top: 100, right: 20, zIndex: 1000 },
            });
        }
    };

    // Handle Submit
    const handleSubmit = async () => {
        const validTasks = validatedTasks?.filter((task) => task?.status === true)?.map((task) => task?.taskid);

        if (tasks.length === 0) {
            showNotification({
                title: "Error",
                message: "Tasks are required",
                color: "red",
                style: { position: "fixed", top: 20, right: 20, zIndex: 1000 },
            });
            return;
        }

        if (validTasks.length === 0) {
            showNotification({
                title: "Error",
                message: "No valid tasks available to estimate the report.",
                color: "red",
                style: { position: "fixed", top: 20, right: 20, zIndex: 1000 },
            });
            return;
        }

        const requestData = {
            source_tasks: validTasks,
        };

        console.log("Submitting data:", requestData);

        try {
            setLoading(true);
            const response = await getSkillAnalysis(requestData);
            console.log("API Response:", response);

            if (response) {
                setSkillAnalysisData(response);
                showNotification({
                    title: "Successful!",
                    message: "Skill Analysis generated!",
                    color: "green",

                });
            }
        } catch (error) {
            showNotification({
                title: "Submission Failed",
                message: "An error occurred while submitting the estimate report.",
                color: "red",
            });
            console.error("API Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalTaskSkills = skillAnalysisData?.skillAnalysis?.tasks?.reduce((acc: any, task: any) => acc + task?.skills?.length, 0);
    const totalFindingSkills = skillAnalysisData?.skillAnalysis.findings?.reduce((acc: any, finding: any) => acc + finding?.skills?.length, 0);

    // Function to calculate total avg time
    const calculateTotalAvgTime = (items: any) => {
        return items?.reduce((total: any, item: any) => {
            return total + item?.skills?.reduce((sum: any, skill: any) => sum + skill.manHours.avg, 0);
        }, 0);
    };

    // Calculate total avg time for tasks and findings
    const totalAvgTimeTasks = calculateTotalAvgTime(skillAnalysisData?.skillAnalysis?.tasks);
    const totalAvgTimeFindings = calculateTotalAvgTime(skillAnalysisData?.skillAnalysis?.findings);

    // const jsonData = {
    //     "skillAnalysis": {
    //         "tasks": [
    //             {
    //                 "taskId": "200435-01-1 (LH)",
    //                 "taskDescription": "FAN COMPARTMENT\n\nDETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY\nGEAR BOX (EWIS)",
    //                 "skills": [
    //                     {
    //                         "skill": "Skill 1",
    //                         "manHours": {
    //                             "min": 4,
    //                             "avg": 6,
    //                             "max": 8
    //                         }
    //                     },
    //                     {
    //                         "skill": "Skill 2",
    //                         "manHours": {
    //                             "min": 6,
    //                             "avg": 4,
    //                             "max": 4
    //                         }
    //                     },
    //                     {
    //                         "skill": "Skill 3",
    //                         "manHours": {
    //                             "min": 4,
    //                             "avg": 4,
    //                             "max": 4
    //                         }
    //                     }
    //                 ]
    //             },
    //             {
    //                 "taskId": "200435-01-4",
    //                 "taskDescription": "FAN COMPARTMENT\n\nDETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY\nGEAR BOX (EWIS)",
    //                 "skills": [
    //                     {
    //                         "skill": "skill 2",
    //                         "manHours": {
    //                             "min": 4,
    //                             "avg": 4,
    //                             "max": 4
    //                         }
    //                     },
    //                     {
    //                         "skill": "skill 1",
    //                         "manHours": {
    //                             "min": 3,
    //                             "avg": 6,
    //                             "max": 12
    //                         }
    //                     },
    //                     {
    //                         "skill": "skill 4",
    //                         "manHours": {
    //                             "min": 6,
    //                             "avg": 4,
    //                             "max": 12
    //                         }
    //                     }
    //                 ]
    //             }
    //         ],
    //         "findings": [
    //             {
    //                 "taskId": "200435-01-1 (LH)",
    //                 "skills": [
    //                     {
    //                         "skill": 'skill 1',
    //                         "manHours": {
    //                             "min": 2,
    //                             "avg": 4,
    //                             "max": 6
    //                         }
    //                     },
    //                     {
    //                         "skill": 'skill 2',
    //                         "manHours": {
    //                             "min": 4,
    //                             "avg": 4,
    //                             "max": 6
    //                         }
    //                     },
    //                     {
    //                         "skill": 'skill 3',
    //                         "manHours": {
    //                             "min": 2,
    //                             "avg": 2,
    //                             "max": 2
    //                         }
    //                     }
    //                 ]
    //             },
    //             {
    //                 "taskId": "200435-01-1 (RH)",
    //                 "skills": [
    //                     {
    //                         "skill": 'skill 1',
    //                         "manHours": {
    //                             "min": 2,
    //                             "avg": 2,
    //                             "max": 2
    //                         }
    //                     }
    //                 ]
    //             },
    //             {
    //                 "taskId": "200435-01-4",
    //                 "skills": [
    //                     {
    //                         "skill": 'skill 1',
    //                         "manHours": {
    //                             "min": 2,
    //                             "avg": 2,
    //                             "max": 2
    //                         }
    //                     }
    //                 ]
    //             }
    //         ]
    //     }
    // };


    const chartConfig: ApexOptions = {
        chart: {
            background: 'transparent',
            type: 'donut',
        },
        title: {
            text: 'Skill Distribution',
            align: 'center',
            style: {
                fontSize: '16px',
                fontWeight: 500,
            },
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        value: {
                            show: true,
                            fontSize: '16px',
                            fontWeight: 600,
                            formatter: (val: any) => `${val?.toFixed(1)}%`,
                        },
                        total: {
                            show: true,
                            fontSize: '16px',
                            fontWeight: 600,
                            formatter: (w: any) => {
                                const total = w?.globals?.seriesTotals?.reduce((a: number, b: number) => a + b, 0);
                                return `${total?.toFixed(1)} hrs`;
                            },
                        },
                    },
                },
            },
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => `${val?.toFixed(1)}%`,
            style: {
                fontSize: '14px',
                fontWeight: 600,
            },
        },
        legend: {
            position: 'bottom',
            fontSize: '14px',
        },
        stroke: {
            width: 0,
        },
        tooltip: {
            enabled: true,
            y: {
                formatter: (val: number) => `${val?.toFixed(1)} hrs`,
            },
        },
    };


    const TaskAccordion = ({ data }: { data: any[] }) => {
        const [taskSearch, setTaskSearch] = useState("");
        const filteredTasks = data?.filter((task) =>
            task.taskId.toLowerCase().includes(taskSearch.toLowerCase())
        );

        return (
            <>
                <TextInput
                    placeholder="Search Tasks by Task ID"
                    mb="sm"
                    value={taskSearch}
                    onChange={(event) => setTaskSearch(event.currentTarget.value)}
                />
                <Accordion variant="separated" defaultValue={data?.length > 0 ? data[0]?.taskId : undefined}>
                    {filteredTasks?.map((task) => (
                        
                        <Accordion.Item key={task.taskId} value={task.taskId}>
                            <Accordion.Control>
                                <Group>
                                    <IconCube color="#4E66DE" />
                                    {task.taskId}
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <ScrollArea h={400} scrollHideDelay={0}>
                                    <Box p="md">
                                    <SkillsDonutChart task={task} />
                                        {/* <Center mb="lg">
                                            <div style={{ width: 300, height: 300 }}>
                                                {task?.skills?.length ? (
                                                    <ReactApexChart
                                                        type="donut"
                                                        height={300}
                                                        width={300}
                                                        options={chartConfig}
                                                        labels={task?.skills?.map((skill: any) => skill?.skill || "Unknown Skill")} // Ensure labels match series
                                                        series={task?.skills
                                                            ?.map((skill: any) => skill?.manHours?.avg)
                                                            ?.filter((val: any) => typeof val === "number" && !isNaN(val))} // Remove invalid values
                                                    />
                                                ) : (
                                                    <Text>No data available</Text>
                                                )}
                                            </div>
                                        </Center> */}

                                        {task?.skills?.map((skill: any) => (
                                            <Card key={skill.skill} shadow="0" p="sm" radius='md' mt="xs" bg='#f0f0f0'>
                                                <Text size="sm" fw={500}>{skill.skill}</Text>
                                                <Group justify="space-between">
                                                    <Text fz="xs" c="green" fw={700}>
                                                        Min {skill?.manHours.min} Hr
                                                    </Text>
                                                    <Text fz="xs" c="yellow" fw={700}>
                                                        Avg {skill?.manHours.avg} Hr
                                                    </Text>
                                                    <Text fz="xs" c="red" fw={700}>
                                                        Max {skill?.manHours.max} Hr
                                                    </Text>
                                                </Group>
                                                <Progress.Root>
                                                    <Progress.Section value={skill?.manHours.min * 100} color="green" />
                                                    <Progress.Section value={skill?.manHours.avg * 100} color="yellow" />
                                                    <Progress.Section value={skill?.manHours.max * 100} color="red" />
                                                </Progress.Root>
                                            </Card>
                                        ))}
                                    </Box>
                                </ScrollArea>
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
            </>
        );
    };

    const FindingAccordion = ({ data }: { data: any[] }) => {
        const [findingSearch, setFindingSearch] = useState("");
        const filteredFindings = data?.filter((finding) =>
            finding.taskId.toLowerCase().includes(findingSearch.toLowerCase())
        );

        return (
            <>
                <TextInput
                    placeholder="Search Tasks by Task ID"
                    mb="sm"
                    value={findingSearch}
                    onChange={(event) => setFindingSearch(event.currentTarget.value)}
                />
                <Accordion variant="separated" defaultValue={data?.length > 0 ? data[0]?.taskId : undefined}>
                    {filteredFindings?.map((task) => (
                        <Accordion.Item key={task?.taskId} value={task?.taskId}>
                            <Accordion.Control>
                                <Group>
                                    <IconAlertTriangle color="#4E66DE" />
                                    {task?.taskId}
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <ScrollArea h={400} scrollHideDelay={0}>
                                    <Box p="md">
                                    <SkillsDonutChart task={task} />
                                        {/* <Center mb="lg">
                                            <div style={{ width: 300, height: 300 }}>
                                                {task?.skills?.length ? (
                                                    <ReactApexChart
                                                        type="donut"
                                                        height={300}
                                                        width={300}
                                                        options={chartConfig}
                                                        labels={task?.skills?.map((skill: any) => skill?.name || "Unknown Skill")} // Ensure labels match series
                                                        series={task?.skills
                                                            ?.map((skill: any) => skill?.manHours?.avg)
                                                            ?.filter((val: any) => typeof val === "number" && !isNaN(val))} // Remove invalid values
                                                    />
                                                ) : (
                                                    <Text>No data available</Text>
                                                )}
                                            </div>
                                        </Center> */}

                                        {task?.skills?.map((skill: any) => (
                                            <Card key={skill.skill} shadow="0" p="sm" radius='md' mt="xs" bg='#f0f0f0'>
                                                <Text size="sm" fw={500}>{skill?.skill || "Unknown"}</Text>
                                                <Group justify="space-between">
                                                    <Text fz="xs" c="green" fw={700}>
                                                        Min {skill?.manHours?.min} Hr
                                                    </Text>
                                                    <Text fz="xs" c="yellow" fw={700}>
                                                        Avg {skill?.manHours?.avg} Hr
                                                    </Text>
                                                    <Text fz="xs" c="red" fw={700}>
                                                        Max {skill?.manHours?.max} Hr
                                                    </Text>
                                                </Group>
                                                <Progress.Root>
                                                    <Progress.Section value={skill?.manHours?.min * 100} color="green" />
                                                    <Progress.Section value={skill?.manHours?.avg * 100} color="yellow" />
                                                    <Progress.Section value={skill?.manHours?.max * 100} color="red" />
                                                </Progress.Root>
                                            </Card>
                                        ))}
                                    </Box>
                                </ScrollArea>
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
            </>
        );
    };

    return (
        <>
            <div style={{ paddingLeft: 150, paddingRight: 150, paddingTop: 20, paddingBottom: 20 }}>
                <SimpleGrid cols={2}>
                    <Card
                        withBorder
                        h='50vh'
                        radius='md'
                    >
                        <Group>
                            <Text size="md" fw={500}>
                                Select Document
                            </Text>
                            <DropZoneExcel
                                name="Excel Files"
                                changeHandler={handleTasks}
                                color="green" // Optional custom border color
                            />
                        </Group>
                    </Card>

                    <Card withBorder h='50vh' radius='md'>
                        <Group justify="space-between">
                            <LoadingOverlay
                                visible={isLoading}
                                zIndex={1000}
                                overlayProps={{ radius: 'sm', blur: 2 }}
                                loaderProps={{ color: 'indigo', type: 'bars' }}
                            />
                            <Group mb='xs' align="center" >
                                <Text size="md" fw={500}>
                                    Tasks Available
                                </Text>
                                {
                                    validatedTasks.length > 0 ? (
                                        <Badge ta='center' color="indigo" size="md" radius="lg">
                                            {validatedTasks?.filter((ele) => ele.status === true)?.length || 0}
                                        </Badge>
                                    ) : (
                                        <Badge variant="light" ta='center' color="indigo" size="md" radius="lg">
                                            0
                                        </Badge>
                                    )
                                }
                            </Group>
                            <Group mb='xs' align="center">
                                <Text size="md" fw={500}>
                                    Tasks Not-Available
                                </Text>
                                {
                                    validatedTasks?.length > 0 ? (
                                        <Badge ta='center' color="red" size="md" radius="lg">
                                            {validatedTasks?.filter((ele) => ele.status === false)?.length || 0}
                                        </Badge>
                                    ) : (
                                        <Badge variant="light" ta='center' color="red" size="md" radius="lg">
                                            0
                                        </Badge>
                                    )
                                }
                            </Group>
                        </Group>
                        <ScrollArea
                            style={{
                                flex: 1, // Take remaining space for scrollable area
                                overflow: "auto",
                            }}
                            offsetScrollbars
                            scrollHideDelay={1}
                        >
                            {validatedTasks?.length > 0 ? (
                                <SimpleGrid cols={4}>
                                    {validatedTasks?.map((task, index) => (
                                        <Badge
                                            key={index}
                                            color={task?.status === false ? "pink" : "blue"}
                                            variant="light"
                                            radius='sm'
                                            style={{ margin: "0.25em" }}
                                        >
                                            {task?.taskid}
                                        </Badge>
                                    ))}
                                </SimpleGrid>
                            ) : (
                                <Text ta='center' size="sm" c="dimmed">
                                    No tasks found. Please Select a file.
                                </Text>
                            )}
                        </ScrollArea>
                    </Card>
                </SimpleGrid>
                <Group justify="center" pt='sm' pb='sm'>
                    <Button
                        onClick={handleSubmit}
                        variant="gradient"
                        gradient={{ from: 'violet', to: 'blue', deg: 0 }}
                        // variant="filled"
                        // color='#1A237E'
                        disabled={tasks.length > 0 ? false : true}
                        leftSection={<MdLensBlur size={14} />}
                        rightSection={<IconMessage2Down size={14} />}
                        loading={loading}
                    >
                        Generate Skill Analytics
                    </Button>
                </Group>
                <Divider
                    variant="dashed"
                    labelPosition="center"
                    color={"gray"}
                    pb='sm'
                    pt='sm'
                    label={
                        <>
                            <Box ml={5}>Skill Analytics</Box>
                        </>
                    }
                />
                <SimpleGrid cols={4}>
                    <Card withBorder radius='md' bg='#e1e6f7'>
                        <Group gap='lg' justify="space-between">
                            <Flex direction='column'>
                                <Text fw={400} fz='sm' >
                                    Tasks
                                </Text>
                                <Text fw={600} fz='h2' >
                                    {skillAnalysisData?.skillAnalysis?.tasks?.length || 0}
                                </Text>
                            </Flex>
                            <IconCube color="#4E66DE" size='39' />
                        </Group>
                        <Text fw={500} fz='sm' c='dimmed'>
                            skills -{totalTaskSkills || 0}
                        </Text>
                    </Card>
                    <Card withBorder radius='md' bg='#d2fad4'>
                        <Group gap='lg' justify="space-between">
                            <Flex direction='column'>
                                <Text fw={400} fz='sm' >
                                    Tasks Avg Time
                                </Text>
                                <Text fw={600} fz='h2' >
                                    {totalAvgTimeTasks || 0} Hr
                                </Text>
                            </Flex>
                            <IconClock color="green" size='39' />
                        </Group>
                    </Card>

                    <Card withBorder radius='md' bg='#fcebf9'>
                        <Group gap='lg' justify="space-between">
                            <Flex direction='column'>
                                <Text fw={400} fz='sm' >
                                    Findings
                                </Text>
                                <Text fw={600} fz='h2' >
                                    {skillAnalysisData?.skillAnalysis?.findings?.length || 0}
                                </Text>
                            </Flex>
                            <IconAlertTriangle color="red" size='39' />
                        </Group>
                        <Text fw={500} fz='sm' c='dimmed'>
                            skills - {totalFindingSkills || 0}
                        </Text>
                    </Card>
                    <Card withBorder radius='md' bg='#FFEDE2'>
                        <Group gap='lg' justify="space-between">
                            <Flex direction='column'>
                                <Text fw={400} fz='sm' >
                                    Findings Avg Time
                                </Text>
                                <Text fw={600} fz='h2' >
                                    {totalAvgTimeFindings || 0} Hr
                                </Text>
                            </Flex>
                            <IconClock color="orange" size='39' />
                        </Group>
                    </Card>
                </SimpleGrid>
                <Space h='sm' />
                <SimpleGrid cols={2}>
                    <Card withBorder h='85vh' shadow="sm">
                        <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
                            <Text fw={600} size="lg" mb="sm">Tasks</Text>
                            <TaskAccordion data={skillAnalysisData?.skillAnalysis.tasks} />
                        </ScrollArea>
                    </Card>
                    <Card withBorder h='85vh' shadow="sm">
                        <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
                            <Text fw={600} size="lg" mb="sm">Findings</Text>
                            <FindingAccordion data={skillAnalysisData?.skillAnalysis.findings} />
                        </ScrollArea>
                    </Card>
                </SimpleGrid>
            </div>
        </>
    )
}