import { Card, Group, SimpleGrid, Title, Text, ScrollArea, Badge, Button, Divider, Box, Flex, Space, Accordion, Progress, TextInput, LoadingOverlay, Center } from "@mantine/core";
import { useMemo, useState } from "react";
import DropZoneExcel from "../components/fileDropZone";
import { MdLensBlur, MdOutlineArrowForward } from "react-icons/md";
import { IconAlertTriangle, IconClock, IconCube, IconMessage2Down } from "@tabler/icons-react";
import ReactApexChart from "react-apexcharts";
import { useApi } from "../api/services/estimateSrvice";
import { useApiSkillAnalysis } from "../api/services/skillsService";
import { showNotification } from "@mantine/notifications";
import { ApexOptions } from 'apexcharts';
import SkillsDonutChart from "../components/skillsDonut";
import RFQUploadDropZoneExcel from "../components/rfqUploadDropzone";
import { SkillsFindingsDonutChart, SkillsTasksDonutChart } from "../components/skillwiseTasksDonut";
import { showAppNotification } from "../components/showNotificationGlobally";
import { DonutChart } from "@mantine/charts";

export default function SkillRequirement() {
    const { validateTasks } = useApi();
    const { getSkillAnalysis } = useApiSkillAnalysis();

    const [tasks, setTasks] = useState<string[]>([]);
    const [validatedTasks, setValidatedTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loading, setLoading] = useState(false); // Add loading state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    // const [extractedTasks, setExtractedTasks] = useState<string[]>([]);
    const [skillAnalysisData, setSkillAnalysisData] = useState<any>(null);



    // Handle file and extracted tasks
    const handleFileChange = async (file: File | null, tasks: string[]) => {
        setSelectedFile(file);
        setTasks(tasks ?? []); // Ensure tasks is always an array
        console.log("✅ Selected File:", file ? file.name : "None");
        console.log("📌 Extracted Tasks:", tasks.length > 0 ? tasks : "No tasks found");


        console.log("Extracted Tasks:", tasks);
        const response = await validateTasks(tasks);
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
            // showAppNotification("warning", "Tasks Not Available!", invalidTasks.length + "tasks are not available. Only valid tasks will be used to Skill Analysis.");
        }

    };

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
            showAppNotification("warning", "No Tasks  Found!", "Tasks are required");
            return;
        }

        if (validTasks.length === 0) {
            showAppNotification("warning", "No Valid Tasks!", "No valid tasks available to estimate the report.");
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
                processDonutData(response?.skillAnalysis);
                showAppNotification("success", "Skill analysis!", "Successfully Generated Skill Analysis");
            }
        } catch (error) {
            showAppNotification("error", "Failed!", "Failed Generating, try agian");
            console.error("API Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const [donutData, setDonutData] = useState<any>([]);
    const processDonutData = (data:any) => {
        const chartData :any = [];

        // Iterate through tasks to gather skills and their average man-hours
        data?.tasks?.forEach((task:any) => {
            task?.skills?.forEach((skill:any) => {
                if (skill?.skill) {
                    const avgManHours = skill?.manHours?.avg || 0;
                    chartData?.push({
                        name: `${skill?.skill}`, // Combine task description and skill
                        value: avgManHours,
                        // color: getColorForSkill(skill.skill), // Function to get color based on skill
                    });
                }
            });
        });

        // Add findings to the chart data
        data?.findings?.forEach((finding:any) => {
            finding?.skills?.forEach((skill:any) => {
                if (skill?.skill) {
                    const avgManHours = skill?.manHours?.avg || 0;
                    chartData?.push({
                        name: `Finding - ${skill?.skill}`, // Label for findings
                        value: avgManHours,
                        // color: 'red', // You can customize colors for findings
                    });
                }
            });
        });

        setDonutData(chartData);
    };

    // Function to assign colors based on skill
    // const getColorForSkill = (skill) => {
    //     const skillColors = {
    //         'B1': 'indigo.6',
    //         // Add more skills and their corresponding colors here
    //         // 'B2': 'orange.6',
    //         // 'B3': 'green.6',
    //     };
    //     return skillColors[skill] || 'gray'; // Default color if skill not found
    // };



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
    // const chartConfig: ApexOptions = {
    //     chart: {
    //         background: 'transparent',
    //         type: 'donut',
    //     },
    //     title: {
    //         text: 'Skill Distribution',
    //         align: 'center',
    //         style: {
    //             fontSize: '16px',
    //             fontWeight: 500,
    //         },
    //     },
    //     plotOptions: {
    //         pie: {
    //             donut: {
    //                 size: '65%',
    //                 labels: {
    //                     show: true,
    //                     value: {
    //                         show: true,
    //                         fontSize: '16px',
    //                         fontWeight: 600,
    //                         formatter: (val: any) => `${val?.toFixed(1)}%`,
    //                     },
    //                     total: {
    //                         show: true,
    //                         fontSize: '16px',
    //                         fontWeight: 600,
    //                         formatter: (w: any) => {
    //                             const total = w?.globals?.seriesTotals?.reduce((a: number, b: number) => a + b, 0);
    //                             return `${total?.toFixed(1)} hrs`;
    //                         },
    //                     },
    //                 },
    //             },
    //         },
    //     },
    //     dataLabels: {
    //         enabled: true,
    //         formatter: (val: number) => `${val?.toFixed(1)}%`,
    //         style: {
    //             fontSize: '14px',
    //             fontWeight: 600,
    //         },
    //     },
    //     legend: {
    //         position: 'bottom',
    //         fontSize: '14px',
    //     },
    //     stroke: {
    //         width: 0,
    //     },
    //     tooltip: {
    //         enabled: true,
    //         y: {
    //             formatter: (val: number) => `${val?.toFixed(1)} hrs`,
    //         },
    //     },
    // };


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
                                        {/* <DonutChart
                    withLabelsLine
                    withLabels
                    withTooltip
                    labelsType="percent"
                    size={182}
                    thickness={30}
                    data={donutData}
                /> */}
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

    const SkillTaskAccordion = ({ data }: any) => {
        const [skillSearch, setSkillSearch] = useState("");

        const skillBasedTasks = useMemo(() => {
            const skillMap = new Map();

            data?.forEach((task: any) => {
                task?.skills?.forEach((skillData: any) => {
                    // Handle undefined or empty skill names
                    const skillName = skillData?.skill?.trim() || "Unknown";
                    if (!skillMap?.has(skillName)) {
                        skillMap?.set(skillName, []);
                    }
                    skillMap.get(skillName).push({
                        taskId: task?.taskId || "Unknown Task ID",
                        taskDescription: task?.taskDescription || "No description available",
                        manHours: skillData?.manHours || { min: 0, avg: 0, max: 0 }
                    });
                });
            });

            return Array.from(skillMap?.entries())?.map(([skill, tasks]) => ({
                skill,
                tasks,
                totalMinHours: tasks?.reduce((sum: number, finding: any) => sum + (finding?.manHours?.min || 0), 0),
                totalAvgHours: tasks?.reduce((sum: number, finding: any) => sum + (finding?.manHours?.avg || 0), 0),
                totalMaxHours: tasks?.reduce((sum: number, finding: any) => sum + (finding?.manHours?.max || 0), 0)
            }));
        }, [data]);

        const filteredSkills = skillBasedTasks?.filter(item =>
            item?.skill?.toLowerCase().includes(skillSearch?.toLowerCase())
        );

        return (
            <>
                <TextInput
                    placeholder="Search by Skill Name"
                    mb="sm"
                    value={skillSearch}
                    onChange={(event) => setSkillSearch(event.currentTarget.value)}
                />
                {/* defaultValue={filteredSkills?.length > 0 ? filteredSkills[0]?.skill : undefined} */}
                <Accordion variant="separated" >
                    {filteredSkills?.map((skillGroup) => (
                        <Accordion.Item key={skillGroup?.skill} value={skillGroup?.skill}>
                            <Accordion.Control>
                                <Group>
                                    <IconCube color="#4E66DE" />
                                    <div>
                                        <Group >
                                            <Text>{skillGroup?.skill}</Text>
                                            <Text size="sm" c="dimmed">
                                                {skillGroup?.tasks?.length} tasks
                                            </Text>
                                        </Group>

                                    
                                        <Group justify="space-between">
              
                                        <Group gap='5' align="center">
                                        <Text size="sm" c="dimmed">
                                                Min : 
                                            </Text>
                                            <Text size="sm" fw='bold' c='green'>
                                               {skillGroup?.totalMinHours?.toFixed(2)} Hr
                                            </Text>
                                        </Group>
                                        <Group gap='5' align="center">
                                        <Text size="sm" c="dimmed">
                                        Avg : 
                                            </Text>
                                            <Text size="sm" fw='bold' c='yellow'>
                                               {skillGroup?.totalAvgHours?.toFixed(2)} Hr
                                            </Text>
                                        </Group>
                                        <Group gap='5' align="center">
                                        <Text size="sm" c="dimmed">
                                        Max : 
                                            </Text>
                                            <Text size="sm" fw='bold' c='red'>
                                               {skillGroup?.totalMaxHours?.toFixed(2)} Hr
                                            </Text>
                                        </Group>
                                            {/* <Text size="sm" c="dimmed">
                                                Min : {skillGroup?.totalMinHours?.toFixed(2)} h
                                            </Text> */}
                                            {/* <Text size="sm" c="dimmed">
                                                Avg : {skillGroup?.totalAvgHours?.toFixed(2)} h
                                            </Text> */}
                                            {/* <Text size="sm" c="dimmed">
                                                Max : {skillGroup?.totalMaxHours?.toFixed(2)} h
                                            </Text> */}
                                        </Group>

                                    </div>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <ScrollArea h={400} scrollHideDelay={0}>
                                    <Box p="md">
                                        {/* <SkillsTasksDonutChart skillGroup={skillGroup} /> */}
                                        {skillGroup.tasks.map((task: any) => (
                                            <Card key={task.taskId} shadow="0" p="sm" radius='md' mt="xs" bg='#f0f0f0'>
                                                <Text size="sm" fw={500}>{task.taskId}</Text>
                                                <Text size="xs" c="dimmed" mb="xs">{task.taskDescription}</Text>
                                                <Group justify="space-between">
                                                    <Text fz="xs" c="green" fw={700}>
                                                        Min {task.manHours.min} Hr
                                                    </Text>
                                                    <Text fz="xs" c="yellow" fw={700}>
                                                        Avg {task.manHours.avg} Hr
                                                    </Text>
                                                    <Text fz="xs" c="red" fw={700}>
                                                        Max {task.manHours.max} Hr
                                                    </Text>
                                                </Group>
                                                <Progress.Root>
                                                    <Progress.Section value={task.manHours.min * 100} color="green" />
                                                    <Progress.Section value={task.manHours.avg * 100} color="yellow" />
                                                    <Progress.Section value={task.manHours.max * 100} color="red" />
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

    const SkillFindingAccordion = ({ data }: any) => {
        const [skillSearch, setSkillSearch] = useState("");

        const skillBasedFindings = useMemo(() => {
            const skillMap = new Map();

            data?.forEach((finding: any) => {
                finding?.skills?.forEach((skillData: any) => {
                    // Handle undefined or empty skill names
                    const skillName = skillData?.skill?.trim() || "Unknown";
                    if (!skillMap?.has(skillName)) {
                        skillMap?.set(skillName, []);
                    }
                    skillMap.get(skillName).push({
                        taskId: finding?.taskId || "Unknown Task ID",
                        manHours: skillData?.manHours || { min: 0, avg: 0, max: 0 }
                    });
                });
            });

            return Array.from(skillMap?.entries())?.map(([skill, findings]) => ({
                skill,
                findings,
                totalMinHours: findings?.reduce((sum: number, finding: any) => sum + (finding?.manHours?.min || 0), 0),
                totalAvgHours: findings?.reduce((sum: number, finding: any) => sum + (finding?.manHours?.avg || 0), 0),
                totalMaxHours: findings?.reduce((sum: number, finding: any) => sum + (finding?.manHours?.max || 0), 0)
            }));
        }, [data]);

        const filteredSkills = skillBasedFindings?.filter(item =>
            item?.skill?.toLowerCase().includes(skillSearch?.toLowerCase())
        );

        return (
            <>
                <TextInput
                    placeholder="Search by Skill Name"
                    mb="sm"
                    value={skillSearch}
                    onChange={(event) => setSkillSearch(event.currentTarget.value)}
                />
                {/* defaultValue={filteredSkills?.length > 0 ? filteredSkills[0]?.skill : undefined}     */}
                <Accordion variant="separated" >
                    {filteredSkills?.map((skillGroup) => (
                        <Accordion.Item key={skillGroup?.skill} value={skillGroup.skill}>
                            <Accordion.Control>
                                <Group>
                                    <IconAlertTriangle color="#4E66DE" />
                                    {/* <div>
                                        <Group justify="space-between">
                                            <Text>{skillGroup?.skill}</Text>
                                            <Text size="sm" c="dimmed">
                                                {skillGroup?.findings?.length} findings
                                            </Text>
                                        </Group>
                                        <Group justify="space-between">
                                            <Text size="sm" c="dimmed">
                                                Min : {skillGroup?.totalMinHours}h
                                            </Text>
                                            <Text size="sm" c="dimmed">
                                                Avg : {skillGroup?.totalAvgHours}h
                                            </Text>
                                            <Text size="sm" c="dimmed">
                                                Max : {skillGroup?.totalMaxHours}h
                                            </Text>
                                        </Group>

                                    </div> */}

<div>
                                        <Group >
                                            <Text>{skillGroup?.skill}</Text>
                                            <Text size="sm" c="dimmed">
                                                {skillGroup?.findings?.length} tasks
                                            </Text>
                                        </Group>

                                        <Group justify="space-between">
              
                                        <Group gap='5' align="center">
                                        <Text size="sm" c="dimmed">
                                                Min : 
                                            </Text>
                                            <Text size="sm" fw='bold' c='green'>
                                               {skillGroup?.totalMinHours?.toFixed(2)} Hr
                                            </Text>
                                        </Group>
                                        <Group gap='5' align="center">
                                        <Text size="sm" c="dimmed">
                                        Avg : 
                                            </Text>
                                            <Text size="sm" fw='bold' c='yellow'>
                                               {skillGroup?.totalAvgHours?.toFixed(2)} Hr
                                            </Text>
                                        </Group>
                                        <Group gap='5' align="center">
                                        <Text size="sm" c="dimmed">
                                        Max : 
                                            </Text>
                                            <Text size="sm" fw='bold' c='red'>
                                               {skillGroup?.totalMaxHours?.toFixed(2)} Hr
                                            </Text>
                                        </Group>
                                        </Group>

                                    </div>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <ScrollArea h={400} scrollHideDelay={0}>
                                    <Box p="md">
                                        {/* <SkillsFindingsDonutChart skillGroup={skillGroup} /> */}
                                        {skillGroup?.findings?.map((finding: any) => (
                                            <Card key={finding?.taskId} shadow="0" p="sm" radius='md' mt="xs" bg='#f0f0f0'>
                                                <Text size="sm" fw={500}>{finding?.taskId || "-"}</Text>
                                                <Group justify="space-between">
                                                    <Text fz="xs" c="green" fw={700}>
                                                        Min {finding?.manHours?.min} Hr
                                                    </Text>
                                                    <Text fz="xs" c="yellow" fw={700}>
                                                        Avg {finding?.manHours?.avg} Hr
                                                    </Text>
                                                    <Text fz="xs" c="red" fw={700}>
                                                        Max {finding?.manHours?.max} Hr
                                                    </Text>
                                                </Group>
                                                <Progress.Root>
                                                    <Progress.Section value={finding?.manHours?.min * 100} color="green" />
                                                    <Progress.Section value={finding?.manHours?.avg * 100} color="yellow" />
                                                    <Progress.Section value={finding?.manHours?.max * 100} color="red" />
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
                            {/* <DropZoneExcel
                                name="Excel Files"
                                changeHandler={handleTasks}
                                color="green" // Optional custom border color
                            /> */}
                            <RFQUploadDropZoneExcel
                                name="Excel Files"
                                changeHandler={handleFileChange}
                                selectedFile={selectedFile} // Pass selectedFile as prop
                                setSelectedFile={setSelectedFile} // Pass setSelectedFile as prop
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
                                        <Badge ta='center' color="green" size="md" radius="lg">
                                            {validatedTasks?.filter((ele) => ele.status === true)?.length || 0}
                                        </Badge>
                                    ) : (
                                        <Badge variant="light" ta='center' color="green" size="md" radius="lg">
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
                                        <Badge ta='center' color="blue" size="md" radius="lg">
                                            {validatedTasks?.filter((ele) => ele.status === false)?.length || 0}
                                        </Badge>
                                    ) : (
                                        <Badge variant="light" ta='center' color="blue" size="md" radius="lg">
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
                                            color={task?.status === false ? "blue" : "green"}
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
                    <Card withBorder className="h-screen">
                        <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
                            <Text className="font-semibold text-lg mb-4">Skill - MPD</Text>
                            <SkillTaskAccordion data={skillAnalysisData?.skillAnalysis.tasks} />
                        </ScrollArea>
                    </Card>
                    <Card withBorder className="h-screen">
                        <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
                            <Text className="font-semibold text-lg mb-4">Skill - Findings</Text>
                            <SkillFindingAccordion data={skillAnalysisData?.skillAnalysis.findings} />
                        </ScrollArea>
                    </Card>
                </SimpleGrid>
                <Space h='sm' />
                <SimpleGrid cols={2}>
                    <Card withBorder h='85vh' shadow="sm">
                        <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
                            <Text fw={600} size="lg" mb="sm">MPD</Text>
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