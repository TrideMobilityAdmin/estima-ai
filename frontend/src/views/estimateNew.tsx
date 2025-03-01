// import { Grid, Title } from "@mantine/core";
import { ActionIcon, Avatar, List, LoadingOverlay, Modal, NumberInput, Paper, SegmentedControl, Select, Stack, Tooltip } from "@mantine/core";
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
    XLSX,
} from "../constants/GlobalImports";
import { AreaChart } from "@mantine/charts";
import '../App.css';
import { IconChartArcs3, IconCheck, IconCircleCheck, IconClipboard, IconClipboardCheck, IconClock, IconClockCheck, IconClockCode, IconClockDown, IconClockShare, IconClockUp, IconDownload, IconError404, IconFileCheck, IconListCheck, IconListDetails, IconLoader, IconMinimize, IconReport, IconSettingsDollar, IconStatusChange } from "@tabler/icons-react";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useApi } from "../api/services/estimateSrvice";
import { baseUrl, getEstimateReport_Url } from "../api/apiUrls";
import RFQUploadDropZoneExcel from "../components/rfqUploadDropzone";
import robotGif from "../../public/7efs.gif";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import CsvDownloadButton from "react-json-to-csv";
import { showAppNotification } from "../components/showNotificationGlobally";
import SkillRequirementAnalytics from "./skillReqAnalytics";
import { useApiSkillAnalysis } from "../api/services/skillsService";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function EstimateNew() {
    const { postEstimateReport, validateTasks, RFQFileUpload, getAllEstimatesStatus, getEstimateByID, downloadEstimatePdf, getProbabilityWiseDetails } = useApi();
    const { getSkillAnalysis } = useApiSkillAnalysis();
    const [value, setValue] = useState('estimate');
    const [opened, setOpened] = useState(false);
    const [probOpened, setProbOpened] = useState(false);
    const [selectedEstimateId, setSelectedEstimateId] = useState<any>();
    const [selectedDownloadEstimateId, setSelectedDownloadEstimateId] = useState<any>();
    const [selectedEstimateIdReport, setSelectedEstimateIdReport] = useState<any>();
    const [selectedEstimateIdProbability, setSelectedEstimateIdProbability] = useState<any>();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extractedTasks, setExtractedTasks] = useState<string[]>([]);
    const [rfqSubmissionResponse, setRfqSubmissionResponse] = useState<any>(null);
    const [rfqSubModalOpened, setRfqSubModalOpened] = useState(false);
    const [estimatesStatusData, setEstimatesStatusData] = useState<any[]>([]);
    const [selectedEstimateTasks, setSelectedEstimateTasks] = useState<string[]>([]);
    const [estimateReportData, setEstReportData] = useState<any>(null);
    const [estimateReportloading, setEstimateReportLoading] = useState(false); // Add loading state
    const [validatedTasks, setValidatedTasks] = useState<any[]>([]);
    const [validatedSkillsTasks, setValidatedSkillsTasks] = useState<any[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const [isValidating2, setIsValidating2] = useState(false);
    const [probabilityWiseData, setProbabilityWiseData] = useState<any>(null);
    const [isProbWiseLoading, setIsProbLoading] = useState(false);
    const [skillAnalysisData, setSkillAnalysisData] = useState<any>(null);

    // const [tasks, setTasks] = useState<string[]>([]);
    // const [estimateId, setEstimateId] = useState<string>("");
    const [generatedEstimateId, setGeneratedEstimateId] = useState<string>("");
    const [loading, setLoading] = useState(false); // Add loading state
    // const [validatedTasks, setValidatedTasks] = useState<any[]>([]);
    // const [isLoading, setIsLoading] = useState(false);


    const fetchEstimatesStatus = async () => {
        setLoading(true);
        const data = await getAllEstimatesStatus();
        if (data) {
            setEstimatesStatusData(data?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
        setLoading(false);
    };
    useEffect(() => {
        fetchEstimatesStatus();
        const intervalId = setInterval(fetchEstimatesStatus, 15000);
        return () => clearInterval(intervalId);
    }, []);

    console.log("all estimates status>>>", estimatesStatusData);
    console.log("selected estimate tasks >>>>", selectedEstimateTasks);

    // Handle file and extracted tasks
    // Handle file and extracted tasks
    const handleFileChange = async (file: File | null, tasks: string[]) => {
        setIsValidating(true);
        setSelectedFile(file);
        setExtractedTasks(tasks ?? []); // Ensure tasks is always an array
        console.log("✅ Selected File:", file ? file.name : "None");
        console.log("📌 Extracted Tasks:", tasks.length > 0 ? tasks : "No tasks found");


        console.log("Extracted Tasks:", tasks);
        const response = await validateTasks(tasks);
        setValidatedTasks(response);
        setIsValidating(false);

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

    // 🟢 Function to validate tasks & update UI
    const handleValidateTasks = async (tasks: string[]) => {
        setIsValidating(true);
        const response = await validateTasks(tasks);

        if (response.length > 0) {
            setValidatedTasks(response);
            setValidatedSkillsTasks(response);
        }
        setIsValidating(false);
    };

    const handleValidateSkillsTasks = async (tasks: string[]) => {
        setIsValidating2(true);
        const response = await validateTasks(tasks);

        if (response.length > 0) {
            setValidatedSkillsTasks(response);
        }
        setIsValidating2(false);
    }

    const downloadCSV = (status: boolean) => {
        const filteredTasks = validatedTasks?.filter((task) => task?.status === status);
        const csvHeaders = ["Estimate ID", "Tasks", "Status"];
        const csvData = filteredTasks?.map((task) => [
            selectedEstimateId,  // Include the selectedEstimateId for each task
            task?.taskid || 0,
            task?.status ? "Available" : "Not Available",
        ]);

        // Convert array to CSV format
        const csvContent =
            "data:text/csv;charset=utf-8," +
            [csvHeaders, ...csvData].map((e) => e.join(",")).join("\n");

        // Create a download link and trigger click
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Estimate_${selectedEstimateId}_${status ? 'Available' : 'NotAvailable'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadExcel = (status: boolean) => {
        const filteredTasks = validatedTasks?.filter((task) => task?.status === status);

        // Prepare data with selectedEstimateId
        const excelData = filteredTasks?.map((task) => ({
            "Estimate ID": selectedEstimateId,
            "Tasks": task?.taskid || 0,
            "Status": task?.status ? "Available" : "Not Available",
        }));

        // Create a worksheet and book
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tasks");

        // Download the Excel file
        XLSX.writeFile(wb, `Estimate_${selectedEstimateId}_${status ? 'Available' : 'NotAvailable'}.xlsx`);
    };

    // Handle extracted tasks
    // const handleTasks = (extractedTasks: string[]) => {
    //     setTasks(extractedTasks);
    //     console.log("tasks :", extractedTasks);
    // };

    //  Extracted tasks are passed to validation API
    // const handleTasks = async (extractedTasks: string[]) => {
    //     setIsLoading(true);
    //     setTasks(extractedTasks);

    //     console.log("Extracted Tasks:", extractedTasks);
    //     const response = await validateTasks(extractedTasks);
    //     setValidatedTasks(response);
    //     setIsLoading(false);

    //     const invalidTasks = response?.filter((task) => task?.status === false);
    //     if (invalidTasks.length > 0) {
    //         showNotification({
    //             title: "Tasks Not Available!",
    //             message: `${invalidTasks.length} tasks are not available. Only valid tasks will be used to generate Estimate.`,
    //             color: "orange",
    //             style: { position: "fixed", top: 100, right: 20, zIndex: 1000 },
    //         });
    //     }
    // }

    // Form initialization
    const form = useForm({
        initialValues: {
            probability: "",
            operator: "",
            aircraftRegNo: "",
            aircraftAge: "",
            aircraftFlightHours: "",
            aircraftFlightCycles: "",
        },

        // validate: {
        //     probability: (value) => (value ? null : "Probability is required"),
        //     operator: (value) => (value.trim() ? null : "Operator is required"),
        //     aircraftRegNo: (value) => (value.trim() ? null : "RegNo is required"),
        //     aircraftAge: (value) => (value.trim() ? null : "Aircraft Age is required"),
        //     aircraftFlightHours: (value) => (value.trim() ? null : "Flight Hours are required"),
        //     aircraftFlightCycles: (value) => (value.trim() ? null : "Flight Cycles are required"),
        // },
    });

    // Handle Submit
    const handleSubmit = async () => {
        if (!selectedFile) {
            showNotification({
                title: "Error",
                message: "Please select a file",
                color: "red",
            });
            return;
        }

        const requestData = {
            tasks: extractedTasks || [],
            probability: Number(form.values.probability) || 0,
            operator: form.values.operator || "",
            aircraftRegNo: form.values.aircraftRegNo || "",
            aircraftAge: Number(form.values.aircraftAge) || 0,
            aircraftFlightHours: Number(form.values.aircraftFlightHours) || 0,
            aircraftFlightCycles: Number(form.values.aircraftFlightCycles) || 0,
        };

        console.log("Submitting data:", requestData);

        try {
            setLoading(true);
            const response = await RFQFileUpload(requestData, selectedFile);
            console.log("RFQ API Response:", response);

            if (response) {
                setRfqSubmissionResponse(response);
                setRfqSubModalOpened(true);
                showAppNotification("success", "Success!", "Estimate report submitted successfully!");
                setValidatedTasks([]);
            }
        } catch (error) {
            console.error("API Error:", error);
            showAppNotification("error", "Error!", "Failed to submit estimate report.!");
            showNotification({
                title: "Error",
                message: "Failed to submit estimate report.",
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    console.log("rfq sub >>> ", rfqSubmissionResponse);

    const handleSubmitSkills = async () => {
        const validTasks = validatedSkillsTasks?.filter((task) => task?.status === true)?.map((task) => task?.taskid);

        if (validTasks.length === 0) {
            // showAppNotification("warning", "Warning!", "No valid tasks available to estimate the report.");
            return null; // Return null to indicate no response
        }

        const requestData = {
            source_tasks: validTasks,
        };

        console.log("Submitting data:", requestData);

        try {
            setLoading(true);
            const response = await getSkillAnalysis(requestData);
            console.log("API Response:", response);

            // if (response) {
            setSkillAnalysisData(response);
            // showAppNotification("success", "Success!", "Successfully Generated Skill Analysis");
            return response; // Return the response
            // }
        } catch (error) {
            // showAppNotification("error", "Error!", "Failed Generating Skill Analysis, try again");
            console.error("API Error:", error);
        } finally {
            setLoading(false);
        }
        return null; // Return null if no response
    };

    useEffect(()=>{
        handleSubmitSkills()
    },[validatedSkillsTasks]);

    console.log("skillAnalysisData", skillAnalysisData);


    // const handleBothSubmissions = async () => {
    //     try {
    //         setLoading(true);
    //         await handleSubmit(); // Call the first function
    //         await handleSubmitSkills(); // Call the second function
    //     } catch (error) {
    //         console.error("Error during submission:", error);
    //         showNotification({
    //             title: "Error",
    //             message: "An error occurred during submission.",
    //             color: "red",
    //         });
    //     } finally {
    //         setLoading(false);
    //     }
    // };
    const handleCloseModal = () => {
        setRfqSubModalOpened(false);
        setSelectedFile(null); // Clear selected file
        setExtractedTasks([]); // Clear extracted tasks
        form.reset();
        fetchEstimatesStatus();
    };

    const fetchEstimateById = async (id: string) => {
        if (!id) return;
        setEstimateReportLoading(true);
        const data = await getEstimateByID(id);
        if (data) {
            setEstReportData(data);
        }
        setEstimateReportLoading(false);
    };

    // Call API when `selectedEstimateId` changes
    useEffect(() => {
        if (selectedEstimateIdReport) {
            fetchEstimateById(selectedEstimateIdReport);
        }
    }, [selectedEstimateIdReport]);
    console.log("estimate report >>>>", estimateReportData);

    const fetchProbabilityWisedata = async (id: string) => {
        if (!id) return;
        setIsProbLoading(true);
        const data = await getProbabilityWiseDetails(id);
        if (data) {
            setProbabilityWiseData(data);
        }
        setIsProbLoading(false);
    };

    // Call API when `selectedEstimateId` changes
    useEffect(() => {
        if (selectedEstimateIdProbability) {
            fetchProbabilityWisedata(selectedEstimateIdProbability);
        }
    }, [selectedEstimateIdProbability]);
    console.log("probabilityWiseData  >>>>", probabilityWiseData);

    // Transform data for the chart
    const transformedData = probabilityWiseData?.estProb?.map((item: any) => ({
        prob: Math.round(item?.prob * 100), // Multiply by 100 and round
        totalManhrs: item?.totalManhrs,
        totalSpareCost: item?.totalSpareCost,
    }));


    const [downloading, setDownloading] = useState(false);

    const handleDownload = (id: any) => {
        downloadEstimatePdf(id);
    }

    const probabilityData = {
        "estId": "1234",
        "probData": [
            {
                prob: 0,
                totalManHrs: 500,
                totalSparesCost: 3000
            },
            {
                prob: 0.1,
                totalManHrs: 490,
                totalSparesCost: 2900
            },
            {
                prob: 0.2,
                totalManHrs: 450,
                totalSparesCost: 2800
            },
            {
                prob: 0.3,
                totalManHrs: 430,
                totalSparesCost: 2700
            },
            {
                prob: 0.4,
                totalManHrs: 410,
                totalSparesCost: 2600
            },
            {
                prob: 0.5,
                totalManHrs: 390,
                totalSparesCost: 2500
            },
            {
                prob: 0.6,
                totalManHrs: 370,
                totalSparesCost: 2400
            },
            {
                prob: 0.7,
                totalManHrs: 350,
                totalSparesCost: 2300
            },
            {
                prob: 0.8,
                totalManHrs: 320,
                totalSparesCost: 2200
            },
            {
                prob: 0.9,
                totalManHrs: 310,
                totalSparesCost: 2100
            },
            {
                prob: 1.0,
                totalManHrs: 300,
                totalSparesCost: 2000
            },
        ]
    }

    // const handleSubmit = async () => {
    //     // const validTasks = validatedTasks?.filter((task) => task?.status === true)?.map((task) => task?.taskid);

    //     if (!form.isValid()) {
    //         form.validate();
    //         return;
    //     }

    //     if (extractedTasks?.length === 0) {
    //         showNotification({
    //             title: "Error",
    //             message: "Tasks are required",
    //             color: "red",
    //             style: { position: "fixed", top: 20, right: 20, zIndex: 1000 },
    //         });
    //         return;
    //     }

    //     const requestData = {
    //         tasks: extractedTasks,
    //         probability: Number(form.values.probability),
    //         operator: form.values.operator,
    //         aircraftAge: Number(form.values.aircraftAge),
    //         aircraftFlightHours: Number(form.values.aircraftFlightHours),
    //         aircraftFlightCycles: Number(form.values.aircraftFlightCycles),
    //     };

    //     console.log("Submitting data:", requestData);

    //     try {
    //         setLoading(true);
    //         const response = await postEstimateReport(requestData);
    //         console.log("API Response:", response);

    //         if (response) {
    //             setEstReportData(response);
    //             setEstimateId(response?.estID);
    //             showNotification({
    //                 title: "Success",
    //                 message: "Estimate report submitted successfully!",
    //                 color: "green",
    //             });
    //         }
    //     } catch (error) {
    //         showNotification({
    //             title: "Submission Failed",
    //             message: "An error occurred while submitting the estimate report.",
    //             color: "red",
    //         });
    //         console.error("API Error:", error);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // useEffect(() => {
    //     console.log("Updated UI response:", estimateReportData);
    // }, [estimateReportData]);
    // console.log("response UI >>>>", estimateReportData);

    return (
        <>
            <Modal
                opened={rfqSubModalOpened}
                onClose={() => {
                    //   setRfqSubModalOpened(false);
                    //   form.reset();
                }}
                size={600}
                title={`Estimate Created !`}
                radius="lg"
                padding="xl"
                centered
                withCloseButton={false}
                closeOnClickOutside={false}
                styles={{
                    // content: { backgroundColor: "#e8f5e9" }, // Light green shade
                    // header: { backgroundColor: "#e0f2f1" }, // Slightly different green for header
                    // content: { backgroundColor: "#d4e1fc" },
                    header: { backgroundColor: "#d4e1fc" },
                }}
            >
                {rfqSubmissionResponse && (

                    <div>
                        <Group justify="center">
                            <Avatar h={150} w={150} src={robotGif} />
                        </Group>

                        <Group justify="center">

                            <Group justify="center">
                                <Badge
                                    variant="light"
                                    color="cyan"
                                    size="lg"
                                    radius="md"
                                    className="px-6 py-3"
                                >
                                    <Group gap="xs">
                                        <IconCheck size={16} />
                                        <Text>{rfqSubmissionResponse?.status}</Text>
                                    </Group>
                                </Badge>
                            </Group>
                            <Text size="sm" fw={600}>

                            </Text>
                        </Group>
                        <Space h='sm' />

                        <Group justify="center">
                            <Text size="sm" fw={500} ta="center" className="text-gray-700">
                                {rfqSubmissionResponse?.msg}
                            </Text>
                        </Group>
                        <Space h='sm' />

                        <Box>
                            <Divider my="sm" />
                            <Group justify="center" gap="xs">
                                <Text size="sm" c="dimmed">
                                    Estimate ID:
                                </Text>
                                <Text fw={600} c="green">
                                    {rfqSubmissionResponse?.estID || "-"}
                                </Text>
                            </Group>
                        </Box>
                        <Space h='lg' />
                        <Group justify="center">
                            <Button onClick={handleCloseModal} size="sm" variant="filled" color="indigo">Close</Button>
                        </Group>

                    </div>
                )}
            </Modal>
            <Modal
                opened={opened}
                onClose={() => {
                    setOpened(false);
                    //   form.reset();
                }}
                size={600}
                title={
                    <>
                        <Group justify="space-between">
                            <Group>
                                <Badge variant="filled" color="teal" radius='sm' size="lg">{selectedEstimateTasks?.length}</Badge>
                                <Text c='gray' fw={600}>
                                    Tasks for :
                                </Text>
                                <Text fw={600}>
                                    {selectedEstimateId}
                                </Text>
                            </Group>


                            <Group>
                                <Tooltip label="Download Available Tasks">
                                    <Button
                                        size="xs"
                                        color="green"
                                        variant="light"
                                        rightSection={<IconDownload size='18' />}
                                        onClick={() => downloadCSV(true)}
                                    >
                                        {validatedTasks?.filter((ele) => ele?.status === true)?.length}
                                    </Button>
                                    {/* <ActionIcon size={25} color="green" variant="light" onClick={() => downloadCSV(true)}>
                                        <IconDownload />
                                    </ActionIcon> */}
                                </Tooltip>

                                {/* Button for Not Available Tasks */}
                                <Tooltip label="Download Not Available Tasks">
                                    <Button
                                        size="xs"
                                        color="blue"
                                        variant="light"
                                        rightSection={<IconDownload size='18' />}
                                        onClick={() => downloadCSV(false)}
                                    >
                                        {validatedTasks?.filter((ele) => ele?.status === false)?.length}
                                    </Button>
                                    {/* <ActionIcon size={25} color="blue" variant="light" onClick={() => downloadCSV(false)}>
                                        <IconDownload />
                                    </ActionIcon> */}
                                </Tooltip>
                            </Group>

                        </Group>
                        <Space h='sm' />
                    </>
                }
                scrollAreaComponent={ScrollArea.Autosize}
            >

                {
                    isValidating ? (
                        <LoadingOverlay
                            visible={isValidating}
                            zIndex={1000}
                            overlayProps={{ radius: 'sm', blur: 2 }}
                            loaderProps={{ color: 'indigo', type: 'bars' }}
                        />) : (
                        <SimpleGrid cols={4}>
                            {validatedTasks?.map((task, index) => {
                                const badgeColor = task?.status ? "green" : "blue"; // Blue for true, Orange for false
                                return task?.taskid?.length > 12 ? (
                                    <Tooltip key={index} label={task?.taskid} withArrow position="top">
                                        <Badge
                                            fullWidth
                                            key={index}
                                            color={badgeColor}
                                            variant="light"
                                            radius='sm'
                                            style={{ margin: "0.25em" }}
                                        >
                                            {task?.taskid}
                                        </Badge>
                                    </Tooltip>
                                ) : (
                                    <Badge
                                        fullWidth
                                        key={index}
                                        color={badgeColor}
                                        variant="light"
                                        radius='sm'
                                        style={{ margin: "0.25em" }}
                                    >
                                        {task?.taskid}
                                    </Badge>
                                )
                            })}
                        </SimpleGrid>
                    )
                }




            </Modal>
            <Modal
                opened={probOpened}
                onClose={() => {
                    setProbOpened(false);
                    //   form.reset();
                }}
                size={800}
                title={
                    <>
                        <Group>
                            <Title order={4} c='dimmed'>
                                Probability wise Details
                            </Title>
                            <Title order={4} >
                                {selectedEstimateIdProbability}
                            </Title>
                        </Group>

                    </>
                }
            >
                {
                    isProbWiseLoading && (
                        <LoadingOverlay
                            visible={isProbWiseLoading}
                            zIndex={1000}
                            overlayProps={{ radius: 'sm', blur: 2 }}
                            loaderProps={{ color: 'indigo', type: 'bars' }}
                        />
                    )
                }

                <Group p={10}>
                    <AreaChart
                        h={350}
                        //   data={probabilityData?.probData || []}
                        data={transformedData || []}
                        dataKey="prob"
                        withLegend
                        withTooltip
                        xAxisLabel="Probability (%)"
                        yAxisLabel="Value"
                        series={[
                            { name: 'totalManhrs', color: 'green.6' },
                            { name: 'totalSpareCost', color: 'blue.6' },
                        ]}
                        curveType="linear"
                    />
                </Group>

            </Modal>


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
                                <RFQUploadDropZoneExcel
                                    name="Excel Files"
                                    changeHandler={handleFileChange}
                                    selectedFile={selectedFile} // Pass selectedFile as prop
                                    setSelectedFile={setSelectedFile} // Pass setSelectedFile as prop
                                    color="green" // Optional custom border color
                                />
                            </Group>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={5}>
                        <Card withBorder h='50vh' radius='md'>

                            <LoadingOverlay
                                visible={isValidating}
                                zIndex={1000}
                                overlayProps={{ radius: 'sm', blur: 2 }}
                                loaderProps={{ color: 'indigo', type: 'bars' }}
                            />

                            {/* <Group justify="space-between">
                                <Group mb='xs' align="center" >
                                    <Text size="md" fw={500}>
                                        Tasks Available
                                    </Text>
                                    {
                                        extractedTasks?.length > 0 ? (
                                            <Badge ta='center' color="indigo" size="md" radius="lg">
                                                {extractedTasks?.length || 0}
                                            </Badge>
                                        ) : (
                                            <Badge variant="light" ta='center' color="indigo" size="md" radius="lg">
                                                0
                                            </Badge>
                                        )
                                    }
                                </Group>
                            </Group> */}
                            <Group justify="space-between">
                                <Group mb='xs' align="center" >
                                    <Text size="md" fw={500}>
                                        Tasks Available
                                    </Text>
                                    {
                                        validatedTasks?.length > 0 ? (
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
                            {/* <ScrollArea
                                style={{
                                    flex: 1, // Take remaining space for scrollable area
                                    overflow: "auto",
                                }}
                                offsetScrollbars
                                scrollHideDelay={1}
                            >
                                {extractedTasks?.length > 0 ? (
                                    <SimpleGrid cols={4}>

                                         {extractedTasks?.map((task, index) => (
                                            <Badge
                                                key={index}
                                                color='blue'
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
                            </ScrollArea> */}
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
                                    {/* <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Probability"
                                        {...form.getInputProps("probability")}
                                    /> */}
                                    <NumberInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex: 0.5"
                                        label="Select Probability"
                                        min={10}
                                        max={100}
                                        step={10}
                                        //   precision={2}
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
                                        placeholder="Ex:N734AB, SP-LR"
                                        label="Aircraft Reg No"
                                        {...form.getInputProps("aircraftRegNo")}
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

                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex: Area"
                                        label="Area of Operations"
                                        {...form.getInputProps("areaOfOperations")}
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
                        disabled={extractedTasks?.length > 0 ? false : true}
                        leftSection={<MdLensBlur size={14} />}
                        rightSection={<MdOutlineArrowForward size={14} />}
                    >
                        Generate Estimate
                    </Button>
                </Group>

                <Space h='sm' />
                <Card>
                    <Group align="center" gap='sm'>
                        <ThemeIcon variant="light">
                            <IconReport />
                        </ThemeIcon>
                        <Title order={5} >
                            Estimates Status
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
                            paginationPageSize={10}
                            domLayout="autoHeight" // Ensures height adjusts dynamically
                            rowData={estimatesStatusData || []}
                            columnDefs={[
                                {
                                    field: "createdAt",
                                    headerName: "Date",
                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    flex: 1,
                                    cellRenderer: (params: any) => {
                                        if (!params.value) return null; // Handle empty values

                                        // Parse the provided timestamp string to a Date object
                                        const date = new Date(params.value);

                                        // Manually add +5 hours and 30 minutes to the date for IST
                                        const istOffsetInMilliseconds = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
                                        date.setTime(date.getTime() + istOffsetInMilliseconds); // Adjust time

                                        // Format the adjusted date to the desired format
                                        const day = date.getDate().toString().padStart(2, "0");
                                        const month = date.toLocaleString("default", { month: "short" });
                                        const year = date.getFullYear();
                                        const hours = date.getHours().toString().padStart(2, "0");
                                        const minutes = date.getMinutes().toString().padStart(2, "0");
                                        const seconds = date.getSeconds().toString().padStart(2, "0");

                                        // Combine all parts into the formatted string
                                        const formattedDate = `${day}-${month}-${year}, ${hours}:${minutes}:${seconds}`;


                                        return <Text mt="xs">{formattedDate}</Text>;
                                    },
                                },
                                {
                                    field: "estID",
                                    headerName: "Estimate ID",
                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    flex: 1,
                                    // cellRenderer: (params: any) => (
                                    //     <Text
                                    //         mt='xs'
                                    //         style={{
                                    //             cursor: "pointer",
                                    //             color: "blue",
                                    //             textDecoration: "underline",
                                    //         }}
                                    //         onClick={() => {
                                    //             setSelectedEstimateId(params.data.estID);
                                    //             setSelectedEstimateTasks(params.data.tasks);
                                    //             handleValidateTasks(params.data.tasks);
                                    //             setOpened(true);
                                    //         }}
                                    //     >
                                    //         {params.value}
                                    //     </Text>
                                    // ),
                                },
                                {
                                    field: "aircraftRegNo",
                                    headerName: "Aircraft Reg No",
                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    flex: 1
                                },
                                {
                                    field: "totalMhs",
                                    headerName: "Total ManHrs (Hr)",
                                    sortable: true,
                                    // filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    flex: 1,
                                    cellRenderer: (params: any) => (
                                        <Text
                                            mt='xs'
                                        >
                                            {params.value.toFixed(2)}
                                        </Text>
                                    ),
                                },
                                {
                                    field: "totalPartsCost",
                                    headerName: "Total Cost ($)",
                                    sortable: true,
                                    // filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    flex: 1,
                                    cellRenderer: (params: any) => (
                                        <Text
                                            mt='xs'
                                        >
                                            {params.value.toFixed(2)}
                                        </Text>
                                    ),
                                },
                                {
                                    field: "status",
                                    headerName: "Status",
                                    sortable: true,
                                    filter: true,
                                    floatingFilter: true,
                                    resizable: true,
                                    flex: 1,
                                    cellRenderer: (val: any) => {
                                        let badgeColor: string;
                                        let badgeIcon: JSX.Element;

                                        // Using switch case for status color and icon mapping
                                        switch (val.data.status.toLowerCase()) {
                                            case "completed":
                                                badgeColor = "#10b981"; // Green
                                                badgeIcon = <IconCircleCheck size={15} />; // Check circle badgeIcon
                                                break;
                                            case "progress":
                                                badgeColor = "#f59e0b"; // Amber/Orange
                                                badgeIcon = <IconLoader size={15} />; // Spinner badgeIcon (you can add CSS for the spinning effect)
                                                break;
                                            case "initiated":
                                                badgeColor = "#3b82f6"; // Light Blue
                                                badgeIcon = <IconClockUp size={15} />; // Play badgeIcon
                                                break;
                                            case "csv generated":
                                                badgeColor = "#9333ea"; // Purple
                                                badgeIcon = <IconFileCheck size={15} />; // File CSV badgeIcon
                                                break;
                                            default:
                                                badgeColor = "gray"; // Default color if status is not found
                                                badgeIcon = <IconFileCheck size={15} />; // Default badgeIcon (optional)
                                        }

                                        return (
                                            <Badge
                                                mt="xs"
                                                variant="light"
                                                fullWidth
                                                color={badgeColor}
                                                rightSection={badgeIcon}
                                            >
                                                {val.data.status}
                                            </Badge>
                                        );
                                    },
                                },
                                {
                                    // field: "actions",
                                    headerName: "Actions",
                                    // sortable: true,
                                    // filter: true,
                                    // floatingFilter: true,
                                    flex: 1,
                                    resizable: true,
                                    // editable: true,
                                    cellRenderer: (val: any) => {
                                        return (
                                            <Group mt='xs' align="center" justify="center">
                                                <Tooltip label="Show Tasks">
                                                    <ActionIcon
                                                        size={20}
                                                        color="indigo"
                                                        variant="light"
                                                        onClick={() => {
                                                            setSelectedEstimateId(val.data.estID);
                                                            setSelectedEstimateTasks(val.data.tasks);
                                                            handleValidateTasks(val.data.tasks);
                                                            setOpened(true);
                                                        }}

                                                    >
                                                        <IconListCheck />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Get Estimate">
                                                    <ActionIcon
                                                        size={20}
                                                        color="teal"
                                                        variant="light"
                                                        disabled={val?.data?.status?.toLowerCase() !== "completed"}
                                                        onClick={() => {
                                                            setSelectedEstimateIdReport(val.data.estID);
                                                            handleValidateSkillsTasks(val.data.tasks);
                                                            // setOpened(true);
                                                        }}
                                                    >
                                                        <IconReport />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Download Estimate">
                                                    <ActionIcon
                                                        size={20}
                                                        color="lime"
                                                        variant="light"
                                                        disabled={val?.data?.status?.toLowerCase() !== "completed"}
                                                        onClick={(values: any) => {
                                                            setSelectedDownloadEstimateId(val?.data?.estID);
                                                            handleDownload(val?.data?.estID);
                                                            // setAction("edit");
                                                            // setOpened(true);
                                                            // form.setValues(val?.data);
                                                        }}
                                                    >
                                                        <IconDownload />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Probability Details">
                                                    <ActionIcon
                                                        size={20}
                                                        color="rgba(156, 104, 0, 1)"
                                                        variant="light"
                                                        disabled={val?.data?.status?.toLowerCase() !== "completed"}
                                                        onClick={(values: any) => {
                                                            setProbOpened(true);
                                                            setSelectedEstimateIdProbability(val?.data?.estID);
                                                        }}
                                                    >
                                                        <IconChartArcs3 />
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
                <Space h='sm' />

                <SegmentedControl
                    color="indigo"
                    bg='white'
                    value={value}
                    onChange={setValue}
                    data={[
                        { label: 'Estimate', value: 'estimate' },
                        { label: 'Skill', value: 'skill' },
                    ]}
                />

                <Space h='sm' />
                {
                    estimateReportData !== null ? (
                        <Group>
                                                <Title order={4} c='gray'>
                                                    Selected Estimate  :
                                                </Title>
                                                <Title order={4}>
                                                    {estimateReportData?.estID || "-"}
                                                </Title>
                                            </Group>
                    ) : (
                        <></>
                    )
                }
                
                {
                    value === 'estimate' ? (
                        <>
                            {
                                estimateReportData !== null ? (
                                    <>
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
                                            <Group>
                                                <Title order={4} c='gray'>
                                                    Overall Estimate Report 
                                                </Title>
                                                {/* <Title order={4}>
                                                    {estimateReportData?.estID || "-"}
                                                </Title> */}
                                            </Group>

                                            {/* <Button
                                                size="xs"
                                                variant="filled"
                                                color="#1bb343"
                                                leftSection={<MdPictureAsPdf size={14} />}
                                                rightSection={<MdOutlineFileDownload size={14} />}
                                                onClick={handleDownload}
                                                loading={downloading}
                                            >
                                                {downloading ? "Downloading..." : "Download Estimate"}
                                            </Button> */}
                                        </Group>

                                        <Space h='sm' />

                                        <OverallEstimateReport
                                            totalTATTime={44}
                                            estimatedManHrs={{ min: 40, estimated: 66, max: 46, capping: 46 }}
                                            cappingUnbilledCost={44}
                                            parts={[
                                                { partDesc: "Bolt", partName: "M12 Bolt", qty: 4, price: 10 },
                                                { partDesc: "Screw", partName: "Wood Screw", qty: 2, price: 5 },
                                            ]}
                                            estimatedSparesCost={44}
                                            spareCostData={[
                                                { date: "Min", Cost: 100 },
                                                { date: "Estimated", Cost: 800 },
                                                { date: "Max", Cost: 1000 },
                                            ]}
                                        />
                                        <Space h='xl' />

                                        {/* <FindingsWiseSection tasks={jsonData?.tasks} findings={jsonData.findings} /> */}
                                        <FindingsWiseSection tasks={estimateReportData?.tasks} findings={estimateReportData?.findings} />

                                        <Space h='md' />
                                        {/* <PreloadWiseSection tasks={jsonData?.tasks} /> */}
                                        <PreloadWiseSection tasks={estimateReportData?.tasks} />
                                    </>
                                ) : (
                                    <></>
                                )
                            }
                        </>
                    ) : (
                        <>
                            <SkillRequirementAnalytics skillAnalysisData={skillAnalysisData} />
                        </>
                    )
                }



            </div>
        </>
    )
}


// Define types for the data
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
    description: string;
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

interface Part {
    partDesc: string;
    partName: string;
    qty: number;
    price: number;
}

interface ChartData {
    date: string;
    Cost: number;
}

interface TATDashboardProps {
    totalTATTime: number;
    estimatedManHrs: { min: number; estimated: number; max: number; capping: number };
    cappingUnbilledCost: number;
    parts: Part[];
    estimatedSparesCost: number;
    spareCostData: ChartData[];
}

const OverallEstimateReport: React.FC<TATDashboardProps> = ({
    totalTATTime,
    estimatedManHrs,
    cappingUnbilledCost,
    parts,
    estimatedSparesCost,
    spareCostData,
}) => {
    return (
        <SimpleGrid cols={3} spacing="xs">
            {/* Left Section */}
            <Flex justify="flex-start" align="flex-start" direction="column">
                {/* Total TAT Time */}
                <Card withBorder w="100%" p={5}>
                    <Group p={0} gap="sm">
                        <ThemeIcon variant="light" radius="md" size="60" color="#124076">
                            <IconClockShare style={{ width: "70%", height: "70%" }} />
                        </ThemeIcon>
                        <Flex direction="column">
                            <Text size="md" fw={500} fz="h6" c="gray">
                                Total TAT Time
                            </Text>
                            <Text size="md" fw={600} fz="h3">
                                {totalTATTime}
                            </Text>
                        </Flex>
                    </Group>
                </Card>
                <Space h="sm" />

                {/* Estimated Man Hours */}
                <Card withBorder w="100%">
                    <Flex gap="lg" direction="column">
                        <Title order={6} c="gray">
                            Est Man Hrs.
                        </Title>
                        {Object?.entries(estimatedManHrs)?.map(([key, value]: any) => (
                            <Grid key={key} justify="flex-start" align="center">
                                <Grid.Col span={3}>
                                    <Text fz="sm">{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                                </Grid.Col>
                                <Grid.Col span={9}>
                                    <Group justify="flex-end" fz="xs" fw="600" c={key === "max" ? "blue.5" : key === "estimated" ? "indigo.5" : key === "capping" ? "cyan.5" : "teal.7"}>
                                        {value} Hrs
                                    </Group>
                                    <Progress color={key === "max" ? "blue.5" : key === "estimated" ? "indigo.5" : key === "capping" ? "cyan.5" : "teal.7"} value={value} />
                                </Grid.Col>
                            </Grid>
                        ))}
                    </Flex>
                </Card>
                <Space h="sm" />

                {/* Capping Unbilled Cost */}
                <Card withBorder w="100%" p={5}>
                    <Group p={0} gap="sm">
                        <ThemeIcon variant="light" radius="md" size="60" color="#124076">
                            <IconSettingsDollar style={{ width: "70%", height: "70%" }} />
                        </ThemeIcon>
                        <Flex direction="column">
                            <Text size="md" fw={500} fz="h6" c="gray">
                                Cost Capping ($)
                            </Text>
                            <Text size="md" fw={600} fz="h3">
                                {cappingUnbilledCost}
                            </Text>
                        </Flex>
                    </Group>
                </Card>
            </Flex>

            {/* Center Section - Estimated Parts Table */}
            <Card withBorder>
                <Text size="md" fw={500} fz="h6" c="gray">
                    Estimated Parts
                </Text>
                {/* <div style={{ position: "relative", height: "40vh", overflow: "hidden" }}>
                    <Table stickyHeader striped highlightOnHover>
                        <Table.Thead
                            style={{
                                position: "sticky",
                                top: 0,
                                backgroundColor: "white",
                                zIndex: 1,
                                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                            }}
                        >
                            <Table.Tr>
                                <Table.Th>Part Desc</Table.Th>
                                <Table.Th>Part Name</Table.Th>
                                <Table.Th>Qty</Table.Th>
                                <Table.Th>Price ($)</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {parts?.length > 0 ? (
                                parts?.map((row: any, index: any) => (
                                    <Table.Tr key={index}>
                                        <Table.Td>{row.partDesc}</Table.Td>
                                        <Table.Td>{row.partName}</Table.Td>
                                        <Table.Td>{row.qty}</Table.Td>
                                        <Table.Td>{row.price}</Table.Td>
                                    </Table.Tr>
                                ))
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={4} style={{ textAlign: "center" }}>
                                        No data available
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </div> */}
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
                        // pagination
                        // paginationPageSize={10}
                        domLayout="autoHeight" // Ensures height adjusts dynamically
                        rowData={parts || []}
                        columnDefs={[
                            {
                                field: "partName",
                                headerName: "Part Num",
                                sortable: true,
                                filter: true,
                                floatingFilter: true,
                                resizable: true,
                                flex: 2
                            },
                            {
                                field: "partDesc",
                                headerName: "Description                                                            ",
                                sortable: true,
                                filter: true,
                                floatingFilter: true,
                                resizable: true,
                                flex: 2
                            },
                            {
                                field: "qty",
                                headerName: "Qty",
                                sortable: true,
                                // filter: true,
                                // floatingFilter: true,
                                resizable: true,
                                flex: 1.5
                            },
                            {
                                field: "price",
                                headerName: "Price($)",
                                sortable: true,
                                // filter: true,
                                // floatingFilter: true,
                                resizable: true,
                                flex: 1.5
                            },
                        ]}
                    />
                </div>
            </Card>

            {/* Right Section */}
            <Flex justify="flex-start" align="flex-start" direction="column">
                {/* Estimated Spares Cost */}
                <Card withBorder w="100%" p={5}>
                    <Group p={0} gap="sm">
                        <ThemeIcon variant="light" radius="md" size="60" color="#124076">
                            <MdOutlineMiscellaneousServices style={{ width: "70%", height: "70%" }} />
                        </ThemeIcon>
                        <Flex direction="column">
                            <Text size="md" fw={500} fz="h6" c="gray">
                                Estimated Spares Cost ($)
                            </Text>
                            <Text size="md" fw={600} fz="h3">
                                {estimatedSparesCost}
                            </Text>
                        </Flex>
                    </Group>
                </Card>
                <Space h="sm" />

                {/* Spare Cost Chart */}
                <Card w="100%" withBorder radius={10}>
                    <Flex gap="lg" direction="column">
                        <Title order={5}>Spare Cost ($)</Title>
                        <AreaChart
                            h={250}
                            withGradient
                            data={spareCostData}
                            dataKey="date"
                            series={[{ name: "Cost", color: "indigo.6" }]}
                            curveType="natural"
                            connectNulls
                        />
                    </Flex>
                </Card>
            </Flex>
        </SimpleGrid>
    );
};

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
    const filteredTasks = tasks?.filter((task) =>
        task.sourceTask.toLowerCase().includes(taskSearch.toLowerCase())
    );

    // Filter findings based on search query
    const filteredFindings = selectedTask
        ? getFindingsForTask(selectedTask.sourceTask)?.filter((finding) =>
            finding.logItem.toLowerCase().includes(findingSearch.toLowerCase())
        )
        : [];

    // Select the first task and its first finding by default
    useEffect(() => {
        if (tasks?.length > 0) {
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
                                        Total Source Tasks
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
                                        {filteredTasks?.map((task, taskIndex) => (
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
                                                filteredFindings?.map((finding, findingIndex) => (
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
                                    {/* {selectedFinding ? (
                                        <> */}
                                            <Grid>
                                                <Grid.Col span={2}>
                                                    <Text size="md" fw={500} c="dimmed">
                                                        Log Item
                                                    </Text>
                                                </Grid.Col>
                                                <Grid.Col span={10}>
                                                    <Text size="sm" fw={500}>
                                                        {selectedFinding?.logItem || "-"}
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
                                                        {selectedFinding?.description || "-"}
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
                                                            {selectedFinding?.probability || 0} %
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
                                                            <Text fz='xl' fw={600}>{selectedFinding?.mhs?.min?.toFixed(0) || 0} Hr</Text>
                                                        </Flex>
                                                        <IconClockDown color="green" size='25' />
                                                    </Group>
                                                </Card>
                                                <Card bg='#fcebeb' shadow="0" radius='md'>
                                                    <Group justify="space-between" align="start">
                                                        <Flex direction='column'>
                                                            <Text fz='xs'>Max</Text>
                                                            <Text fz='xl' fw={600}>{selectedFinding?.mhs?.max?.toFixed(0) || 0} Hr</Text>
                                                        </Flex>
                                                        <IconClockUp color="red" size='25' />
                                                    </Group>
                                                </Card>
                                                <Card bg='#f3f7da' shadow="0" radius='md'>
                                                    <Group justify="space-between" align="start">
                                                        <Flex direction='column'>
                                                            <Text fz='xs'>Avg</Text>
                                                            <Text fz='xl' fw={600}>{selectedFinding?.mhs?.avg?.toFixed(0) || 0} Hr</Text>
                                                        </Flex>
                                                        <IconClockCode color="orange" size='25' />
                                                    </Group>
                                                </Card>
                                                <Card bg='#dae8f7' shadow="0" radius='md'>
                                                    <Group justify="space-between" align="start">
                                                        <Flex direction='column'>
                                                            <Text fz='xs'>Est</Text>
                                                            <Text fz='xl' fw={600}>{selectedFinding?.mhs?.est?.toFixed(0) || 0} Hr</Text>
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
                                                    // height: "100%",

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
                                                            headerName: "Part Num",
                                                            sortable: true,
                                                            filter: true,
                                                            floatingFilter: true,
                                                            resizable: true,
                                                            flex: 1
                                                        },
                                                        {
                                                            field: "desc",
                                                            headerName: "Description",
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
                                                            // filter: true,
                                                            // floatingFilter: true,
                                                            resizable: true,
                                                            flex: 1
                                                        },
                                                        {
                                                            field: "unit",
                                                            headerName: "Unit",
                                                            sortable: true,
                                                            // filter: true,
                                                            // floatingFilter: true,
                                                            resizable: true,
                                                            flex: 1
                                                        },
                                                        {
                                                            field: "price",
                                                            headerName: "Price($)",
                                                            sortable: true,
                                                            // filter: true,
                                                            // floatingFilter: true,
                                                            resizable: true,
                                                            flex: 1
                                                        },
                                                    ]}
                                                />
                                            </div>
                                        {/* </>
                                    ) : (
                                        <Text>Select a finding to view details.</Text>
                                    )} */}
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
    const filteredTasks = tasks?.filter((task) =>
        task.sourceTask.toLowerCase().includes(taskSearch.toLowerCase())
    );

    // Select the first task by default
    useEffect(() => {
        if (tasks?.length > 0) {
            setSelectedTask(tasks[0]);
        }
    }, [tasks]);


    return (
        <Card withBorder p={0} h="90vh" bg="none">
            <Card p={10} c='white' bg='#124076'>
                <Title order={4}>
                    MPD
                </Title>
            </Card>
            <Card withBorder p={0} h="80vh" bg="none">
                <Space h="xs" />
                <Grid h="100%">
                    {/* Left Section: Tasks List */}
                    <Grid.Col span={3}>
                        <Card h="100%" w="100%" p="md" bg="none">
                            <Group>
                                <Text size="md" fw={500} mb="xs" c='dimmed'>
                                    Total Source Tasks
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
                                <div style={{ height: '100%', overflowY: 'auto', scrollbarWidth: 'thin', }}>
                                    {filteredTasks?.map((task, taskIndex) => (
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
                                            <Text fw={500}>{task?.sourceTask}</Text>
                                        </Badge>
                                    ))}
                                </div>
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
                                                    {selectedTask?.sourceTask || "-"}
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
                                                    {selectedTask?.description || "-"}
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
                                                        <Text fz='xl' fw={600}>{selectedTask?.mhs?.min?.toFixed(0) || 0} Hr</Text>
                                                    </Flex>
                                                    <IconClockDown color="green" size='25' />
                                                </Group>
                                            </Card>
                                            <Card bg='#fcebeb' shadow="0" radius='md'>
                                                <Group justify="space-between" align="start">
                                                    <Flex direction='column'>
                                                        <Text fz='xs'>Max</Text>
                                                        <Text fz='xl' fw={600}>{selectedTask?.mhs?.max?.toFixed(0) || 0} Hr</Text>
                                                    </Flex>
                                                    <IconClockUp color="red" size='25' />
                                                </Group>
                                            </Card>
                                            <Card bg='#f3f7da' shadow="0" radius='md'>
                                                <Group justify="space-between" align="start">
                                                    <Flex direction='column'>
                                                        <Text fz='xs'>Average</Text>
                                                        <Text fz='xl' fw={600}>{selectedTask?.mhs?.avg?.toFixed(0) || 0} Hr</Text>
                                                    </Flex>
                                                    <IconClockCode color="orange" size='25' />
                                                </Group>
                                            </Card>
                                            <Card bg='#dae8f7' shadow="0" radius='md'>
                                                <Group justify="space-between" align="start">
                                                    <Flex direction='column'>
                                                        <Text fz='xs'>Estimated</Text>
                                                        <Text fz='xl' fw={600}>{selectedTask?.mhs?.est?.toFixed(0) || 0} Hr</Text>
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
                                                // height: "100%",

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
                                                        headerName: "Part Num",
                                                        sortable: true,
                                                        filter: true,
                                                        floatingFilter: true,
                                                        resizable: true,
                                                        flex: 1
                                                    },
                                                    {
                                                        field: "desc",
                                                        headerName: "Description                                                            ",
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
                                                        // filter: true,
                                                        // floatingFilter: true,
                                                        resizable: true,
                                                        flex: 1,
                                                        cellRenderer: (val: any) => {
                                                            return (
                                                              <Text>
                                                                {val?.data?.qty?.toFixed(2) || 0}
                                                              </Text>
                                                            );
                                                          },
                                                    },
                                                    {
                                                        field: "unit",
                                                        headerName: "Unit",
                                                        sortable: true,
                                                        // filter: true,
                                                        // floatingFilter: true,
                                                        resizable: true,
                                                        flex: 1
                                                    },
                                                    {
                                                        field: "price",
                                                        headerName: "Price($)",
                                                        sortable: true,
                                                        // filter: true,
                                                        // floatingFilter: true,
                                                        resizable: true,
                                                        flex: 1,
                                                        cellRenderer: (val: any) => {
                                                            return (
                                                              <Text>
                                                                {val?.data?.price?.toFixed(4) || 0}
                                                              </Text>
                                                            );
                                                          },
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
        </Card>
    );
};


{/* <Group>
                        
<Tooltip label="Download Historical Tasks"  withArrow position="top">
<CsvDownloadButton
    data={validatedTasks?.filter((ele) => ele?.status === true)?.map((el) => {
        return {
            // ...el,
            tasks: el?.taskid || 0,
            status: el?.status
        };
    })}
    headers={[
        "Tasks",
        "Status"
    ]}
    filename={`Estimate_${selectedEstimateId}.csv`}
    delimiter=","
    style={{
        //pass other props, like styles
        // boxShadow: "inset 0px 1px 0px 0px #e184f3",
        height: "2em",
        background:
            "linear-gradient(to bottom, #0093E9 5%, #80D0C7 100%)",
        // backgroundColor: "#c123de",
        borderRadius: "6px",
        border: "1px solid #0093E9",
        display: "inline-block",
        cursor: "pointer",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "bold",
        padding: "6px 24px",
        textDecoration: "none",
        // textShadow: "0px 1px 0px #9b14b3",
    }}
>
    Available Tasks - {" "}{validatedTasks?.filter((ele) => ele?.status === true)?.length}
</CsvDownloadButton>
</Tooltip>

<Tooltip label="Download New Tasks"  withArrow position="top">
<CsvDownloadButton
    data={validatedTasks?.filter((ele) => ele?.status === false)?.map((el) => {
        return {
            // ...el,
            tasks: el?.taskid || 0,
            status: el?.status
        };
    })}
    headers={[
        "Tasks",
        "Status"
    ]}
    filename={`Estimate_${selectedEstimateId}.csv`}
    delimiter=","
    style={{
        //pass other props, like styles
        // boxShadow: "inset 0px 1px 0px 0px #e184f3",
        height: "2em",
        background:
            "linear-gradient(to bottom, #FBAB7E 5%, #F7CE68 100%)",
        // backgroundColor: "#FBAB7E",
        borderRadius: "6px",
        border: "1px solid  #FBAB7E",
        display: "inline-block",
        cursor: "pointer",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "bold",
        padding: "6px 24px",
        textDecoration: "none",
        // textShadow: "0px 1px 0px #9b14b3",
    }}
>
    NotAvaiable Tasks - {" "}{validatedTasks?.filter((ele) => ele?.status === false)?.length}
</CsvDownloadButton>
</Tooltip>
</Group> */}

// const createdEstimates = [
//     {
//         estId: "Est - 01",
//         date: "",
//         aircraft: "Indigo",
//         totalManHrs: "44",
//         totalCost: "4000",
//         status: "In Progress",
//     },
//     {
//         estId: "Est - 02",
//         date: "",
//         aircraft: "AirIndia",
//         totalManHrs: "44",
//         totalCost: "4000",
//         status: "In Progress",
//     },
//     {
//         estId: "Est - 03",
//         date: "",
//         aircraft: "Indigo",
//         totalManHrs: "44",
//         totalCost: "4000",
//         status: "Completed",
//     }
// ];

// const parts = [
//     {
//         partName: "Nut",
//         partDesc: "POO1",
//         qty: "6",
//         unit: "",
//         price: "20"
//     },
//     {
//         partName: "Foam Tape",
//         partDesc: "POO2",
//         qty: "2",
//         unit: "",
//         price: "80"
//     },
//     {
//         partName: "Blind Rivet",
//         partDesc: "POO3",
//         qty: "1",
//         unit: "",
//         price: "40"
//     },
//     {
//         partName: "Selant",
//         partDesc: "POO4",
//         qty: "4",
//         unit: "",
//         price: "20"
//     },
//     {
//         partName: "Nut",
//         partDesc: "POO1",
//         qty: "6",
//         unit: "",
//         price: "20"
//     },
//     {
//         partName: "Foam Tape",
//         partDesc: "POO2",
//         qty: "2",
//         unit: "",
//         price: "80"
//     },
//     {
//         partName: "Blind Rivet",
//         partDesc: "POO3",
//         qty: "1",
//         unit: "",
//         price: "40"
//     },
//     {
//         partName: "Selant",
//         partDesc: "POO4",
//         qty: "4",
//         unit: "",
//         price: "20"
//     }
// ];

// const jsonData = {
//     tasks: [
//         {
//             sourceTask: "255000-16-1",
//             desciption: "CARGO COMPARTMENTS\n\nDETAILED INSPECTION OF DIVIDER NETS, DOOR NETS AND\nNET ATTACHMENT POINTS\n\nNOTE:\nTHE NUMBER OF AFFECTED ZONES MAY VARY ACCORDING TO",
//             mhs: { max: 2, min: 2, avg: 2, est: 1.38 },
//             spareParts: [
//                 {
//                     partId: "Nut",
//                     desc: "POO1",
//                     qty: "6",
//                     unit: "",
//                     price: "20"
//                 },
//                 {
//                     partId: "Foam Tape",
//                     desc: "POO2",
//                     qty: "2",
//                     unit: "",
//                     price: "80"
//                 },
//                 {
//                     partId: "Blind Rivet",
//                     desc: "POO3",
//                     qty: "1",
//                     unit: "",
//                     price: "40"
//                 },
//                 {
//                     partId: "Selant",
//                     desc: "POO4",
//                     qty: "4",
//                     unit: "",
//                     price: "20"
//                 },
//                 {
//                     partId: "Nut",
//                     desc: "POO1",
//                     qty: "6",
//                     unit: "",
//                     price: "20"
//                 },
//                 {
//                     partId: "Foam Tape",
//                     desc: "POO2",
//                     qty: "2",
//                     unit: "",
//                     price: "80"
//                 },
//                 {
//                     partId: "Blind Rivet",
//                     desc: "POO3",
//                     qty: "1",
//                     unit: "",
//                     price: "40"
//                 },
//                 {
//                     partId: "Selant",
//                     desc: "POO4",
//                     qty: "4",
//                     unit: "",
//                     price: "20"
//                 }
//             ],
//         },
//         {
//             sourceTask: "256241-05-1",
//             desciption: "DOOR ESCAPE SLIDE\n\nCLEAN DOOR GIRT BAR FITTING STOP LEVERS\n\nNOTE:\nTASK IS NOT APPLICABLE FOR DEACTIVATED PASSENGER/CREW\nDOORS.",
//             mhs: { max: 2, min: 2, avg: 2, est: 0.92 },
//             spareParts: [
//                 { partId: "LOTOXANE", desc: "NON AQUEOUS CLEANER-GENERAL", qty: 0.1, unit: "LTR", price: 0 },
//             ],
//         },
//         {
//             sourceTask: "200435-01-1 (LH)",
//             desciption: "FAN COMPARTMENT\n\nDETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY\nGEAR BOX (EWIS)",
//             mhs: { max: 4, min: 4, avg: 4, est: 0.73 },
//             spareParts: [],
//         },
//     ],
//     findings: [
//         {
//             taskId: "200435-01-1 (LH)",
//             details: [
//                 {
//                     logItem: "HMV23/000211/0324/24",
//                     probability: '66',
//                     desciption: "WHILE CARRYING OUT MPD # 200435-01-1 (LH) ,FAN COMPARTMENT DETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY GEAR BOX (EWIS ) FOUND CLAMP QTY # 2 CUSHION DAMAGED.",
//                     mhs: { max: 2, min: 2, avg: 2, est: 4 },
//                     spareParts: [
//                         {
//                             partId: "Nut",
//                             desc: "POO1",
//                             qty: "6",
//                             unit: "",
//                             price: "20"
//                         },
//                         {
//                             partId: "Foam Tape",
//                             desc: "POO2",
//                             qty: "2",
//                             unit: "",
//                             price: "80"
//                         },
//                         {
//                             partId: "Blind Rivet",
//                             desc: "POO3",
//                             qty: "1",
//                             unit: "",
//                             price: "40"
//                         },
//                         {
//                             partId: "Selant",
//                             desc: "POO4",
//                             qty: "4",
//                             unit: "",
//                             price: "20"
//                         },
//                         {
//                             partId: "Nut",
//                             desc: "POO1",
//                             qty: "6",
//                             unit: "",
//                             price: "20"
//                         },
//                         {
//                             partId: "Foam Tape",
//                             desc: "POO2",
//                             qty: "2",
//                             unit: "",
//                             price: "80"
//                         },
//                         {
//                             partId: "Blind Rivet",
//                             desc: "POO3",
//                             qty: "1",
//                             unit: "",
//                             price: "40"
//                         },
//                         {
//                             partId: "Selant",
//                             desc: "POO4",
//                             qty: "4",
//                             unit: "",
//                             price: "20"
//                         }
//                     ],
//                 },
//                 {
//                     logItem: "HMV23/000211/25",
//                     probability: '44',
//                     desciption: "WHILE CARRYING OUT MPD # 200435-01-1 (LH) ,FAN COMPARTMENT DETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY GEAR BOX (EWIS ) FOUND CLAMP QTY # 2 CUSHION DAMAGED.",
//                     mhs: { max: 2, min: 2, avg: 2, est: 4 },
//                     spareParts: [],
//                 },
//                 {
//                     logItem: "HMV23/000211/6",
//                     probability: '46',
//                     desciption: "WHILE CARRYING OUT MPD # 200435-01-1 (LH) ,FAN COMPARTMENT DETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY GEAR BOX (EWIS ) FOUND CLAMP QTY # 2 CUSHION DAMAGED.",
//                     mhs: { max: 2, min: 2, avg: 2, est: 4 },
//                     spareParts: [
//                         {
//                             partId: "Nut",
//                             desc: "POO1",
//                             qty: "6",
//                             unit: "",
//                             price: "20"
//                         },
//                         {
//                             partId: "Foam Tape",
//                             desc: "POO2",
//                             qty: "2",
//                             unit: "",
//                             price: "80"
//                         },
//                         {
//                             partId: "Blind Rivet",
//                             desc: "POO3",
//                             qty: "1",
//                             unit: "",
//                             price: "40"
//                         },
//                         {
//                             partId: "Selant",
//                             desc: "POO4",
//                             qty: "4",
//                             unit: "",
//                             price: "20"
//                         },
//                         {
//                             partId: "Nut",
//                             desc: "POO1",
//                             qty: "6",
//                             unit: "",
//                             price: "20"
//                         },
//                         {
//                             partId: "Foam Tape",
//                             desc: "POO2",
//                             qty: "2",
//                             unit: "",
//                             price: "80"
//                         },
//                         {
//                             partId: "Blind Rivet",
//                             desc: "POO3",
//                             qty: "1",
//                             unit: "",
//                             price: "40"
//                         },
//                         {
//                             partId: "Selant",
//                             desc: "POO4",
//                             qty: "4",
//                             unit: "",
//                             price: "20"
//                         }
//                     ],
//                 },
//                 {
//                     logItem: "HMV23/000211/26",
//                     probability: '64',
//                     desciption: "WHILE CARRYING OUT MPD # 200435-01-1 (LH) ,FAN COMPARTMENT DETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY GEAR BOX (EWIS ) FOUND CLAMP QTY # 2 CUSHION DAMAGED.",
//                     mhs: { max: 2, min: 2, avg: 2, est: 4 },
//                     spareParts: [],
//                 },
//             ],
//         },
//         {
//             taskId: "255000-16-1",
//             details: [
//                 {
//                     logItem: "HMV23/000211/0324/24",
//                     probability: '66',
//                     desciption: "WHILE CARRYING OUT MPD # 200435-01-1 (LH) ,FAN COMPARTMENT DETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY GEAR BOX (EWIS ) FOUND CLAMP QTY # 2 CUSHION DAMAGED.",
//                     mhs: { max: 2, min: 2, avg: 2, est: 4 },
//                     spareParts: [],
//                 }
//             ],
//         },
//     ],
// };

{/* <SimpleGrid cols={3} spacing='xs'>
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

</SimpleGrid> */}
