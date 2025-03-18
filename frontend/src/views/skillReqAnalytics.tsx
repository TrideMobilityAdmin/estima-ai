import { useState, useMemo, useEffect, useRef } from "react";
import { Card, Group, SimpleGrid, Text, ScrollArea, Progress, Box, Flex, Space, Accordion, TextInput, Center } from "@mantine/core";
import { IconAlertTriangle, IconClock, IconCube } from "@tabler/icons-react";
import SkillsDonutChart from "../components/skillsDonut"; // Assuming this is your chart component

const SkillRequirementAnalytics = ({ skillAnalysisData } : any) => {
    const [opened, setOpened] = useState<any>([]); 
     // Track previous data to detect refreshes
  const [prevData, setPrevData] = useState(skillAnalysisData);
    // Function to handle accordion toggle
    const handleAccordionChange = (value:any) => {
        setOpened((prevOpened : any) => {
            if (prevOpened.includes(value)) {
                return prevOpened.filter((item : any) => item !== value); // Close the accordion
            } else {
                return [...prevOpened, value]; // Open the accordion
            }
        });
    };

    const [findingsOpened, setFindingsOpened] = useState<any>([]); 
     // Track previous data to detect refreshes
  const [findingsprevData, setFindingsPrevData] = useState(skillAnalysisData);
    // Function to handle accordion toggle
    const handleAccordionChangeFindings = (value:any) => {
        setFindingsOpened((prevOpened : any) => {
            if (prevOpened.includes(value)) {
                return prevOpened.filter((item : any) => item !== value); // Close the accordion
            } else {
                return [...prevOpened, value]; // Open the accordion
            }
        });
    };

    const totalTaskSkills = skillAnalysisData?.skillAnalysis?.tasks?.reduce((acc : any, task :any) => acc + task?.skills?.length, 0);
    const totalFindingSkills = skillAnalysisData?.skillAnalysis?.findings?.reduce((acc : any, finding : any) => acc + finding?.skills?.length, 0);

    const calculateTotalAvgTime = (items : any) => {
        return items?.reduce((total : any, item : any) => {
            return total + item?.skills?.reduce((sum : any, skill : any) => sum + skill?.manHours?.avg, 0);
        }, 0);
    };

    const totalAvgTimeTasks = Math.round(calculateTotalAvgTime(skillAnalysisData?.skillAnalysis?.tasks) || 0);
    const totalAvgTimeFindings = Math.round(calculateTotalAvgTime(skillAnalysisData?.skillAnalysis?.findings) || 0);

    const [donutData, setDonutData] = useState([]);

    useEffect(()=>{
        processDonutData(skillAnalysisData);
    },[skillAnalysisData])

    const processDonutData = (data : any) => {
        const chartData : any = [];

        // Iterate through tasks to gather skills and their average man-hours
        data?.tasks?.forEach((task : any) => {
            task?.skills?.forEach((skill : any) => {
                if (skill?.skill) {
                    const avgManHours = skill?.manHours?.avg || 0;
                    chartData.push({
                        name: `${skill?.skill}`,
                        value: avgManHours,
                    });
                }
            });
        });

        // Add findings to the chart data
        data?.findings?.forEach((finding : any) => {
            finding?.skills?.forEach((skill : any) => {
                if (skill?.skill) {
                    const avgManHours = skill?.manHours?.avg || 0;
                    chartData.push({
                        name: `Finding - ${skill?.skill}`,
                        value: avgManHours,
                    });
                }
            });
        });

        setDonutData(chartData);
    };

    const TaskAccordion = ({ data } : any) => {
        const [taskSearch, setTaskSearch] = useState("");
        const filteredTasks = data?.filter((task : any) =>
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
                <Accordion variant="separated" value={opened} onChange={setOpened}>
                    {filteredTasks?.map((task : any) => (
                        <Accordion.Item key={task.taskId} value={task.taskId}>
                            <Accordion.Control  onClick={() => handleAccordionChange(task.taskId)}>
                                <Group>
                                    <IconCube color="#4E66DE" />
                                    {task.taskId}
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <ScrollArea h={400} scrollHideDelay={0}>
                                    <Box p="md">
                                        <SkillsDonutChart task={task} />
                                        {task?.skills?.map((skill : any) => (
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

    const FindingAccordion = ({ data } : any) => {
        const [findingSearch, setFindingSearch] = useState("");
        const filteredFindings = data?.filter((finding : any) =>
            finding.taskId.toLowerCase().includes(findingSearch.toLowerCase())
        );

        return (
            <>
                <TextInput
                    placeholder="Search Findings by Task ID"
                    mb="sm"
                    value={findingSearch}
                    onChange={(event) => setFindingSearch(event.currentTarget.value)}
                />
                <Accordion variant="separated" value={findingsOpened} onChange={setFindingsOpened}>
                    {filteredFindings?.map((finding : any) => (
                        <Accordion.Item key={finding?.taskId} value={finding?.taskId}>
                            <Accordion.Control onClick={() => handleAccordionChangeFindings(finding?.taskId)}>
                                <Group>
                                    <IconAlertTriangle color="#4E66DE" />
                                    {finding?.taskId}
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <ScrollArea h={400} scrollHideDelay={0}>
                                    <Box p="md">
                                        <SkillsDonutChart task={finding} />
                                        {finding?.skills?.map((skill : any) => (
                                            <Card key={skill.skill} shadow="0" p="sm" radius='md' mt="xs" bg='#f0f0f0'>
                                                <Text size="sm" fw={500}>{skill?.skill || "Unknown Skill"}</Text>
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

    const SkillTaskAccordion = ({ data } : any) => {
        const [skillSearch, setSkillSearch] = useState("");
        const [opened, setOpened] = useState<string | null>(null);
    
        const handleAccordionChange = (value: string | null) => {
            setOpened(value);
        };
    
        const skillBasedTasks = useMemo(() => {
            // Create a map to group tasks by skill
            const skillMap = new Map();
    
            // Handle null or empty data
            if (!data || data.length === 0) return [];
    
            // Process each task
            data.forEach((task : any) => {
                // Handle tasks with no skills
                if (!task.skills || task.skills.length === 0) return;
    
                // Process each skill in the task
                task.skills.forEach((skillData : any) => {
                    // Handle null skill name by assigning "Unknown Skill"
                    const skillName = skillData?.skill?.trim() || "Unknown Skill";
                    
                    // Create array for this skill if it doesn't exist
                    if (!skillMap.has(skillName)) {
                        skillMap.set(skillName, []);
                    }
                    
                    // Add this task to the skill's array
                    skillMap.get(skillName).push({
                        taskId: task.taskId || "Unknown Task",
                        taskDescription: task.taskDescription || "No description",
                        manHours: skillData.manHours || { min: 0, avg: 0, max: 0 }
                    });
                });
            });
    
            // Convert the map to an array of skill groups with calculated totals
            return Array.from(skillMap.entries()).map(([skill, tasks]) => {
                // Calculate total hours for this skill group
                const totalMinHours = tasks.reduce((sum : any, task : any) => sum + (task.manHours.min || 0), 0);
                const totalAvgHours = tasks.reduce((sum : any, task : any) => sum + (task.manHours.avg || 0), 0);
                const totalMaxHours = tasks.reduce((sum : any, task : any) => sum + (task.manHours.max || 0), 0);
    
                return {
                    skill,
                    tasks,
                    totalMinHours,
                    totalAvgHours,
                    totalMaxHours
                };
            });
        }, [data]);
    
        // Filter skills based on search term
        const filteredSkills = skillBasedTasks.filter(item =>
            item.skill.toLowerCase().includes(skillSearch.toLowerCase())
        );
    
        return (
            <>
                <TextInput
                    placeholder="Search by Skill Name"
                    mb="sm"
                    value={skillSearch}
                    onChange={(event) => setSkillSearch(event.currentTarget.value)}
                />
                <Accordion variant="separated" value={opened} onChange={setOpened}>
                    {filteredSkills.map((skillGroup) => (
                        <Accordion.Item key={skillGroup.skill} value={skillGroup.skill}>
                            <Accordion.Control onClick={() => handleAccordionChange(skillGroup.skill)}>
                                <Group>
                                    <IconCube color="#4E66DE" />
                                    <div>
                                        <Group>
                                            <Text>{skillGroup.skill}</Text>
                                            <Text size="sm" c="dimmed">
                                                {skillGroup.tasks.length} tasks
                                            </Text>
                                        </Group>
                                        <Group justify="space-between">
                                            <Text size="sm" c="dimmed">Min: {skillGroup.totalMinHours.toFixed(2)} Hr</Text>
                                            <Text size="sm" c="dimmed">Avg: {skillGroup.totalAvgHours.toFixed(2)} Hr</Text>
                                            <Text size="sm" c="dimmed">Max: {skillGroup.totalMaxHours.toFixed(2)} Hr</Text>
                                        </Group>
                                    </div>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <ScrollArea 
                                    h={400} 
                                    scrollHideDelay={0}
                                >
                                    <Box p="md">
                                        {skillGroup.tasks.map((task : any) => (
                                            <Card key={task.taskId} shadow="0" p="sm" radius="md" mt="xs" bg="#f0f0f0">
                                                <Text size="sm" fw={500}>{task.taskId}</Text>
                                                <Text size="xs" c="dimmed" mb="xs">{task.taskDescription}</Text>
                                                <Group justify="space-between">
                                                    <Text fz="xs" c="green" fw={700}>Min {task.manHours.min} Hr</Text>
                                                    <Text fz="xs" c="yellow" fw={700}>Avg {task.manHours.avg} Hr</Text>
                                                    <Text fz="xs" c="red" fw={700}>Max {task.manHours.max} Hr</Text>
                                                </Group>
                                                <Progress.Root size="xs" mt="xs">
                                                    <Progress.Section value={(task.manHours.min / (task.manHours.max || 1)) * 100} color="green" />
                                                    <Progress.Section value={((task.manHours.avg - task.manHours.min) / (task.manHours.max || 1)) * 100} color="yellow" />
                                                    <Progress.Section value={((task.manHours.max - task.manHours.avg) / (task.manHours.max || 1)) * 100} color="red" />
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

    const SkillFindingAccordion = ({ data } : any) => {
        const [skillSearch, setSkillSearch] = useState("");
        const [findingsOpened, setFindingsOpened] = useState<string | null>(null);
    
        const handleAccordionChangeFindings = (value : any) => {
            setFindingsOpened(value);
        };
    
        const skillBasedFindings = useMemo(() => {
            // Create a map to group findings by skill
            const skillMap = new Map();
    
            // Handle null or empty data
            if (!data || data.length === 0) return [];
    
            // Process each finding
            data.forEach((finding : any) => {
                // Handle findings with no skills
                if (!finding.skills || finding.skills.length === 0) return;
    
                // Process each skill in the finding
                finding.skills.forEach((skillData : any) => {
                    // Handle null skill name by assigning "Unknown Skill"
                    const skillName = skillData?.skill?.trim() || "Unknown Skill";
                    
                    // Create array for this skill if it doesn't exist
                    if (!skillMap.has(skillName)) {
                        skillMap.set(skillName, []);
                    }
                    
                    // Add this finding to the skill's array
                    skillMap.get(skillName).push({
                        taskId: finding.taskId || "Unknown Task ID",
                        manHours: skillData.manHours || { min: 0, avg: 0, max: 0 }
                    });
                });
            });
    
            // Convert the map to an array of skill groups with calculated totals
            return Array.from(skillMap.entries()).map(([skill, findings]) => {
                // Calculate total hours for this skill group
                const totalMinHours = findings.reduce((sum : any, finding : any) => sum + (finding.manHours.min || 0), 0);
                const totalAvgHours = findings.reduce((sum : any, finding : any) => sum + (finding.manHours.avg || 0), 0);
                const totalMaxHours = findings.reduce((sum : any, finding : any) => sum + (finding.manHours.max || 0), 0);
    
                return {
                    skill,
                    findings,
                    totalMinHours,
                    totalAvgHours,
                    totalMaxHours
                };
            });
        }, [data]);
    
        // Filter skills based on search term
        const filteredSkills = skillBasedFindings.filter(item =>
            item.skill.toLowerCase().includes(skillSearch.toLowerCase())
        );
    
        return (
            <>
                <TextInput
                    placeholder="Search by Skill Name"
                    mb="sm"
                    value={skillSearch}
                    onChange={(event) => setSkillSearch(event.currentTarget.value)}
                />
                <Accordion variant="separated" value={findingsOpened} onChange={setFindingsOpened}>
                    {filteredSkills.map((skillGroup) => (
                        <Accordion.Item key={skillGroup.skill} value={skillGroup.skill}>
                            <Accordion.Control onClick={() => handleAccordionChangeFindings(skillGroup.skill)}>
                                <Group>
                                    <IconAlertTriangle color="#4E66DE" />
                                    <div>
                                        <Group>
                                            <Text>{skillGroup.skill}</Text>
                                            <Text size="sm" c="dimmed">{skillGroup.findings.length} findings</Text>
                                        </Group>
                                        <Group justify="space-between">
                                            <Text size="sm" c="dimmed">Min: {skillGroup.totalMinHours.toFixed(2)} Hr</Text>
                                            <Text size="sm" c="dimmed">Avg: {skillGroup.totalAvgHours.toFixed(2)} Hr</Text>
                                            <Text size="sm" c="dimmed">Max: {skillGroup.totalMaxHours.toFixed(2)} Hr</Text>
                                        </Group>
                                    </div>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <ScrollArea h={400} scrollHideDelay={0}>
                                    <Box p="md">
                                        {skillGroup.findings.map((finding : any) => (
                                            <Card key={finding.taskId} shadow="0" p="sm" radius="md" mt="xs" bg="#f0f0f0">
                                                <Text size="sm" fw={500}>{finding.taskId || "-"}</Text>
                                                <Group justify="space-between">
                                                    <Text fz="xs" c="green" fw={700}>Min {finding.manHours.min} Hr</Text>
                                                    <Text fz="xs" c="yellow" fw={700}>Avg {finding.manHours.avg} Hr</Text>
                                                    <Text fz="xs" c="red" fw={700}>Max {finding.manHours.max} Hr</Text>
                                                </Group>
                                                <Progress.Root size="xs" mt="xs">
                                                    <Progress.Section value={(finding.manHours.min / (finding.manHours.max || 1)) * 100} color="green" />
                                                    <Progress.Section value={((finding.manHours.avg - finding.manHours.min) / (finding.manHours.max || 1)) * 100} color="yellow" />
                                                    <Progress.Section value={((finding.manHours.max - finding.manHours.avg) / (finding.manHours.max || 1)) * 100} color="red" />
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
            <SimpleGrid cols={4} pt={10}>
                <Card withBorder radius='md' bg='#e1e6f7'>
                    <Group gap='lg' justify="space-between">
                        <Flex direction='column'>
                            <Text fw={400} fz='sm'>Source Tasks</Text>
                            <Text fw={600} fz='h2'>{skillAnalysisData?.skillAnalysis?.tasks?.length || 0}</Text>
                        </Flex>
                        <IconCube color="#4E66DE" size='39' />
                    </Group>
                    {/* <Text fw={500} fz='sm' c='dimmed'>skills - {totalTaskSkills || 0}</Text> */}
                </Card>
                <Card withBorder radius='md' bg='#d2fad4'>
                    <Group gap='lg' justify="space-between">
                        <Flex direction='column'>
                            <Text fw={400} fz='sm'>Tasks Avg Time</Text>
                            <Text fw={600} fz='h2'>{totalAvgTimeTasks || 0} Hr</Text>
                        </Flex>
                        <IconClock color="green" size='39' />
                    </Group>
                </Card>
                <Card withBorder radius='md' bg='#fcebf9'>
                    <Group gap='lg' justify="space-between">
                        <Flex direction='column'>
                            <Text fw={400} fz='sm'>Findings</Text>
                            <Text fw={600} fz='h2'>{skillAnalysisData?.skillAnalysis?.findings?.length || 0}</Text>
                        </Flex>
                        <IconAlertTriangle color="red" size='39' />
                    </Group>
                    {/* <Text fw={500} fz='sm' c='dimmed'>skills - {totalFindingSkills || 0}</Text> */}
                </Card>
                <Card withBorder radius='md' bg='#FFEDE2'>
                    <Group gap='lg' justify="space-between">
                        <Flex direction='column'>
                            <Text fw={400} fz='sm'>Findings Avg Time</Text>
                            <Text fw={600} fz='h2'>{totalAvgTimeFindings || 0} Hr</Text>
                        </Flex>
                        <IconClock color="orange" size='39' />
                    </Group>
                </Card>
            </SimpleGrid>
            <Space h='sm' />
            <SimpleGrid cols={2}>
                <Card withBorder h={skillAnalysisData !== null ? '85vh' : '40vh'} shadow="sm">
                    <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
                        <Text fw={600} size="lg" mb="sm">Skill - Tasks</Text>
                        <SkillTaskAccordion data={skillAnalysisData?.skillAnalysis?.tasks} />
                        {
                        skillAnalysisData === null ? (
                            <Center>
                            <Text>No Data Found </Text>
                            </Center>
                        ) : (
                            <></>
                        )
                    }
                    </ScrollArea>
                </Card>
                <Card withBorder h={skillAnalysisData !== null ? '85vh' : '40vh'} shadow="sm">
                    <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
                        <Text fw={600} size="lg" mb="sm">Skill - Findings</Text>
                        <SkillFindingAccordion data={skillAnalysisData?.skillAnalysis?.findings} />
                        {
                        skillAnalysisData === null ? (
                            <Center>
                            <Text>No Data Found </Text>
                            </Center>
                        ) : (
                            <></>
                        )
                    }
                    </ScrollArea>
                </Card>
            </SimpleGrid>
            
            <Space h='sm' />
            <SimpleGrid cols={2}>
                <Card withBorder h={skillAnalysisData !== null ? '85vh' : '40vh'} shadow="sm">
                    <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
                        <Text fw={600} size="lg" mb="sm">MPD</Text>
                        <TaskAccordion data={skillAnalysisData?.skillAnalysis?.tasks} />
                        {
                        skillAnalysisData === null ? (
                            <Center>
                            <Text>No Data Found </Text>
                            </Center>
                        ) : (
                            <></>
                        )
                    }
                    </ScrollArea>
                    
                </Card>
                <Card withBorder h={skillAnalysisData !== null ? '85vh' : '40vh'} shadow="sm">
                    <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
                        <Text fw={600} size="lg" mb="sm">Findings</Text>
                        <FindingAccordion data={skillAnalysisData?.skillAnalysis?.findings} />
                        {
                        skillAnalysisData === null ? (
                            <Center>
                            <Text>No Data Found </Text>
                            </Center>
                        ) : (
                            <></>
                        )
                    }
                    </ScrollArea>
                </Card>
            </SimpleGrid>
            
            
        </>
    );
};

export default SkillRequirementAnalytics;