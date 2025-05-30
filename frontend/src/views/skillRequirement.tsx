import { Card, Group, SimpleGrid, Title, Text, ScrollArea, Badge, Button, Divider, Box, Flex, Space, Accordion, Progress, TextInput, LoadingOverlay, Center, Tooltip, ActionIcon } from "@mantine/core";
import { useMemo, useState } from "react";
import DropZoneExcel from "../components/fileDropZone";
import { MdLensBlur, MdOutlineArrowForward } from "react-icons/md";
import { IconAlertTriangle, IconClock, IconCube, IconFileDownload, IconMessage2Down } from "@tabler/icons-react";
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
import SkillRequirementAnalytics from "./skillReqAnalytics";
import RFQSkillsUploadDropZoneExcel from "../components/rfqSkillUploadDropzone";
import excelTemplateFile from "../assets/RFQ_Excel_Template.xlsx";


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
const [isValidating, setIsValidating] = useState(false);
const [extractedTasks, setExtractedTasks] = useState<string[]>([]);
 const [extractedDescriptions, setExtractedDescriptions] = useState<string[]>([]);  
const [sheetInfo, setSheetInfo] = useState<
    { sheetName: string; columnName: string } | undefined
  >(undefined);

    // Handle file and extracted tasks
    // const handleFileChange = async (file: File | null, tasks: string[]) => {
    //     setSelectedFile(file);
    //     setTasks(tasks ?? []); // Ensure tasks is always an array
    //     console.log("✅ Selected File:", file ? file.name : "None");
    //     console.log("📌 Extracted Tasks:", tasks.length > 0 ? tasks : "No tasks found");


    //     console.log("Extracted Tasks:", tasks);
    //     const response = await validateTasks(tasks);
    //     setValidatedTasks(response);
    //     setIsLoading(false);

    //     const invalidTasks = response?.filter((task) => task?.status === false);
    //     if (invalidTasks.length > 0) {
    //         showNotification({
    //             title: "Tasks Not Available!",
    //             message: `${invalidTasks.length} tasks are not available. Only valid tasks will be used to Skill Analysis.`,
    //             color: "orange",
    //             style: { position: "fixed", top: 100, right: 20, zIndex: 1000 },
    //         });
    //         // showAppNotification("warning", "Tasks Not Available!", invalidTasks.length + "tasks are not available. Only valid tasks will be used to Skill Analysis.");
    //     }

    // };
    // Handle file and extracted tasks
    const handleFileChange = async (
        file: File | null,
        tasks: string[],
        descriptions: string[], // ADD THIS
        fileSheetInfo?: { sheetName: string; columnName: string }
      ) => {
        setIsValidating(true);
        setSelectedFile(file);
        setExtractedTasks(tasks ?? []); // Ensure tasks is always an array
        setExtractedDescriptions(descriptions ?? []); // ADD THIS
        setSheetInfo(fileSheetInfo);
      
        console.log("✅ Selected File:", file ? file.name : "None");
        console.log(
          "📌 Extracted Tasks:",
          tasks.length > 0 ? tasks : "No tasks found"
        );
        console.log(
          "📝 Extracted Descriptions:",
          descriptions.length > 0 ? descriptions.slice(0, 5) : "No descriptions found"
        );
        console.log("From sheet:", fileSheetInfo?.sheetName);
        console.log("From column:", fileSheetInfo?.columnName);
      
        if (tasks.length > 0) {
          // Send both tasks and descriptions to validation API
          const response = await validateTasks(tasks, descriptions); // Make sure your API accepts this!
          setValidatedTasks(response);
      
          const invalidTasks = response.filter((task) => task.status === false);
          if (invalidTasks.length > 0) {
            showNotification({
              title: "Tasks Not Available!",
              message: `${invalidTasks.length} tasks are not available. Only valid tasks will be used for Skill Analysis.`,
              color: "orange",
              style: { position: "fixed", top: 100, right: 20, zIndex: 1000 },
            });
          }
        } else {
          setValidatedTasks([]);
        }
      
        setIsValidating(false);
      };

    const handleFiles = (files: File[]) => {
        console.log("Uploaded files:", files);
    };

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
    //             message: `${invalidTasks.length} tasks are not available. Only valid tasks will be used to Skill Analysis.`,
    //             color: "orange",
    //             style: { position: "fixed", top: 100, right: 20, zIndex: 1000 },
    //         });
    //     }
    // };

    // Handle Submit
    const handleSubmit = async () => {
        const validTasks = validatedTasks?.filter((task) => task?.status === true)?.map((task) => task?.taskid);

        if (validTasks.length === 0) {
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
                // processDonutData(response?.skillAnalysis);
                // showAppNotification("success", "Skill analysis!", "Successfully Generated Skill Analysis");
            }
        } catch (error) {
            showAppNotification("error", "Failed!", "Failed Skill Analysis, try agian");
            console.error("API Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const downloadEmptyExcel = async () => {
        try {
          // Fetch the file from your project assets
          const response = await fetch(excelTemplateFile);
    
          if (!response.ok) {
            throw new Error("Failed to load the template file");
          }
    
          // Get the file as blob
          const blob = await response.blob();
    
          // Create a URL for the blob
          const url = window.URL.createObjectURL(blob);
    
          // Create a temporary anchor element to trigger the download
          const a = document.createElement("a");
          a.href = url;
          a.download = "RFQ_Template.xlsx"; // Name that will appear when downloading
          document.body.appendChild(a);
    
          // Trigger the download
          a.click();
    
          // Clean up
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
    
          // Show success notification
          showAppNotification(
            "success",
            "Successful!",
            "RFQ template downloaded successfully"
          );
        } catch (error) {
          console.error("Error downloading the template:", error);
    
          // Show error notification
          showAppNotification(
            "error",
            "Failed!",
            "Failed to download the template file"
          );
        }
      };

    return (
        <>
            <div style={{ paddingLeft: 70, paddingRight: 70, paddingTop: 20, paddingBottom: 20 }}>
                <SimpleGrid cols={2}>
                    <Card
                        withBorder
                        h='50vh'
                        radius='md'
                    >
                        
                        <Group justify="space-between">
                        <Text size="md" fw={500}>
                                Select Document
                            </Text>

                            <Tooltip label="Download Template Example">
                                                <ActionIcon
                                                  color="green"
                                                  variant="light"
                                                  onClick={downloadEmptyExcel}
                                                >
                                                  <IconFileDownload />
                                                </ActionIcon>
                                              </Tooltip>
                        </Group>
                            <Space h='sm'/>
                        
                            {/* <RFQSkillsUploadDropZoneExcel
                                name="Excel Files"
                                changeHandler={handleFileChange}
                                selectedFile={selectedFile} // Pass selectedFile as prop
                                setSelectedFile={setSelectedFile} // Pass setSelectedFile as prop
                                color="green" // Optional custom border color
                            /> */}
                            <ScrollArea
                style={{
                  flex: 1, // Take remaining space for scrollable area
                  overflow: "auto",
                }}
                offsetScrollbars
                scrollHideDelay={1}
                scrollbarSize={5}
              >
                <RFQUploadDropZoneExcel
                                              name="Excel or CSV file"
                                              changeHandler={handleFileChange}
                                              selectedFile={selectedFile}
                                              setSelectedFile={setSelectedFile}
                                              color="green"
                                            />
              </ScrollArea>
                            
                   
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
                                    {validatedTasks
                                    ?.sort((a, b) => {
                                        // Alphanumerical sorting function
                                        const aTaskId = a?.taskid || '';
                                        const bTaskId = b?.taskid || '';
                                        
                                        return aTaskId.localeCompare(bTaskId, undefined, {
                                          numeric: true,
                                          sensitivity: 'base'
                                        });
                                      })
                                    ?.map((task, index) => (
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
                        disabled={validatedTasks.length > 0 ? false : true}
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
                <SkillRequirementAnalytics skillAnalysisData={skillAnalysisData}/>
            </div>
        </>
    )
}


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
