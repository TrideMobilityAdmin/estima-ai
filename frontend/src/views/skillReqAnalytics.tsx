import { useState, useMemo, useEffect, useRef } from "react";
import { Card, Group, SimpleGrid, Text, ScrollArea, Progress, Box, Flex, Space, Accordion, TextInput, Center, Pagination } from "@mantine/core";
import { IconAlertTriangle, IconClock, IconClockCode, IconClockDown, IconClockUp, IconCube } from "@tabler/icons-react";
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

        const [currentPage, setCurrentPage] = useState(1);
        const itemsPerPage = 6;

        const totalPages = Math.ceil(filteredTasks?.length / itemsPerPage);
        const paginatedTasks = filteredTasks?.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );

        return (
            <>
            <Card withBorder h="85vh" shadow="sm" p="md" radius="md">
                {/* Top Section: Heading & Search Input */}
            <Box mb="md">
              <Text fw={600} size="lg" mb="sm">
                MPD
              </Text>
              <TextInput
                    placeholder="Search Tasks by Task ID"
                    mb="sm"
                    value={taskSearch}
                    onChange={(event) => {
                        setTaskSearch(event.currentTarget.value);
                        setCurrentPage(1); // Reset pagination on search
                    }}
                />
            </Box>

            {/* Middle Section: Scrollable Accordion List */}
            <ScrollArea h="65vh" scrollbarSize={0}>
                {
                    paginatedTasks?.length > 0 ? (
                        <Accordion variant="separated" value={opened} onChange={setOpened}>
                             {paginatedTasks?.map((task : any) => (
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
                                                        Est {skill?.manHours.avg} Hr
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
                    ) : (
                        <Center>
                            <Text>No Data Found </Text>
                        </Center>
                    )
                }
            </ScrollArea>

             {/* Bottom Section: Pagination */}
             {totalPages > 0 && (
                <Center>
                    <Pagination
                        color="#4E66DE"
                        total={totalPages}
                        value={currentPage}
                        onChange={setCurrentPage}
                        size="sm"
                    />
                </Center>
                    
                )}
            </Card>
            </>
        );
    };

    const FindingAccordion = ({ data } : any) => {
        const [findingSearch, setFindingSearch] = useState("");
        const filteredFindings = data?.filter((finding : any) =>
            finding.taskId.toLowerCase().includes(findingSearch.toLowerCase())
        );

        const [activePage, setActivePage] = useState(1);
        const itemsPerPage = 6;
        const totalPages = Math.ceil(filteredFindings?.length / itemsPerPage);
        const paginatedFindings = filteredFindings?.slice(
            (activePage - 1) * itemsPerPage,
            activePage * itemsPerPage
        );

        return (
            <>
             <Card withBorder h="85vh" shadow="sm">
                {/* Top Section: Search Input */}
                <Box >
                    <Text fw={600} size="lg" mb="sm">Findings</Text>
                    <TextInput
                        placeholder="Search Findings by Task ID"
                        value={findingSearch}
                        onChange={(event) => setFindingSearch(event.currentTarget.value)}
                        mb="sm"
                    />
                </Box>

                {/* Middle Section: Scrollable Findings List */}
                <ScrollArea h="65vh" scrollbarSize={0} scrollHideDelay={0}>
                    {
                        paginatedFindings?.length > 0 ? (
                            <Accordion variant="separated" value={findingsOpened} onChange={setFindingsOpened}>
                    {paginatedFindings?.map((finding : any) => (
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
                                                        Est {skill?.manHours?.avg} Hr
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
                        ) : (
                            <Center>
                                <Text>
                                    No Data Found
                                </Text>
                            </Center>
                        )
                    }
                </ScrollArea>

                 {/* Bottom Section: Pagination */}
                 {totalPages > 0 && (
                    <Center >
                        <Pagination 
                            color="#4E66DE"
                            total={totalPages}
                            value={activePage}
                            onChange={setActivePage}
                            size="sm"
                        />
                    </Center>
                )}
             </Card>
            </>
        );
    };

    const SkillTaskAccordion = ({ data } : any) => {
        const [skillSearch, setSkillSearch] = useState("");

        const skillBasedTasks = useMemo(() => {
            // Create a map to group tasks by skill (case-insensitive)
            const skillMap = new Map();
            
            // Handle null or empty data
            if (!data || data.length === 0) return [];
            
            // Process each task
            data.forEach((task: any) => {
                // Handle tasks with no skills
                if (!task.skills || task.skills.length === 0) return;
                
                // Process each skill in the task
                task.skills.forEach((skillData: any) => {
                    // Handle null skill name by assigning "Unknown Skill"
                    const rawSkillName = skillData?.skill?.trim() || "Unknown Skill";
                    
                    // Convert skill name to lowercase for case-insensitive grouping
                    const skillNameLower = rawSkillName.toLowerCase();
                    
                    // Get the original case version we want to display (use the first occurrence)
                    let displaySkillName = rawSkillName;
                    if (skillMap.has(skillNameLower)) {
                        displaySkillName = skillMap.get(skillNameLower).displayName;
                    }
                    
                    // Create array for this skill if it doesn't exist
                    if (!skillMap.has(skillNameLower)) {
                        skillMap.set(skillNameLower, {
                            displayName: displaySkillName,
                            tasks: []
                        });
                    }
                    
                    // Add this task to the skill's array
                    skillMap.get(skillNameLower).tasks.push({
                        taskId: task.taskId || "Unknown Task",
                        taskDescription: task.taskDescription || "No description",
                        manHours: skillData.manHours || { min: 0, avg: 0, max: 0 }
                    });
                });
            });
            
            // Convert the map to an array of skill groups with calculated totals
            return Array.from(skillMap.values()).map((skillGroup) => {
                // Calculate total hours for this skill group
                const totalMinHours = skillGroup.tasks.reduce((sum: any, task: any) => sum + (task.manHours.min || 0), 0);
                const totalAvgHours = skillGroup.tasks.reduce((sum: any, task: any) => sum + (task.manHours.avg || 0), 0);
                const totalMaxHours = skillGroup.tasks.reduce((sum: any, task: any) => sum + (task.manHours.max || 0), 0);
                
                return {
                    skill: skillGroup.displayName,
                    tasks: skillGroup.tasks,
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

        // // console.log("filtered skills >>>",filteredSkills);
        const [activePage, setActivePage] = useState(1);
        const itemsPerPage = 6;

        // Pagination logic
        const totalPages = Math.ceil(filteredSkills?.length / itemsPerPage);
        const paginatedSkills = filteredSkills?.slice(
           (activePage - 1) * itemsPerPage,
            activePage * itemsPerPage
        );
    
        return (
            <>
            <Card withBorder h="85vh" shadow="sm" p="md" radius="md">
                 {/* Top Section: Heading & Search Input */}
            <Box mb="md">
              <Text fw={600} size="lg" mb="sm">
                Skills - MPD
              </Text>
              <TextInput
                placeholder="Search by Skill Name"
                mb="sm"
                value={skillSearch}
                onChange={(event) => setSkillSearch(event.currentTarget.value)}
              />
            </Box>

            {/* Middle Section: Scrollable Accordion List */}
            <ScrollArea h="65vh" scrollbarSize={6}>
                {
                    paginatedSkills?.length > 0 ? (
                        <Accordion variant="separated" value={opened} onChange={setOpened}>
                    {paginatedSkills?.map((skillGroup) => (
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
                                            <Text size="sm" c="dimmed">Est: {skillGroup.totalAvgHours.toFixed(2)} Hr</Text>
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
                                                {/* <Group justify="space-between">
                                                    <Text fz="xs" c="green" fw={700}>Min {task.manHours.min} Hr</Text>
                                                    <Text fz="xs" c="yellow" fw={700}>Avg {task.manHours.avg} Hr</Text>
                                                    <Text fz="xs" c="red" fw={700}>Max {task.manHours.max} Hr</Text>
                                                </Group> */}
                                                <SimpleGrid cols={3}>
                                                <Card bg='#daf7de' shadow="0" radius='md' p='xs'>
                                        <Group justify="space-between" align="start">
                                            <Flex direction='column'>
                                                <Text fz='xs'>Min</Text>
                                                <Text fz='lg' fw={600}>{task.manHours.min} Hr</Text>
                                            </Flex>
                                            <IconClockDown color="green" size='20' />
                                        </Group>
                                    </Card>
                                    <Card bg='#fcebeb' shadow="0" radius='md' p='xs'>
                                        <Group justify="space-between" align="start">
                                            <Flex direction='column'>
                                                <Text fz='xs'>Max</Text>
                                                <Text fz='lg' fw={600}>{task.manHours.max} Hr</Text>
                                            </Flex>
                                            <IconClockUp color="red" size='20' />
                                        </Group>
                                    </Card>
                                    <Card bg='#f3f7da' shadow="0" radius='md' p='xs'>
                                        <Group justify="space-between" align="start">
                                            <Flex direction='column'>
                                                <Text fz='xs'>Est</Text>
                                                <Text fz='lg' fw={600}>{task.manHours.avg} Hr</Text>
                                            </Flex>
                                            <IconClockCode color="orange" size='20' />
                                        </Group>
                                    </Card>

                                                </SimpleGrid>
                                                {/* <Progress.Root size="xs" mt="xs">
                                                    <Progress.Section value={(task.manHours.min / (task.manHours.max || 1)) * 100} color="green" />
                                                    <Progress.Section value={((task.manHours.avg - task.manHours.min) / (task.manHours.max || 1)) * 100} color="yellow" />
                                                    <Progress.Section value={((task.manHours.max - task.manHours.avg) / (task.manHours.max || 1)) * 100} color="red" />
                                                </Progress.Root> */}
                                            </Card>
                                        ))}
                                    </Box>
                                </ScrollArea>
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
                    ) : (
                        <Center><Text>No Data Found</Text></Center>
                    )
                }
            </ScrollArea>

            {/* Bottom Section: Pagination */}
            {totalPages > 0 && (
              <Center>
                <Pagination color="#4E66DE" value={activePage} onChange={setActivePage} total={totalPages} size="sm" />
              </Center>
            )}
            
            </Card>
                
                
            </>
        );
    };

    const SkillFindingAccordion = ({ data } : any) => {
        const [skillSearch, setSkillSearch] = useState("");
    
        const skillBasedFindings = useMemo(() => {
            // Create a map to group findings by skill (case-insensitive)
            const skillMap = new Map();
            
            // Handle null or empty data
            if (!data || data.length === 0) return [];
            
            // Process each finding
            data.forEach((finding: any) => {
                // Handle findings with no skills
                if (!finding.skills || finding.skills.length === 0) return;
                
                // Process each skill in the finding
                finding.skills.forEach((skillData: any) => {
                    // Handle null skill name by assigning "Unknown Skill"
                    const rawSkillName = skillData?.skill?.trim() || "Unknown Skill";
                    
                    // Convert skill name to lowercase for case-insensitive grouping
                    const skillNameLower = rawSkillName.toLowerCase();
                    
                    // Get the original case version we want to display (use the first occurrence)
                    let displaySkillName = rawSkillName;
                    if (skillMap.has(skillNameLower)) {
                        displaySkillName = skillMap.get(skillNameLower).displayName;
                    }
                    
                    // Create array for this skill if it doesn't exist
                    if (!skillMap.has(skillNameLower)) {
                        skillMap.set(skillNameLower, {
                            displayName: displaySkillName,
                            findings: []
                        });
                    }
                    
                    // Add this finding to the skill's array
                    skillMap.get(skillNameLower).findings.push({
                        taskId: finding.taskId || "Unknown Task ID",
                        manHours: skillData.manHours || { min: 0, avg: 0, max: 0 }
                    });
                });
            });
            
            // Convert the map to an array of skill groups with calculated totals
            return Array.from(skillMap.values()).map((skillGroup) => {
                // Calculate total hours for this skill group
                const totalMinHours = skillGroup.findings.reduce(
                    (sum: any, finding: any) => sum + (finding.manHours.min || 0), 0
                );
                const totalAvgHours = skillGroup.findings.reduce(
                    (sum: any, finding: any) => sum + (finding.manHours.avg || 0), 0
                );
                const totalMaxHours = skillGroup.findings.reduce(
                    (sum: any, finding: any) => sum + (finding.manHours.max || 0), 0
                );
                
                return {
                    skill: skillGroup.displayName,
                    findings: skillGroup.findings,
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

        // console.log("filtered findins skills >>>>",filteredSkills);
        
        const [currentPage, setCurrentPage] = useState(1);
        const itemsPerPage = 5;
        const totalPages = Math.ceil(filteredSkills?.length / itemsPerPage);
        const paginatedData = filteredSkills?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        return (
            <>
            <Card withBorder h="85vh" shadow="sm" p="md">
                {/* Top Section: Heading & Search */}
                <Box mb="sm">
                    <Text fw={600} size="lg" mb="sm">Skills - Findings</Text>
                    <TextInput
                        placeholder="Search by Skill Name"
                        value={skillSearch}
                        onChange={(event) => setSkillSearch(event.currentTarget.value)}
                    />
                </Box>

                 {/* Middle Section: Scrollable Accordion */}
                 <ScrollArea h="65vh" scrollbarSize={6} scrollHideDelay={0}>
                    {
                        paginatedData?.length > 0 ? (
                            <Accordion variant="separated" value={findingsOpened} onChange={setFindingsOpened}>
                    {paginatedData?.map((skillGroup) => (
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
                                            <Text size="sm" c="dimmed">Est: {skillGroup.totalAvgHours.toFixed(2)} Hr</Text>
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
                                                {/* <Group justify="space-between">
                                                    <Text fz="xs" c="green" fw={700}>Min {finding.manHours.min} Hr</Text>
                                                    <Text fz="xs" c="yellow" fw={700}>Avg {finding.manHours.avg} Hr</Text>
                                                    <Text fz="xs" c="red" fw={700}>Max {finding.manHours.max} Hr</Text>
                                                </Group>
                                                <Progress.Root size="xs" mt="xs">
                                                    <Progress.Section value={(finding.manHours.min / (finding.manHours.max || 1)) * 100} color="green" />
                                                    <Progress.Section value={((finding.manHours.avg - finding.manHours.min) / (finding.manHours.max || 1)) * 100} color="yellow" />
                                                    <Progress.Section value={((finding.manHours.max - finding.manHours.avg) / (finding.manHours.max || 1)) * 100} color="red" />
                                                </Progress.Root> */}
                                                 <SimpleGrid cols={3}>
                                                <Card bg='#daf7de' shadow="0" radius='md' p='xs'>
                                        <Group justify="space-between" align="start">
                                            <Flex direction='column'>
                                                <Text fz='xs'>Min</Text>
                                                <Text fz='lg' fw={600}>{finding.manHours.min} Hr</Text>
                                            </Flex>
                                            <IconClockDown color="green" size='20' />
                                        </Group>
                                    </Card>
                                    <Card bg='#fcebeb' shadow="0" radius='md' p='xs'>
                                        <Group justify="space-between" align="start">
                                            <Flex direction='column'>
                                                <Text fz='xs'>Max</Text>
                                                <Text fz='lg' fw={600}>{finding.manHours.max} Hr</Text>
                                            </Flex>
                                            <IconClockUp color="red" size='20' />
                                        </Group>
                                    </Card>
                                    <Card bg='#f3f7da' shadow="0" radius='md' p='xs'>
                                        <Group justify="space-between" align="start">
                                            <Flex direction='column'>
                                                <Text fz='xs'>Est</Text>
                                                <Text fz='lg' fw={600}>{finding.manHours.avg} Hr</Text>
                                            </Flex>
                                            <IconClockCode color="orange" size='20' />
                                        </Group>
                                    </Card>

                                                </SimpleGrid>
                                            </Card>
                                        ))}
                                    </Box>
                                </ScrollArea>
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
                        ) : (
                            <Center>
                                <Text>
                                    No Data Found
                                </Text>
                            </Center>
                        )
                    }
                 </ScrollArea>

                 {/* Bottom Section: Pagination */}
                {totalPages > 0 && (
                    <Center>
                        <Pagination color="#4E66DE" size="sm" value={currentPage} onChange={setCurrentPage} total={totalPages} />
                    </Center>
                )}
            </Card>
               
                
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
                            <Text fw={400} fz='sm'>Tasks Est Hrs</Text>
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
                            <Text fw={400} fz='sm'>Findings Est Hrs</Text>
                            <Text fw={600} fz='h2'>{totalAvgTimeFindings || 0} Hr</Text>
                        </Flex>
                        <IconClock color="orange" size='39' />
                    </Group>
                </Card>
            </SimpleGrid>
            <Space h='sm' />
            <SimpleGrid cols={2}>
                <SkillTaskAccordion data={skillAnalysisData?.skillAnalysis?.tasks} />
                <SkillFindingAccordion data={skillAnalysisData?.skillAnalysis?.findings} />
            </SimpleGrid>
            
            <Space h='sm' />
            <SimpleGrid cols={2}>
                <TaskAccordion data={skillAnalysisData?.skillAnalysis?.tasks} />
                <FindingAccordion data={skillAnalysisData?.skillAnalysis?.findings} />
            </SimpleGrid>
            
            
        </>
    );
};

export default SkillRequirementAnalytics;