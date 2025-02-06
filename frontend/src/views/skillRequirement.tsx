import { Card, Group, SimpleGrid, Title, Text, ScrollArea, Badge, Button, Divider, Box, Flex, Space, Accordion, Progress, TextInput } from "@mantine/core";
import { useState } from "react";
import DropZoneExcel from "../components/fileDropZone";
import { MdLensBlur, MdOutlineArrowForward } from "react-icons/md";
import { IconAlertTriangle, IconClock, IconCube, IconMessage2Down } from "@tabler/icons-react";
import ReactApexChart from "react-apexcharts";

export default function SkillRequirement() {

    const [tasks, setTasks] = useState<string[]>([]);
    const handleFiles = (files: File[]) => {
        console.log("Uploaded files:", files);
    };
    // Handle extracted tasks
    const handleTasks = (extractedTasks: string[]) => {
        setTasks(extractedTasks);
        console.log("tasks :", extractedTasks);
    };

    const jsonData = {
        "skillAnalysis": {
            "tasks": [
                {
                    "taskId": "200435-01-1 (LH)",
                    "taskDescription": "FAN COMPARTMENT\n\nDETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY\nGEAR BOX (EWIS)",
                    "skills": [
                        {
                            "skill": "Skill 1",
                            "manHours": {
                                "min": 4,
                                "avg": 6,
                                "max": 8
                            }
                        },
                        {
                            "skill": "Skill 2",
                            "manHours": {
                                "min": 6,
                                "avg": 4,
                                "max": 4
                            }
                        },
                        {
                            "skill": "Skill 3",
                            "manHours": {
                                "min": 4,
                                "avg": 4,
                                "max": 4
                            }
                        }
                    ]
                },
                {
                    "taskId": "200435-01-4",
                    "taskDescription": "FAN COMPARTMENT\n\nDETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY\nGEAR BOX (EWIS)",
                    "skills": [
                        {
                            "skill": "skill 2",
                            "manHours": {
                                "min": 4,
                                "avg": 4,
                                "max": 4
                            }
                        },
                        {
                            "skill": "skill 1",
                            "manHours": {
                                "min": 3,
                                "avg": 6,
                                "max": 12
                            }
                        },
                        {
                            "skill": "skill 4",
                            "manHours": {
                                "min": 6,
                                "avg": 4,
                                "max": 12
                            }
                        }
                    ]
                }
            ],
            "findings": [
                {
                    "taskId": "200435-01-1 (LH)",
                    "skills": [
                        {
                            "skill": 'skill 1',
                            "manHours": {
                                "min": 2,
                                "avg": 4,
                                "max": 6
                            }
                        },
                        {
                            "skill": 'skill 2',
                            "manHours": {
                                "min": 4,
                                "avg": 4,
                                "max": 6
                            }
                        },
                        {
                            "skill": 'skill 3',
                            "manHours": {
                                "min": 2,
                                "avg": 2,
                                "max": 2
                            }
                        }
                    ]
                },
                {
                    "taskId": "200435-01-1 (RH)",
                    "skills": [
                        {
                            "skill": 'skill 1',
                            "manHours": {
                                "min": 2,
                                "avg": 2,
                                "max": 2
                            }
                        }
                    ]
                },
                {
                    "taskId": "200435-01-4",
                    "skills": [
                        {
                            "skill": 'skill 1',
                            "manHours": {
                                "min": 2,
                                "avg": 2,
                                "max": 2
                            }
                        }
                    ]
                }
            ]
        }
    };

    const TaskAccordion = ({ data }: { data: any[] }) => {
        const [taskSearch, setTaskSearch] = useState("");
        const filteredTasks = data.filter((task) =>
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
            <Accordion variant="separated" defaultValue={data.length > 0 ? data[0].taskId : undefined}>
                {filteredTasks.map((task) => (
                    <Accordion.Item key={task.taskId} value={task.taskId}>
                        <Accordion.Control>
                            <Group>
                                <IconCube color="#4E66DE"/>
                            {task.taskId}
                            </Group>
                            
                        </Accordion.Control>
                        <Accordion.Panel>
                            <ScrollArea h={300} scrollHideDelay={0}>
                            <Group justify="center" w="100%">
                            <ReactApexChart
                            type="donut"
                            height={250} 
                            width={250}
                            
                            options={{
                                chart: {
                                    type: "donut",
                                },
                                title: {
                                    text: `Skill Distribution`,
                                    align: "center",
                                },
                                plotOptions: {
                                    pie: {
                                        donut: {
                                            size: "65%",
                                        },
                                    },
                                },
                                labels: task.skills.map((skill : any) => skill.skill),
                                legend: {
                                    position: "bottom",
                                },
                                responsive: [
                                    {
                                        breakpoint: 200,
                                        options: {
                                            chart: {
                                                width: 100,
                                            },
                                            legend: {
                                                position: "bottom",
                                            },
                                        },
                                    },
                                ],
                            }}
                            series={task.skills.map((skill : any) => skill.manHours.avg)}
                        />
                            </Group>
                            
                                {task?.skills?.map((skill: any) => (
                                    // <div key={skill.skill} style={{ marginBottom: 10 }}>
                                    <Card key={skill.skill} shadow="0" p="sm" radius='md' mt="xs" bg='#f0f0f0'>
                                        <Text size="sm" fw={500}>{skill.skill}</Text>
                                        <Group justify="space-between">
                                            <Text fz="xs" c="green" fw={700}>
                                                {skill.manHours.min} Hr
                                            </Text>
                                            <Text fz="xs" c="yellow" fw={700}>
                                                {skill.manHours.avg} Hr
                                            </Text>
                                            <Text fz="xs" c="red" fw={700}>
                                                {skill.manHours.max} Hr
                                            </Text>
                                        </Group>
                                        <Progress.Root>
                                            <Progress.Section value={skill.manHours.min * 100} color="green" />
                                            <Progress.Section value={skill.manHours.avg * 100} color="yellow" />
                                            <Progress.Section value={skill.manHours.max * 100} color="red" />
                                        </Progress.Root>
                                    </Card>
                                    // </div>
                                ))}
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
        const filteredFindings = data.filter((finding) =>
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
            <Accordion variant="separated" defaultValue={data.length > 0 ? data[0].taskId : undefined}>
                {filteredFindings.map((task) => (
                    <Accordion.Item key={task.taskId} value={task.taskId}>
                        <Accordion.Control>
                        <Group>
                                <IconAlertTriangle color="#4E66DE"/>
                            {task.taskId}
                            </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <ScrollArea h={300} scrollHideDelay={0}>
                                <Group justify="center" w="100%">
                                <ReactApexChart
                            type="donut"
                            height={250} 
                            width={250}
                            options={{
                                chart: {
                                    type: "donut",
                                },
                                title: {
                                    text: `Skill Distribution`,
                                    align: "center",
                                },
                                plotOptions: {
                                    pie: {
                                        donut: {
                                            size: "65%",
                                        },
                                    },
                                },
                                labels: task.skills.map((skill : any) => skill.skill),
                                legend: {
                                    position: "bottom",
                                },
                                responsive: [
                                    {
                                        breakpoint: 200,
                                        options: {
                                            chart: {
                                                width: 100,
                                            },
                                            legend: {
                                                position: "bottom",
                                            },
                                        },
                                    },
                                ],
                            }}
                            series={task.skills.map((skill : any) => skill.manHours.avg)}
                        />
                                </Group>
                            
                                {task?.skills?.map((skill: any) => (
                                    // <div key={skill.skill} style={{ marginBottom: 10 }}>
                                    <Card key={skill.skill} shadow="0" p="sm" radius='md' mt="xs" bg='#f0f0f0'>
                                        <Text size="sm" fw={500}>{skill.skill}</Text>
                                        <Group justify="space-between">
                                            <Text fz="xs" c="green" fw={700}>
                                                {skill.manHours.min} Hr
                                            </Text>
                                            <Text fz="xs" c="yellow" fw={700}>
                                                {skill.manHours.avg} Hr
                                            </Text>
                                            <Text fz="xs" c="red" fw={700}>
                                                {skill.manHours.max} Hr
                                            </Text>
                                        </Group>
                                        <Progress.Root>
                                            <Progress.Section value={skill.manHours.min * 100} color="green" />
                                            <Progress.Section value={skill.manHours.avg * 100} color="yellow" />
                                            <Progress.Section value={skill.manHours.max * 100} color="red" />
                                        </Progress.Root>
                                    </Card>
                                    // </div>
                                ))}
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
                        <Group mb='xs'>
                            <Text size="md" fw={500}>
                                Tasks
                            </Text>
                            {
                                tasks.length > 0 ? (
                                    <Badge color="indigo" size="md" radius="sm">
                                        {tasks?.length}
                                    </Badge>
                                ) : (
                                    <></>
                                )
                            }
                        </Group>
                        <ScrollArea
                            style={{
                                flex: 1, // Take remaining space for scrollable area
                                overflow: "auto",
                            }}
                            offsetScrollbars
                            scrollHideDelay={1}
                        >
                            {tasks.length > 0 ? (
                                <SimpleGrid cols={4}>
                                    {tasks.map((task, index) => (
                                        <Badge
                                            key={index}
                                            color="blue"
                                            variant="light"
                                            radius='sm'
                                            style={{ margin: "0.25em" }}
                                        >
                                            {task}
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
                        variant="gradient"
                        gradient={{ from: 'violet', to: 'blue', deg: 0 }}
                        // variant="filled"
                        // color='#1A237E'
                        disabled={tasks.length > 0 ? false : true}
                        leftSection={<MdLensBlur size={14} />}
                        rightSection={<IconMessage2Down size={14} />}
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
                                    66
                                </Text>
                            </Flex>
                            <IconCube color="#4E66DE" size='39' />
                        </Group>
                        <Text fw={500} fz='sm' c='dimmed'>
                            skills - 6
                        </Text>
                    </Card>
                    <Card withBorder radius='md' bg='#d2fad4'>
                        <Group gap='lg' justify="space-between">
                            <Flex direction='column'>
                                <Text fw={400} fz='sm' >
                                    Tasks Avg Time
                                </Text>
                                <Text fw={600} fz='h2' >
                                    44 Hr
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
                                    66
                                </Text>
                            </Flex>
                            <IconAlertTriangle color="red" size='39' />
                        </Group>
                        <Text fw={500} fz='sm' c='dimmed'>
                            skills - 6
                        </Text>
                    </Card>
                    <Card withBorder radius='md' bg='#FFEDE2'>
                        <Group gap='lg' justify="space-between">
                            <Flex direction='column'>
                                <Text fw={400} fz='sm' >
                                    Findings Avg Time
                                </Text>
                                <Text fw={600} fz='h2' >
                                    44 Hr
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
                            <TaskAccordion data={jsonData.skillAnalysis.tasks} />
                        </ScrollArea>
                    </Card>
                    <Card withBorder h='85vh' shadow="sm">
                        <ScrollArea h='85vh' scrollbarSize={0} scrollHideDelay={0}>
                            <Text fw={600} size="lg" mb="sm">Findings</Text>
                            <FindingAccordion data={jsonData.skillAnalysis.findings} />
                        </ScrollArea>
                    </Card>
                </SimpleGrid>
            </div>
        </>
    )
}