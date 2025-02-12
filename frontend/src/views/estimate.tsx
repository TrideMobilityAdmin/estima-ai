// import { Grid, Title } from "@mantine/core";
import { List, LoadingOverlay, SegmentedControl, Select } from "@mantine/core";
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
    Progress,
    axios,
    showNotification,
    Table,
    useEffect,
    useForm,
} from "../constants/GlobalImports";
import { AreaChart } from "@mantine/charts";
import '../App.css';
import { IconClockCheck, IconClockCode, IconClockDown, IconClockUp, IconError404, IconMinimize } from "@tabler/icons-react";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useApi } from "../api/services/estimateSrvice";

export default function Estimate() {
    const { postEstimateReport, validateTasks } = useApi();
    const [scrolledTable, setScrolledTable] = useState(false);
    const [tasks, setTasks] = useState<string[]>([]);
    const [estimateReportData, setEstReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false); // Add loading state
    const [validatedTasks, setValidatedTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Handle file upload (for Excel parsing)
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
                message: `${invalidTasks.length} tasks are not available. Only valid tasks will be used to generate Estimate.`,
                color: "orange",
                style: { position: "fixed", top: 100, right: 20, zIndex: 1000 },
            });
        }
    }

    // Form initialization
    const form = useForm({
        initialValues: {
            probability: "",
            operator: "",
            aircraftAge: "",
            aircraftFlightHours: "",
            aircraftFlightCycles: "",
        },

        validate: {
            probability: (value) => (value.trim() ? null : "Probability is required"),
            operator: (value) => (value.trim() ? null : "Operator is required"),
            aircraftAge: (value) => (value.trim() ? null : "Aircraft Age is required"),
            aircraftFlightHours: (value) => (value.trim() ? null : "Flight Hours are required"),
            aircraftFlightCycles: (value) => (value.trim() ? null : "Flight Cycles are required"),
        },
    });

    // Handle Submit
    const handleSubmit = async () => {
        const validTasks = validatedTasks?.filter((task) => task?.status === true)?.map((task) => task?.taskid);

        if (!form.isValid()) {
            form.validate();
            return;
        }

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
            tasks: validTasks,
            probability: Number(form.values.probability),
            operator: form.values.operator,
            aircraftAge: Number(form.values.aircraftAge),
            aircraftFlightHours: Number(form.values.aircraftFlightHours),
            aircraftFlightCycles: Number(form.values.aircraftFlightCycles),
        };

        console.log("Submitting data:", requestData);

        try {
            setLoading(true);
            const response = await postEstimateReport(requestData);
            console.log("API Response:", response);

            if (response) {
                setEstReportData(response);
                showNotification({
                    title: "Success",
                    message: "Estimate report submitted successfully!",
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


    useEffect(() => {
        console.log("Updated UI response:", estimateReportData);
    }, [estimateReportData]);
    console.log("response UI >>>>", estimateReportData);

    const [downloading, setDownloading] = useState(false);
    const handleDownloadPDF = async () => {
        setDownloading(true); // Start loading
        try {
            const response = await axios.get(
                "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf",
                {
                    responseType: "blob", // Ensure the response is a Blob (binary data)
                }
            );

            // Create a Blob URL for the PDF file
            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);

            // Create a link element to trigger the download
            const link = document.createElement("a");
            link.href = url;
            link.download = "Estimate.pdf"; // Name for the downloaded file
            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);

            // Show success notification
            showNotification({
                title: "Download Successful",
                message: "Your PDF has been downloaded successfully!",
                color: "green",
            });
        } catch (error) {
            console.error("Error downloading PDF:", error);

            // Show error notification
            showNotification({
                title: "Download Failed",
                message: "There was an error downloading the PDF.",
                color: "red",
            });
        } finally {
            setDownloading(false); // End loading
        }
    };

    const parts = [
        {
            partName: "Nut",
            partDesc: "POO1",
            qty: "6",
            unit: "",
            price: "20"
        },
        {
            partName: "Foam Tape",
            partDesc: "POO2",
            qty: "2",
            unit: "",
            price: "80"
        },
        {
            partName: "Blind Rivet",
            partDesc: "POO3",
            qty: "1",
            unit: "",
            price: "40"
        },
        {
            partName: "Selant",
            partDesc: "POO4",
            qty: "4",
            unit: "",
            price: "20"
        },
        {
            partName: "Nut",
            partDesc: "POO1",
            qty: "6",
            unit: "",
            price: "20"
        },
        {
            partName: "Foam Tape",
            partDesc: "POO2",
            qty: "2",
            unit: "",
            price: "80"
        },
        {
            partName: "Blind Rivet",
            partDesc: "POO3",
            qty: "1",
            unit: "",
            price: "40"
        },
        {
            partName: "Selant",
            partDesc: "POO4",
            qty: "4",
            unit: "",
            price: "20"
        }
    ];

    const jsonData = {
        tasks: [
            {
                sourceTask: "255000-16-1",
                desciption: "CARGO COMPARTMENTS\n\nDETAILED INSPECTION OF DIVIDER NETS, DOOR NETS AND\nNET ATTACHMENT POINTS\n\nNOTE:\nTHE NUMBER OF AFFECTED ZONES MAY VARY ACCORDING TO",
                mhs: { max: 2, min: 2, avg: 2, est: 1.38 },
                spareParts: [
                    {
                        partId: "Nut",
                        desc: "POO1",
                        qty: "6",
                        unit: "",
                        price: "20"
                    },
                    {
                        partId: "Foam Tape",
                        desc: "POO2",
                        qty: "2",
                        unit: "",
                        price: "80"
                    },
                    {
                        partId: "Blind Rivet",
                        desc: "POO3",
                        qty: "1",
                        unit: "",
                        price: "40"
                    },
                    {
                        partId: "Selant",
                        desc: "POO4",
                        qty: "4",
                        unit: "",
                        price: "20"
                    },
                    {
                        partId: "Nut",
                        desc: "POO1",
                        qty: "6",
                        unit: "",
                        price: "20"
                    },
                    {
                        partId: "Foam Tape",
                        desc: "POO2",
                        qty: "2",
                        unit: "",
                        price: "80"
                    },
                    {
                        partId: "Blind Rivet",
                        desc: "POO3",
                        qty: "1",
                        unit: "",
                        price: "40"
                    },
                    {
                        partId: "Selant",
                        desc: "POO4",
                        qty: "4",
                        unit: "",
                        price: "20"
                    }
                ],
            },
            {
                sourceTask: "256241-05-1",
                desciption: "DOOR ESCAPE SLIDE\n\nCLEAN DOOR GIRT BAR FITTING STOP LEVERS\n\nNOTE:\nTASK IS NOT APPLICABLE FOR DEACTIVATED PASSENGER/CREW\nDOORS.",
                mhs: { max: 2, min: 2, avg: 2, est: 0.92 },
                spareParts: [
                    { partId: "LOTOXANE", desc: "NON AQUEOUS CLEANER-GENERAL", qty: 0.1, unit: "LTR", price: 0 },
                ],
            },
            {
                sourceTask: "200435-01-1 (LH)",
                desciption: "FAN COMPARTMENT\n\nDETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY\nGEAR BOX (EWIS)",
                mhs: { max: 4, min: 4, avg: 4, est: 0.73 },
                spareParts: [],
            },
        ],
        findings: [
            {
                taskId: "200435-01-1 (LH)",
                details: [
                    {
                        logItem: "HMV23/000211/0324/24",
                        probability: '66',
                        desciption: "WHILE CARRYING OUT MPD # 200435-01-1 (LH) ,FAN COMPARTMENT DETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY GEAR BOX (EWIS ) FOUND CLAMP QTY # 2 CUSHION DAMAGED.",
                        mhs: { max: 2, min: 2, avg: 2, est: 4 },
                        spareParts: [
                            {
                                partId: "Nut",
                                desc: "POO1",
                                qty: "6",
                                unit: "",
                                price: "20"
                            },
                            {
                                partId: "Foam Tape",
                                desc: "POO2",
                                qty: "2",
                                unit: "",
                                price: "80"
                            },
                            {
                                partId: "Blind Rivet",
                                desc: "POO3",
                                qty: "1",
                                unit: "",
                                price: "40"
                            },
                            {
                                partId: "Selant",
                                desc: "POO4",
                                qty: "4",
                                unit: "",
                                price: "20"
                            },
                            {
                                partId: "Nut",
                                desc: "POO1",
                                qty: "6",
                                unit: "",
                                price: "20"
                            },
                            {
                                partId: "Foam Tape",
                                desc: "POO2",
                                qty: "2",
                                unit: "",
                                price: "80"
                            },
                            {
                                partId: "Blind Rivet",
                                desc: "POO3",
                                qty: "1",
                                unit: "",
                                price: "40"
                            },
                            {
                                partId: "Selant",
                                desc: "POO4",
                                qty: "4",
                                unit: "",
                                price: "20"
                            }
                        ],
                    },
                    {
                        logItem: "HMV23/000211/25",
                        probability: '44',
                        desciption: "WHILE CARRYING OUT MPD # 200435-01-1 (LH) ,FAN COMPARTMENT DETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY GEAR BOX (EWIS ) FOUND CLAMP QTY # 2 CUSHION DAMAGED.",
                        mhs: { max: 2, min: 2, avg: 2, est: 4 },
                        spareParts: [],
                    },
                    {
                        logItem: "HMV23/000211/6",
                        probability: '46',
                        desciption: "WHILE CARRYING OUT MPD # 200435-01-1 (LH) ,FAN COMPARTMENT DETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY GEAR BOX (EWIS ) FOUND CLAMP QTY # 2 CUSHION DAMAGED.",
                        mhs: { max: 2, min: 2, avg: 2, est: 4 },
                        spareParts: [
                            {
                                partId: "Nut",
                                desc: "POO1",
                                qty: "6",
                                unit: "",
                                price: "20"
                            },
                            {
                                partId: "Foam Tape",
                                desc: "POO2",
                                qty: "2",
                                unit: "",
                                price: "80"
                            },
                            {
                                partId: "Blind Rivet",
                                desc: "POO3",
                                qty: "1",
                                unit: "",
                                price: "40"
                            },
                            {
                                partId: "Selant",
                                desc: "POO4",
                                qty: "4",
                                unit: "",
                                price: "20"
                            },
                            {
                                partId: "Nut",
                                desc: "POO1",
                                qty: "6",
                                unit: "",
                                price: "20"
                            },
                            {
                                partId: "Foam Tape",
                                desc: "POO2",
                                qty: "2",
                                unit: "",
                                price: "80"
                            },
                            {
                                partId: "Blind Rivet",
                                desc: "POO3",
                                qty: "1",
                                unit: "",
                                price: "40"
                            },
                            {
                                partId: "Selant",
                                desc: "POO4",
                                qty: "4",
                                unit: "",
                                price: "20"
                            }
                        ],
                    },
                    {
                        logItem: "HMV23/000211/26",
                        probability: '64',
                        desciption: "WHILE CARRYING OUT MPD # 200435-01-1 (LH) ,FAN COMPARTMENT DETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY GEAR BOX (EWIS ) FOUND CLAMP QTY # 2 CUSHION DAMAGED.",
                        mhs: { max: 2, min: 2, avg: 2, est: 4 },
                        spareParts: [],
                    },
                ],
            },
            {
                taskId: "255000-16-1",
                details: [
                    {
                        logItem: "HMV23/000211/0324/24",
                        probability: '66',
                        desciption: "WHILE CARRYING OUT MPD # 200435-01-1 (LH) ,FAN COMPARTMENT DETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY GEAR BOX (EWIS ) FOUND CLAMP QTY # 2 CUSHION DAMAGED.",
                        mhs: { max: 2, min: 2, avg: 2, est: 4 },
                        spareParts: [],
                    }
                ],
            },
        ],
    };

    return (
        <>
            <div style={{ padding: 70 }}>
                <Grid grow gutter="xs">
                    <Grid.Col span={3}>
                        <Card withBorder
                            // className="glass-card"
                            h='50vh' radius='md'
                        // style={{
                        //     background: 'rgba(255, 255, 255, 0.1)',
                        //     backdropFilter : "blur(50px)",
                        //     boxShadow : "0 4px 30px rgba(0, 0, 0, 0.1)",
                        //     borderRadius: '8px',
                        //     padding: '16px',
                        //     display: 'flex',
                        //     flexDirection: "column",
                        // }}
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
                    </Grid.Col>

                    <Grid.Col span={5}>
                        <Card withBorder h='50vh' radius='md'>

                            <LoadingOverlay
                                visible={isLoading}
                                zIndex={1000}
                                overlayProps={{ radius: 'sm', blur: 2 }}
                                loaderProps={{ color: 'indigo', type: 'bars' }}
                            />

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
                                {validatedTasks?.length > 0 ? (
                                    <SimpleGrid cols={4}>
                                        {validatedTasks?.map((task, index) => (
                                            <Badge
                                                key={index}
                                                color={task?.status === false ? "red" : "blue"}
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
                    </Grid.Col>

                    <Grid.Col span={4}>
                        <Card withBorder h='50vh' radius='md'>
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
                                        {...form.getInputProps("probability")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Indigo, AirIndia"
                                        label="Operator"
                                        {...form.getInputProps("operator")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Aircraft Age"
                                        {...form.getInputProps("aircraftAge")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Flight Cycles"
                                        {...form.getInputProps("aircraftFlightCycles")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Flight Hours"
                                        {...form.getInputProps("aircraftFlightHours")}
                                    />

                                    <Text size="md" fw={500}>
                                        Capping
                                    </Text>

                                    <Grid>
                                        <Grid.Col span={7}>
                                            <Select
                                                size="xs"
                                                label="Man Hrs Capping Type"
                                                placeholder="Select Capping Type"
                                                data={['Type - 1', 'Type - 2', 'Type - 3', 'Type - 4']}
                                                defaultValue="React"
                                                allowDeselect
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={5}>
                                            <TextInput
                                                size="xs"
                                                leftSection={<MdPin />}
                                                placeholder="Ex: 40"
                                                label="Man Hours"
                                            //   {...form.getInputProps("assetOwner")}
                                            />
                                        </Grid.Col>
                                    </Grid>

                                    <Grid>
                                        <Grid.Col span={7}>
                                            <Select
                                                size="xs"
                                                label="Spares Capping Type"
                                                placeholder="Select Capping Type"
                                                data={['Type - 1', 'Type - 2', 'Type - 3', 'Type - 4']}
                                                defaultValue="React"
                                                allowDeselect
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={5}>
                                            <TextInput
                                                size="xs"
                                                leftSection={<MdPin />}
                                                placeholder="Ex: 600$"
                                                label="Cost($)"
                                            //   {...form.getInputProps("assetOwner")}
                                            />
                                        </Grid.Col>
                                    </Grid>
                                </SimpleGrid>


                            </ScrollArea>
                        </Card>
                    </Grid.Col>
                </Grid>

                <Group justify="center" pt='sm' pb='sm'>
                    <Button
                        onClick={handleSubmit}
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
                        color="#1bb343"
                        leftSection={<MdPictureAsPdf size={14} />}
                        rightSection={<MdOutlineFileDownload size={14} />}
                        onClick={handleDownloadPDF}
                        loading={downloading} // Mantine built-in downloading effect
                    >
                        {downloading ? "Downloading..." : "Download Estimate"}
                    </Button>
                </Group>

                <Space h='sm' />

                <SimpleGrid cols={3} spacing='xs'>
                    <Flex
                        justify="flex-start"
                        align="flex-start"
                        direction="column"
                    >
                        <Card withBorder w='100%' p={5}>
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
                        <Card withBorder w='100%'>
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

                                <Grid justify="flex-start" align="center">
                                    <Grid.Col span={3}>
                                        <Text fz='sm'>Capping</Text>
                                    </Grid.Col>
                                    <Grid.Col span={9}>
                                        <Group justify="flex-end" fz='xs' fw='600' c="indigo">{46} Hrs</Group>
                                        <Progress color="indigo" value={46} />
                                    </Grid.Col>
                                </Grid>
                            </Flex>
                        </Card>
                        <Space h='sm' />
                        <Card withBorder w='100%' p={5}>
                            <Group p={0} gap='sm'>
                                <ThemeIcon variant="light" radius="md" size="60" color="indigo">
                                    <MdOutlineMiscellaneousServices style={{ width: '70%', height: '70%' }} />
                                </ThemeIcon>
                                <Flex direction='column'>
                                    <Text size="md" fw={500} fz='h6' c='gray'>
                                        Capping Unbilled Costing ($)
                                    </Text>
                                    <Text size="md" fw={600} fz='h3' >
                                        44
                                    </Text>
                                </Flex>
                            </Group>
                        </Card>
                    </Flex>

                    <Card withBorder>
                        <Text size="md" fw={500} fz="h6" c="gray">
                            Estimated Parts
                        </Text>

                        {/* Custom CSS for sticky header and scrollable body */}
                        <div style={{ position: 'relative', height: '40vh', overflow: 'hidden' }}>
                            <Table
                                stickyHeader
                                striped
                                highlightOnHover
                                style={{
                                    // position: 'relative',
                                    overflow: 'auto',
                                    height: '100%',
                                }}
                            >
                                {/* Sticky Header */}
                                <Table.Thead
                                    style={{
                                        position: 'sticky',
                                        top: 0,
                                        backgroundColor: 'white',
                                        zIndex: 1,
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                                    }}
                                >
                                    <Table.Tr>
                                        <Table.Th>Part Desc</Table.Th>
                                        <Table.Th>Part Name</Table.Th>
                                        <Table.Th>Qty</Table.Th>
                                        <Table.Th>Price($)</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>

                                {/* Scrollable Body */}
                                <Table.Tbody style={{ overflow: 'auto', height: "50vh" }}>
                                    {parts.length > 0 ? (
                                        parts.map((row, index) => (
                                            <Table.Tr key={index}>
                                                <Table.Td>{row.partDesc}</Table.Td>
                                                <Table.Td>{row.partName}</Table.Td>
                                                <Table.Td>{row.qty}</Table.Td>
                                                <Table.Td>{row.price}</Table.Td>
                                            </Table.Tr>
                                        ))
                                    ) : (
                                        <Table.Tr>
                                            <Table.Td colSpan={4} style={{ textAlign: 'center' }}>
                                                No data available
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </div>
                    </Card>

                    <Flex
                        justify="flex-start"
                        align="flex-start"
                        direction="column"
                    >
                        <Card withBorder w='100%' p={5}>
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
                        <Space h='sm' />
                        <Card w='100%' withBorder radius={10}>
                            <Flex gap="lg" direction="column">
                                <Title order={5}>Spare Cost ($)</Title>
                                <AreaChart
                                    h={250}
                                    data={[
                                        {
                                            date: "Min",
                                            Cost: 100,
                                        },
                                        {
                                            date: "Estimated",
                                            Cost: 800,
                                        },
                                        {
                                            date: "Max",
                                            Cost: 1000,
                                        },
                                    ]}
                                    dataKey="date"
                                    series={[{ name: "Cost", color: "indigo.6" }]}
                                    curveType="natural"
                                    connectNulls
                                />
                            </Flex>
                        </Card>
                    </Flex>

                </SimpleGrid>
                <Space h='xl' />

                {/* <SegmentedControl color="#1A237E" bg='white' data={['Findings', 'Man Hours', 'Spare Parts']} /> */}

                <FindingsWiseSection tasks={jsonData?.tasks} findings={jsonData.findings} />

                <Space h='md' />
                <PreloadWiseSection tasks={jsonData?.tasks} />

            </div>
        </>
    )
}


// Define types for the JSON data
interface SparePart {
    partId: any;
    desc: any;
    qty: any;
    unit: any;
    price: any;
}

interface ManHours {
    max: number;
    min: number;
    avg: number;
    est: number;
}

interface Task {
    sourceTask: string;
    desciption: string;
    mhs: ManHours;
    spareParts: any[];
}

interface FindingDetail {
    logItem: string;
    probability: any;
    desciption: string;
    mhs: ManHours;
    spareParts: any[];
}

interface Finding {
    taskId: string;
    details: FindingDetail[];
}

interface FindingsWiseSectionProps {
    tasks: Task[];
    findings: Finding[];
}


const FindingsWiseSection: React.FC<FindingsWiseSectionProps> = ({ tasks, findings }) => {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedFinding, setSelectedFinding] = useState<FindingDetail | null>(null);
    const [taskSearch, setTaskSearch] = useState<string>('');
    const [findingSearch, setFindingSearch] = useState<string>('');

    // Get findings for the selected task
    const getFindingsForTask = (taskId: string) => {
        return findings.find((finding) => finding.taskId === taskId)?.details || [];
    };

    // Filter tasks based on search query
    const filteredTasks = tasks.filter((task) =>
        task.sourceTask.toLowerCase().includes(taskSearch.toLowerCase())
    );

    // Filter findings based on search query
    const filteredFindings = selectedTask
        ? getFindingsForTask(selectedTask.sourceTask).filter((finding) =>
            finding.logItem.toLowerCase().includes(findingSearch.toLowerCase())
        )
        : [];

    // Select the first task and its first finding by default
    useEffect(() => {
        if (tasks.length > 0) {
            const firstTask = tasks[0];
            setSelectedTask(firstTask);
            const firstTaskFindings = getFindingsForTask(firstTask.sourceTask);
            if (firstTaskFindings.length > 0) {
                setSelectedFinding(firstTaskFindings[0]);
            }
        }
    }, [tasks, findings]);

    return (
        <>
            <>
                <Card p={10} c='white' bg='#124076'>
                    <Title order={4}>Findings</Title>
                </Card>

                <Card withBorder p={0} h="80vh" bg="none">
                    <Space h="xs" />
                    <Grid h="100%">
                        {/* Left Section: Tasks List */}
                        <Grid.Col span={3}>
                            <Card h="100%" w="100%" p="md" bg="none">
                                <Group>
                                    <Text size="md" fw={500} mb="xs" c='dimmed'>
                                        Source Tasks
                                    </Text>
                                    <Text size="md" fw={500} mb="xs">
                                        {tasks?.length}
                                    </Text>
                                </Group>

                                <TextInput
                                    placeholder="Search tasks..."
                                    value={taskSearch}
                                    onChange={(e) => setTaskSearch(e.target.value)}
                                    mb="md"
                                />

                                {/* Scrollable Tasks List */}
                                <Card
                                    bg="none"
                                    p={0}
                                    h="calc(80vh - 150px)"
                                    style={{
                                        overflowY: 'auto',
                                        scrollbarWidth: 'thin',
                                    }}
                                >
                                    <div style={{ height: '100%', overflowY: 'auto', scrollbarWidth: 'thin', }}>
                                        {filteredTasks.map((task, taskIndex) => (
                                            <Badge
                                                fullWidth
                                                key={taskIndex}
                                                variant={selectedTask?.sourceTask === task.sourceTask ? 'filled' : "light"}
                                                // color="#596FB7"
                                                color="#4C7B8B"
                                                size="lg"
                                                mb='md'
                                                h={35}
                                                radius="md"
                                                onClick={() => {
                                                    setSelectedTask(task);
                                                    setSelectedFinding(null); // Reset selected finding
                                                }}
                                            >
                                                <Text fw={500}>{task.sourceTask}</Text>
                                            </Badge>

                                        ))}
                                    </div>
                                </Card>
                            </Card>
                        </Grid.Col>

                        {/* Middle Section: Findings List */}
                        <Grid.Col span={3}>
                            <Card h="100%" w="100%" p="md" bg="none">
                                <Group>
                                    <Text size="md" fw={500} mb="xs" c='dimmed'>
                                        Findings for
                                    </Text>
                                    <Text size="md" fw={500} mb="xs">
                                        {selectedTask?.sourceTask || 'Selected Task'}
                                    </Text>
                                </Group>
                                <TextInput
                                    // leftSection={
                                    //     <IconError404/>
                                    // }
                                    placeholder="Search findings..."
                                    value={findingSearch}
                                    onChange={(e) => setFindingSearch(e.target.value)}
                                    mb="md"
                                />

                                {/* Scrollable Findings List */}
                                <Card
                                    bg="none"
                                    p={0}
                                    h="calc(80vh - 150px)"
                                    style={{
                                        overflowY: 'auto',
                                        scrollbarWidth: 'thin',
                                    }}
                                >
                                    <div style={{ height: '100%', overflowY: 'auto', scrollbarWidth: 'thin', }}>
                                        {
                                            selectedTask ? (
                                                filteredFindings.map((finding, findingIndex) => (
                                                    <Badge
                                                        fullWidth
                                                        key={findingIndex}
                                                        variant={selectedFinding?.logItem === finding.logItem ? 'filled' : "light"}
                                                        // color="#577BC1"
                                                        color="#4C7B8B"
                                                        size="lg"
                                                        mb='md'
                                                        h={35}
                                                        radius="md"
                                                        onClick={() => setSelectedFinding(finding)}
                                                    >
                                                        <Text fw={500}>{finding.logItem}</Text>
                                                    </Badge>
                                                ))
                                            ) : (
                                                <Text>Select a task to view findings.</Text>
                                            )
                                        }

                                    </div>
                                </Card>
                            </Card>
                        </Grid.Col>

                        {/* Right Section: Selected Finding Details */}
                        <Grid.Col span={6}>
                            <Card
                                radius="xl"
                                h="100%"
                                w="100%"
                                shadow="sm"
                                p="md"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden' // Prevents card from expanding
                                }}
                            >
                                <Space h="lg" />
                                <div
                                    style={{
                                        flex: 1,
                                        overflowY: 'auto',
                                        scrollbarWidth: 'none',
                                        maxHeight: 'calc(70vh - 50px)',
                                        // paddingRight: '10px'
                                    }}
                                >
                                    {selectedFinding ? (
                                        <>
                                            <Grid>
                                                <Grid.Col span={2}>
                                                    <Text size="md" fw={500} c="dimmed">
                                                        Log Item
                                                    </Text>
                                                </Grid.Col>
                                                <Grid.Col span={10}>
                                                    <Text size="sm" fw={500}>
                                                        {selectedFinding?.logItem}
                                                    </Text>
                                                </Grid.Col>
                                            </Grid>

                                            <Space h="sm" />
                                            <Grid>
                                                <Grid.Col span={2}>
                                                    <Text size="md" fw={500} c="dimmed">
                                                        Description
                                                    </Text>
                                                </Grid.Col>
                                                <Grid.Col span={10}>
                                                    <Text size="sm" fw={500}>
                                                        {selectedFinding?.desciption}
                                                    </Text>
                                                </Grid.Col>
                                            </Grid>

                                            <Space h="lg" />
                                            <Card shadow="0" bg="#f5f5f5">
                                                <Grid grow justify="left" align="center">
                                                    <Grid.Col span={2}>
                                                        <Text size="md" fw={500} c="dimmed">
                                                            Probability
                                                        </Text>
                                                    </Grid.Col>
                                                    <Grid.Col span={8}>
                                                        <Progress w="100%" color="#E07B39" radius="md" size="lg" value={selectedFinding?.probability} />
                                                    </Grid.Col>
                                                    <Grid.Col span={2}>
                                                        <Text size="sm" fw={600} c="#E07B39">
                                                            {selectedFinding?.probability} %
                                                        </Text>
                                                    </Grid.Col>
                                                </Grid>
                                            </Card>

                                            <Space h="lg" />

                                            <Text size="md" fw={500} c="dimmed">
                                                Man Hours
                                            </Text>
                                            <SimpleGrid cols={4}>
                                                <Card bg='#daf7de' shadow="0" radius='md'>
                                                    <Group justify="space-between" align="start">
                                                        <Flex direction='column'>
                                                            <Text fz='xs'>Min</Text>
                                                            <Text fz='xl' fw={600}>{selectedFinding?.mhs?.min} hr</Text>
                                                        </Flex>
                                                        <IconClockDown color="green" size='25' />
                                                    </Group>
                                                </Card>
                                                <Card bg='#fcebeb' shadow="0" radius='md'>
                                                    <Group justify="space-between" align="start">
                                                        <Flex direction='column'>
                                                            <Text fz='xs'>Max</Text>
                                                            <Text fz='xl' fw={600}>{selectedFinding?.mhs?.max} Hr</Text>
                                                        </Flex>
                                                        <IconClockUp color="red" size='25' />
                                                    </Group>
                                                </Card>
                                                <Card bg='#f3f7da' shadow="0" radius='md'>
                                                    <Group justify="space-between" align="start">
                                                        <Flex direction='column'>
                                                            <Text fz='xs'>Average</Text>
                                                            <Text fz='xl' fw={600}>{selectedFinding?.mhs?.avg} Hr</Text>
                                                        </Flex>
                                                        <IconClockCode color="orange" size='25' />
                                                    </Group>
                                                </Card>
                                                <Card bg='#dae8f7' shadow="0" radius='md'>
                                                    <Group justify="space-between" align="start">
                                                        <Flex direction='column'>
                                                            <Text fz='xs'>Estimated</Text>
                                                            <Text fz='xl' fw={600}>{selectedFinding?.mhs?.est} Hr</Text>
                                                        </Flex>
                                                        <IconClockCheck color="indigo" size='25' />
                                                    </Group>
                                                </Card>
                                            </SimpleGrid>
                                            <Space h="md" />

                                            <Text size="md" mb="xs" fw={500} c="dimmed">
                                                Spare parts
                                            </Text>
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
                                                    paginationPageSize={10}
                                                    domLayout="autoHeight" // Ensures height adjusts dynamically
                                                    rowData={selectedFinding?.spareParts || []}
                                                    columnDefs={[
                                                        {
                                                            field: "partId",
                                                            headerName: "Part ID",
                                                            sortable: true,
                                                            filter: true,
                                                            floatingFilter: true,
                                                            resizable: true,
                                                            flex: 1
                                                        },
                                                        {
                                                            field: "desc",
                                                            headerName: "Part Desc",
                                                            sortable: true,
                                                            filter: true,
                                                            floatingFilter: true,
                                                            resizable: true,
                                                            flex: 1
                                                        },
                                                        {
                                                            field: "qty",
                                                            headerName: "Qty",
                                                            sortable: true,
                                                            filter: true,
                                                            floatingFilter: true,
                                                            resizable: true,
                                                            flex: 1
                                                        },
                                                        {
                                                            field: "unit",
                                                            headerName: "Unit",
                                                            sortable: true,
                                                            filter: true,
                                                            floatingFilter: true,
                                                            resizable: true,
                                                            flex: 1
                                                        },
                                                        {
                                                            field: "price",
                                                            headerName: "Price($)",
                                                            sortable: true,
                                                            filter: true,
                                                            floatingFilter: true,
                                                            resizable: true,
                                                            flex: 1
                                                        },
                                                    ]}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <Text>Select a finding to view details.</Text>
                                    )}
                                </div>
                            </Card>
                        </Grid.Col>


                    </Grid>
                </Card>
            </>

        </>
    );
};


const PreloadWiseSection: React.FC<{ tasks: any[] }> = ({ tasks }) => {
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [taskSearch, setTaskSearch] = useState<string>('');

    // Filter tasks based on search query
    const filteredTasks = tasks.filter((task) =>
        task.sourceTask.toLowerCase().includes(taskSearch.toLowerCase())
    );

    // Select the first task by default
    useEffect(() => {
        if (tasks.length > 0) {
            setSelectedTask(tasks[0]);
        }
    }, [tasks]);


    return (
        <Card withBorder p={0} h="90vh" bg="none">
            <Card p={10} c='white' bg='#124076'>
                <Title order={4}>
                    Preload
                </Title>
            </Card>
            <Space h="xs" />
            <Grid h="100%">
                {/* Left Section: Tasks List */}
                <Grid.Col span={3}>
                    <Card h="100%" w="100%" p="md" bg="none">
                        <Group>
                            <Text size="md" fw={500} mb="xs" c='dimmed'>
                                Source Tasks
                            </Text>
                            <Text size="md" fw={500} mb="xs">
                                {tasks?.length}
                            </Text>
                        </Group>

                        <TextInput
                            placeholder="Search tasks..."
                            value={taskSearch}
                            onChange={(e) => setTaskSearch(e.target.value)}
                            mb="md"
                        />

                        <Card
                            bg="none"
                            p={0}
                            h="calc(80vh - 150px)"
                            style={{
                                overflowY: 'auto',
                                scrollbarWidth: 'thin',
                            }}
                        >
                            {filteredTasks.map((task, taskIndex) => (
                                <Badge
                                    fullWidth
                                    key={taskIndex}
                                    variant={selectedTask?.sourceTask === task.sourceTask ? 'filled' : "light"}
                                    color="#4C7B8B"
                                    size="lg"
                                    mb='md'
                                    h={35}
                                    radius="md"
                                    onClick={() => setSelectedTask(task)}
                                >
                                    <Text fw={500}>{task.sourceTask}</Text>
                                </Badge>
                            ))}
                        </Card>
                    </Card>
                </Grid.Col>

                {/* Right Section: Selected Task Details */}
                <Grid.Col span={9}>
                    <Card
                        radius="xl"
                        h="100%"
                        w="100%"
                        shadow="sm"
                        p="md"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        <div
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                scrollbarWidth: 'none',
                                maxHeight: 'calc(70vh - 50px)'
                            }}
                        >
                            {selectedTask ? (
                                <>
                                    <Grid>
                                        <Grid.Col span={2}>
                                            <Text size="md" fw={500} c="dimmed">
                                                Source Task
                                            </Text>
                                        </Grid.Col>
                                        <Grid.Col span={10}>
                                            <Text size="sm" fw={500}>
                                                {selectedTask?.sourceTask}
                                            </Text>
                                        </Grid.Col>
                                    </Grid>

                                    <Space h="sm" />
                                    <Grid>
                                        <Grid.Col span={2}>
                                            <Text size="md" fw={500} c="dimmed">
                                                Description
                                            </Text>
                                        </Grid.Col>
                                        <Grid.Col span={10}>
                                            <Text size="sm" fw={500}>
                                                {selectedTask?.desciption}
                                            </Text>
                                        </Grid.Col>
                                    </Grid>

                                    <Space h="lg" />
                                    <Text size="md" fw={500} c="dimmed">
                                        Man Hours
                                    </Text>
                                    <SimpleGrid cols={4}>
                                        <Card bg='#daf7de' shadow="0" radius='md'>
                                            <Group justify="space-between" align="start">
                                                <Flex direction='column'>
                                                    <Text fz='xs'>Min</Text>
                                                    <Text fz='xl' fw={600}>{selectedTask?.mhs?.min} hr</Text>
                                                </Flex>
                                                <IconClockDown color="green" size='25' />
                                            </Group>
                                        </Card>
                                        <Card bg='#fcebeb' shadow="0" radius='md'>
                                            <Group justify="space-between" align="start">
                                                <Flex direction='column'>
                                                    <Text fz='xs'>Max</Text>
                                                    <Text fz='xl' fw={600}>{selectedTask?.mhs?.max} Hr</Text>
                                                </Flex>
                                                <IconClockUp color="red" size='25' />
                                            </Group>
                                        </Card>
                                        <Card bg='#f3f7da' shadow="0" radius='md'>
                                            <Group justify="space-between" align="start">
                                                <Flex direction='column'>
                                                    <Text fz='xs'>Average</Text>
                                                    <Text fz='xl' fw={600}>{selectedTask?.mhs?.avg} Hr</Text>
                                                </Flex>
                                                <IconClockCode color="orange" size='25' />
                                            </Group>
                                        </Card>
                                        <Card bg='#dae8f7' shadow="0" radius='md'>
                                            <Group justify="space-between" align="start">
                                                <Flex direction='column'>
                                                    <Text fz='xs'>Estimated</Text>
                                                    <Text fz='xl' fw={600}>{selectedTask?.mhs?.est} Hr</Text>
                                                </Flex>
                                                <IconClockCheck color="indigo" size='25' />
                                            </Group>
                                        </Card>
                                    </SimpleGrid>

                                    <Space h="md" />
                                    <Text size="md" mb="xs" fw={500} c="dimmed">
                                        Spare Parts
                                    </Text>
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
                                            paginationPageSize={10}
                                            domLayout="autoHeight" // Ensures height adjusts dynamically
                                            rowData={selectedTask?.spareParts || []}
                                            columnDefs={[
                                                {
                                                    field: "partId",
                                                    headerName: "Part ID",
                                                    sortable: true,
                                                    filter: true,
                                                    floatingFilter: true,
                                                    resizable: true,
                                                    flex: 1
                                                },
                                                {
                                                    field: "desc",
                                                    headerName: "Part Desc",
                                                    sortable: true,
                                                    filter: true,
                                                    floatingFilter: true,
                                                    resizable: true,
                                                    flex: 1
                                                },
                                                {
                                                    field: "qty",
                                                    headerName: "Qty",
                                                    sortable: true,
                                                    filter: true,
                                                    floatingFilter: true,
                                                    resizable: true,
                                                    flex: 1
                                                },
                                                {
                                                    field: "unit",
                                                    headerName: "Unit",
                                                    sortable: true,
                                                    filter: true,
                                                    floatingFilter: true,
                                                    resizable: true,
                                                    flex: 1
                                                },
                                                {
                                                    field: "price",
                                                    headerName: "Price($)",
                                                    sortable: true,
                                                    filter: true,
                                                    floatingFilter: true,
                                                    resizable: true,
                                                    flex: 1
                                                },
                                            ]}
                                        />
                                    </div>
                                </>
                            ) : (
                                <Text>Select a task to view details.</Text>
                            )}
                        </div>
                    </Card>
                </Grid.Col>
            </Grid>
        </Card>
    );
};

{/* <Grid>
                                            <Grid.Col span={5}>
                                                <Card shadow="0" bg="#f5f5f5" h='100%'>
                                                <Text size="md" fw={500} c="dimmed">
                                                  Man Hours
                                                </Text>
                                                </Card>
                                            </Grid.Col>
                                            <Grid.Col span={7}>
                                                <Card shadow="0" bg="#f5f5f5">
                                                <Text size="md" mb="xs" fw={500} c="dimmed">
                                                  Spare parts
                                                </Text>
                                                <Table
                                            stickyHeader
                                            striped highlightOnHover
                                        >
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Part Desc</Table.Th>
                                                    <Table.Th>Part Name</Table.Th>
                                                    <Table.Th>Qty</Table.Th>
                                                    <Table.Th>Unit</Table.Th>
                                                    <Table.Th>Price($)</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                           <Table.Tbody> 
                                           {selectedFinding.spareParts.map((part, partIndex) => (
                                        <Table.Tr key={partIndex}>
                                            <Table.Td>{part.partId}</Table.Td>
                                            <Table.Td>{part.desc}</Table.Td>
                                            <Table.Td>{part.qty}</Table.Td>
                                            <Table.Td>{part.unit}</Table.Td>
                                            <Table.Td>{part.price}</Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                                        </Table>
                                                </Card>
                                            </Grid.Col>
                                        </Grid> */}