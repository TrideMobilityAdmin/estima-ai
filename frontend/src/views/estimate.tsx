// import { Grid, Title } from "@mantine/core";
import DropZoneExcel from "../components/fileDropZone";
import {
    Badge,
    Box,
    Button,
    Card,
    Divider,
    Flex,
    Grid,
    Group,
    MdLensBlur,
    MdOutlineArrowForward,
    MdPin,
    MdOutlineFileDownload,
    ScrollArea,
    SimpleGrid,
    Space,
    Text,
    TextInput,
    Title,
    useState,
    MdPictureAsPdf,
    ThemeIcon,
    MdOutlineTimeline,
    MdOutlineMiscellaneousServices,
    Progress
} from "../constants/GlobalImports";

export default function Estimate() {
    const [tasks, setTasks] = useState<string[]>([]);

    const handleFiles = (files: File[]) => {
        console.log("Uploaded files:", files);
    };
    // Handle extracted tasks
    const handleTasks = (extractedTasks: string[]) => {
        setTasks(extractedTasks);
        console.log("tasks :", extractedTasks);
    };
    // console.log("")
    return (
        <>
            <div style={{ padding: 70 }}>
                <Grid grow gutter="xs">
                    <Grid.Col span={3}>
                        <Card h='50vh'>
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
                    </Grid.Col>

                    <Grid.Col span={5}>
                        <Card h='50vh'>
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
                    </Grid.Col>

                    <Grid.Col span={4}>
                        <Card h='50vh'>
                            <Text size="md" fw={500} >
                                RFQ Parameters
                            </Text>
                            <ScrollArea
                                style={{
                                    flex: 1, // Take remaining space for scrollable area
                                    overflow: "auto",
                                }}
                                offsetScrollbars
                                scrollHideDelay={1}
                            >
                                <SimpleGrid cols={1} spacing='xs'>
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Probability"
                                    //   {...form.getInputProps("probability")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Indigo, AirIndia"
                                        label="Operator"
                                    //   {...form.getInputProps("assetOwner")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Aircraft Age"
                                    //   {...form.getInputProps("assetOwner")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Flight Cycles"
                                    //   {...form.getInputProps("assetOwner")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Flight Hours"
                                    //   {...form.getInputProps("assetOwner")}
                                    />

                                    <Text size="md" fw={500}>
                                        Capping
                                    </Text>
                                </SimpleGrid>


                            </ScrollArea>
                        </Card>
                    </Grid.Col>
                </Grid>

                <Group justify="center" pt='sm' pb='sm'>
                    <Button
                        variant="gradient"
                        gradient={{ from: 'indigo', to: 'cyan', deg: 90 }}
                        // variant="filled"
                        // color='#1A237E'
                        disabled={tasks.length > 0 ? false : true}
                        leftSection={<MdLensBlur size={14} />}
                        rightSection={<MdOutlineArrowForward size={14} />}
                    >
                        Generate Estimate
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
                            <Box ml={5}>Estimate</Box>
                        </>
                    }
                />

                <Group justify="space-between">
                    <Title order={4}>
                        Overall Estimate Report
                    </Title>
                    <Button
                        size="xs"
                        variant="filled"
                        color='green'
                        leftSection={<MdPictureAsPdf size={14} />}
                        rightSection={<MdOutlineFileDownload size={14} />}
                    >
                        Download Estimate
                    </Button>
                </Group>

                <Space h='sm' />

                <SimpleGrid cols={3} spacing='xs'>
                    <Flex
                        justify="flex-start"
                        align="flex-start"
                        direction="column"
                    >
                        <Card w='100%' p={5}>
                            <Group p={0} gap='sm'>
                                <ThemeIcon variant="light" radius="md" size="60" color="indigo">
                                    <MdOutlineTimeline style={{ width: '70%', height: '70%' }} />
                                </ThemeIcon>

                                <Flex direction='column'>
                                    <Text size="md" fw={500} fz='h6' c='gray'>
                                        Total TAT Time
                                    </Text>
                                    <Text size="md" fw={600} fz='h3' >
                                        44
                                    </Text>
                                </Flex>
                            </Group>
                        </Card>
                        <Space h='sm' />
                        <Card w='100%'>
                            <Flex gap="lg" direction="column">
                                <Title order={6} c='gray'>Est Man Hrs.</Title>
                                <Grid justify="flex-start" align="center">
                                    <Grid.Col span={3}>
                                        <Text fz='sm'>Min</Text>
                                    </Grid.Col>
                                    <Grid.Col span={9}>
                                        <Group justify="flex-end" fz='xs' fw='600' c="green">{40} Hrs</Group>
                                        <Progress color="green" value={40} />
                                    </Grid.Col>
                                </Grid>

                                <Grid justify="flex-start" align="center">
                                    <Grid.Col span={3}>
                                        <Text fz='sm'>Estimated</Text>
                                    </Grid.Col>
                                    <Grid.Col span={9}>
                                        <Group justify="flex-end" fz='xs' fw='600' c="yellow">{66} Hrs</Group>
                                        <Progress color="yellow" value={66} />
                                    </Grid.Col>
                                </Grid>

                                <Grid justify="flex-start" align="center">
                                    <Grid.Col span={3}>
                                        <Text fz='sm'>Max</Text>
                                    </Grid.Col>
                                    <Grid.Col span={9}>
                                        <Group justify="flex-end" fz='xs' fw='600' c="red">{46} Hrs</Group>
                                        <Progress color="red" value={46} />
                                    </Grid.Col>
                                </Grid>
                            </Flex>
                        </Card>
                        <Space h='sm' />
                        <Card w='100%' p={5}>
                            <Group p={0} gap='sm'>
                                <ThemeIcon variant="light" radius="md" size="60" color="indigo">
                                    <MdOutlineMiscellaneousServices style={{ width: '70%', height: '70%' }} />
                                </ThemeIcon>
                                <Flex direction='column'>
                                    <Text size="md" fw={500} fz='h6' c='gray'>
                                        Estimated Spares Cost ($)
                                    </Text>
                                    <Text size="md" fw={600} fz='h3' >
                                        44
                                    </Text>
                                </Flex>
                            </Group>
                        </Card>
                    </Flex>

                    <Card>
                        <Text size="md" fw={500} fz='h6' c='gray'>
                            Estimated Parts
                        </Text>

                    </Card>

                    <Card>
                        <Text size="md" fw={500} fz='h6' c='gray'>
                            Spare Cost ($)
                        </Text>

                    </Card>
                </SimpleGrid>
            </div>
        </>
    )
}