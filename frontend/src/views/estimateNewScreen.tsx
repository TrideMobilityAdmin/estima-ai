// import { Grid, Title } from "@mantine/core";
import {
  Accordion,
  ActionIcon,
  Avatar,
  Center,
  Checkbox,
  Indicator,
  List,
  LoadingOverlay,
  Menu,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Textarea,
  Tooltip,
  Combobox,
  useCombobox,
  InputBase,
  Loader,
  Tabs,
  Pagination,
  Popover,
  rem
} from "@mantine/core";
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
  useAtom,
  useDisclosure,
} from "../constants/GlobalImports";
import { AreaChart, getFilteredChartTooltipPayload } from "@mantine/charts";
import "../App.css";
import {
  IconAlertTriangle,
  IconArrowBackUpDouble,
  IconChartArcs3,
  IconCheck,
  IconChecklist,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheck,
  IconClipboard,
  IconClipboardCheck,
  IconClipboardText,
  IconClock,
  IconClockCheck,
  IconClockCode,
  IconClockDown,
  IconClockHour4,
  IconClockShare,
  IconClockUp,
  IconDeselect,
  IconDownload,
  IconEdit,
  IconError404,
  IconFile,
  IconFileCheck,
  IconFileDownload,
  IconFileDownloadFilled,
  IconFileTime,
  IconHistory,
  IconHourglass,
  IconListCheck,
  IconListDetails,
  IconLoader,
  IconMenu,
  IconMessage,
  IconMessage2Plus,
  IconMinimize,
  IconPackage,
  IconPercentage,
  IconPercentage66,
  IconPin,
  IconPlane,
  IconPlaneTilt,
  IconPlus,
  IconRecycle,
  IconRefresh,
  IconReport,
  IconRowRemove,
  IconSettingsDollar,
  IconShadow,
  IconSquareCheck,
  IconStatusChange,
  IconTimeDuration0,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useApi } from "../api/services/estimateSrvice";
import { baseUrl, getEstimateReport_Url } from "../api/apiUrls";
import RFQUploadDropZoneExcel from "../components/rfqUploadDropzone";
import robotGif from "../../public/7efs.gif";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import CsvDownloadButton from "react-json-to-csv";
import { showAppNotification } from "../components/showNotificationGlobally";
import SkillRequirementAnalytics from "./skillReqAnalytics";
import { useApiSkillAnalysis } from "../api/services/skillsService";
import { useCallback, useMemo, useRef } from "react";
import { userName } from "../api/tokenJotai";
import excelTemplateFile from "../assets/RFQ_Excel_Template.xlsx";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import aircraftMOdelsData from "../assets/aircraftModels.json";
import aircraftOperators from "../assets/aircraftOperators.json";
import { DatePickerInput } from "@mantine/dates";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import excelDownloadIcon from "../../public/ExcelDownloadLogo.png";
import excelIcon from "../../public/ExcelIcon3.svg";
// import mountMantineLoaderToGrid from "../components/LoadingCellRenderer";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek); 


export default function EstimateNewScreen() {
  const {
    postEstimateReport,
    updateRemarkByEstID,
    validateTasks,
    RFQFileUpload,
    getAllEstimatesStatus,
    getEstimateByID,
    downloadEstimatePdf,
    getProbabilityWiseDetails,
    getOperatorsList,
    getEstimateDetailsByID,
    getFilteredTasksByID,
    getModelTasksValidate,
    getAllHistoryEstimatesStatus,
    getAllEstimatesSummary,
    getValidatedTasksByID
  } = useApi();
  const { getAllDataExpertInsights } = useApi();
  const { getSkillAnalysis } = useApiSkillAnalysis();
  const [currentUser] = useAtom(userName);
  const [value, setValue] = useState("estimate");
  const [tabValue, setTabValue] = useState("overall");
  const [opened, setOpened] = useState(false);
  const [probOpened, setProbOpened] = useState(false);
  const [remarksOpened, setRemarksOpened] = useState(false);
  const [selectedFileTasksOpened, setSelectedFileTasksOpened] = useState(false);
  const [selectedEstimateId, setSelectedEstimateId] = useState<any>();
  const [selectedDownloadEstimateId, setSelectedDownloadEstimateId] =
    useState<any>();
  const [selectedEstimateIdReport, setSelectedEstimateIdReport] =
    useState<any>();
  const [selectedEstimateIdProbability, setSelectedEstimateIdProbability] =
    useState<any>();
  const [selectedEstimateRemarks, setSelectedEstimateIdRemarks] =
    useState<any>();
  const [selectedEstRemarksData, setSelectedEstRemarksData] = useState<any[]>(
    []
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<string[]>([]);
  const [extractedDescriptions, setExtractedDescriptions] = useState<string[]>([]);
  const [sheetInfo, setSheetInfo] = useState<
    { sheetName: string; columnName: string } | undefined
  >(undefined);
  const [rfqSubmissionResponse, setRfqSubmissionResponse] = useState<any>(null);
  const [rfqSubModalOpened, setRfqSubModalOpened] = useState(false);
  const [estimatesStatusData, setEstimatesStatusData] = useState<any[]>([]);
  const [selectedEstimateTasks, setSelectedEstimateTasks] = useState<string[]>(
    []
  );
  const [estimateReportData, setEstReportData] = useState<any>(null);
  const [estimateReportloading, setEstimateReportLoading] = useState(false); // Add loading state
  const [validatedTasks, setValidatedTasks] = useState<any[]>([]);
  const [validatedSkillsTasks, setValidatedSkillsTasks] = useState<any[]>([]);
  const [validatedAdditionalTasks, setValidatedAdditionalTasks] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isValidating2, setIsValidating2] = useState(false);
  const [probabilityWiseData, setProbabilityWiseData] = useState<any>(null);
  const [isProbWiseLoading, setIsProbLoading] = useState(false);
  const [skillAnalysisData, setSkillAnalysisData] = useState<any>(null);
  const [expertInsightsData, setExpertInsightsData] = useState<any>();
  const [expertInsightsTasks, setExpertInsightsTasks] = useState<any[]>([]);
  const [selectedExpertInsightsTaskIDs, setSelectedExpertInsightTaskIDs] =
    useState<any[]>([]);
  const [selectedExpertInsightTasks, setSelectedExpertInsightTasks] = useState<
    any[]
  >([]);
  const aircraftRegNoRef = useRef<HTMLInputElement | null>(null);
  const [additionalTasks, setAdditionalTasks] = useState<any>([]);
  // const [tasks, setTasks] = useState<string[]>([]);
  // const [estimateId, setEstimateId] = useState<string>("");
  const [generatedEstimateId, setGeneratedEstimateId] = useState<string>("");
  const [loading, setLoading] = useState(false); // Add loading state

  // const [validatedTasks, setValidatedTasks] = useState<any[]>([]);
  // const [isLoading, setIsLoading] = useState(false);
  // console.log("selected remarks >>>>", selectedEstRemarksData);

  const [menuOpened, { open, close }] = useDisclosure(false);
  // const fetchEstimatesStatus = async () => {
  //     setLoading(true);
  //     const data = await getAllEstimatesStatus();
  //     if (data) {
  //         setEstimatesStatusData(data?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  //     }
  //     setLoading(false);
  // };


  // const operatorsList = ['GO AIRLINES (INDIA) LTD',
  //   'ALPHA STAR AVIATION SERVICES',
  //   'EZEN AVIATION PTY LTD',
  //   'AERGO CAPITAL',
  //   'SPICEJET',
  //   'SMARTLYNX AIRLINES LTD',
  //   'INDIGO',
  //   'AIX Connect Private Limited',
  //   'JAZEERA AIRWAYS',
  //   'TURBO MEGHA AIRWAYS PVT LTD',
  //   'AIRCASTLE SINGAPORE PTE. LTD',
  //   'TATA SIA AIRLINES',
  //   'GE CAPITAL AVIATION SERVICES',
  //   'US BANGLA',
  //   'DRUK AIR',
  //   'OMAN AIR',
  //   'BIG CHARTERS PVT LTD (FLYBIG)',
  //   'FLYNAS',
  //   'FLYDUBAI',
  //   'ISLAND AVIATION SERVICES LTD',
  //   'MANTA AIR',
  //   'SNV AVIATION PRIVATE LIMITED AKASA AIR',
  //   'BEOND SIMDI OPERATIONS PRIVATE LIMITED',
  //   'NOVOAIR LTD',
  //   'FITS AIR',
  //   'CEBU AIR, INC.',
  //   'AERO NOMAD AIRLINES LLC',
  //   'SRILANKA AIRLINES LTD',
  //   'KUWAIT AIRWAYS COMPANY',
  //   'SNV AVIATION PRIVATE LIMITED',
  //   'QUIKJET CARGO AIRLINES PRIVATE LIMITED',
  //   'WIZZ AIR ABU DHABI LLC'];

  const models = ['A320',
    'ATR42',
    'ATR72',
    'B737 NG',
    'Q400',
    'A321',
    'B737 MAX',
    'A319',
    'B737-800(BCF)'];

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);

  const fetchEstimatesStatus = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const data = await getAllEstimatesStatus();
      if (data) {
        setEstimatesStatusData(
          [...data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      }
    } catch (error) {
      // Optionally handle error
    }
    setLoading(false);
    isFetchingRef.current = false;
    // Schedule next fetch after this one finishes
    pollingRef.current = setTimeout(fetchEstimatesStatus, 15000);
  }, []);

  useEffect(() => {
    fetchEstimatesStatus(); // Initial fetch
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [fetchEstimatesStatus]);


  const [selectedEstIdValidate, setSelectedEstimateIdValidate] = useState<any>();
    const [validatedTasksByID, setValidatedTasksByID] = useState<any[]>([]);
    const [loadingValidatedByID, setLoadingValidatedByID] = useState(false); // Add loading state

    const fetchValidatedTaskByID = async () => {
        setLoadingValidatedByID(true);
    const data = await getValidatedTasksByID(selectedEstIdValidate);
    if (data) {
        setValidatedTasksByID(data); // store validated tasks
        await handleSubmitSkills(data); // proceed to call skill analysis
    }
    setLoadingValidatedByID(false);
    };

  useEffect(()=>{
    fetchValidatedTaskByID();
  },[selectedEstIdValidate]);


  // const threeDaysAgo = new Date();
      // threeDaysAgo.setDate(threeDaysAgo.getDate() - 5);

      // const filteredData = data.filter(
      //   (item: any) => new Date(item.createdAt) >= threeDaysAgo
      // );
      // const sortedData = filteredData.sort(
      //   (a: any, b: any) =>
      //     new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      // );
      // setEstimatesStatusData(sortedData);

  // // console.log("all estimates status>>>", estimatesStatusData);
  // // console.log("selected estimate tasks >>>>", selectedEstimateTasks);

  const [historyEstimatesStatusData, setHistoryEstimatesStatusData] = useState<any[]>([]);
  const [historyEstimatesCount, setHistoryEstimatesCount] = useState<any>();
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | null>(null);
  const [selectedHistoryEstId, setSelectedHistoryEstId] = useState<string>("");
  const [selectedHistoryAircrRegNo, setSelectedHistoryAircrRegNo] = useState<string>("");
  const [selectedHistoryStatus, setSelectedHistoryStatus] = useState<string | null>(null);
  const [loadingHistoryEstimates, setLoadingHistoryEstimates] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0); // 0-based

  const [gridApi, setGridApi] = useState<any>(null);
  const onGridReady = (params: any) => {
    setGridApi(params.api);
  };

  const fetchHistoryEstimatesStatus = async () => {
    setLoadingHistoryEstimates(true);

    const dateISO = selectedHistoryDate
      ? `${selectedHistoryDate.getFullYear()}-${String(selectedHistoryDate.getMonth() + 1).padStart(2, '0')}-${String(selectedHistoryDate.getDate()).padStart(2, '0')}T00:00:00`
      : undefined;


    const params = {
      page: currentPage + 1, // convert to 1-based index
      pageSize,
      date: dateISO,
      estID: selectedHistoryEstId?.trim() || undefined,
      aircraftRegNo: selectedHistoryAircrRegNo?.trim() || undefined,
      status: selectedHistoryStatus || undefined,
    };

    const data = await getAllHistoryEstimatesStatus(params);

    const historyData = data?.data;
    const count = data?.count;

    if (historyData && Array.isArray(historyData)) {
      const sortedData = historyData?.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setHistoryEstimatesStatusData(sortedData);
      setHistoryEstimatesCount(count);

    } else {
      setHistoryEstimatesStatusData([]);
    }
    setLoadingHistoryEstimates(false);
  };

  // Re-fetch on filters or pagination change
  useEffect(() => {
    fetchHistoryEstimatesStatus();
  }, [
    selectedHistoryDate,
    selectedHistoryEstId,
    selectedHistoryAircrRegNo,
    selectedHistoryStatus,
    pageSize,
    currentPage,
  ]);

  useEffect(() => {
    if (!loadingHistoryEstimates && historyEstimatesStatusData.length === 0) {
      gridApi?.showNoRowsOverlay();
    } else if (!loadingHistoryEstimates) {
      gridApi?.hideOverlay();
    }
  }, [loadingHistoryEstimates, historyEstimatesStatusData, gridApi]);

  // console.log("all history estimates status>>>", historyEstimatesStatusData);
  // console.log("history cout  >>>>", historyEstimatesCount);


  useEffect(() => {
    fetchExpertInsights();
  }, []);

  const fetchExpertInsights = async () => {
    try {
      const data = await getAllDataExpertInsights();
      if (data && data.length > 0) {
        const insightData = data[0];
        setExpertInsightsData(insightData);
        // setId(insightData._id);
        // setProbability(insightData.defaultProbability);
        // setThresholds(insightData.thresholds || {
        //   tatThreshold: 12.0,
        //   manHoursThreshold: 5.0
        // });
        setExpertInsightsTasks(insightData.miscLaborTasks);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  // console.log("expert insight data >>>>", expertInsightsData);

  // console.log("expert insight tasks >>>>", expertInsightsTasks);

  const handleExpertInsightsChange = (selectedIDs: string[]) => {
    setSelectedExpertInsightTaskIDs(selectedIDs);

    // Store selected full objects
    const selectedObjects = expertInsightsTasks?.filter((task) =>
      selectedIDs?.includes(task.taskID)
    );
    setSelectedExpertInsightTasks(selectedObjects);
  };

  // console.log(
    "selected expert insights tasks ids >>>>",
    selectedExpertInsightsTaskIDs
  );
  // console.log(
    "selected expert insights tasks obj >>>>",
    selectedExpertInsightTasks
  );

  // Handle file and extracted tasks
  // Handle file and extracted tasks and descriptions
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

    // console.log("✅ Selected File:", file ? file.name : "None");
    // console.log(
      "📌 Extracted Tasks:",
      tasks.length > 0 ? tasks : "No tasks found"
    );
    // console.log(
      "📝 Extracted Descriptions:",
      descriptions.length > 0 ? descriptions.slice(0, 5) : "No descriptions found"
    );
    // console.log("From sheet:", fileSheetInfo?.sheetName);
    // console.log("From column:", fileSheetInfo?.columnName);

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

  // 🟢 Function to validate tasks & update UI
  const handleValidateTasks = async (tasks: string[], descriptions: string[]) => {
    setIsValidating(true);
    try {
      const response = await validateTasks(tasks, descriptions);
      if (response?.length > 0) {
        setValidatedTasks(response);
        setValidatedSkillsTasks(response);
      }
      return response;
    } finally {
      setIsValidating(false);
    }
  };


  const handleValidateSkillsTasks = async (tasks: string[], descriptions: string[]) => {
    setIsValidating2(true);
    const response = await validateTasks(tasks, descriptions);

    if (response.length > 0) {
      setValidatedSkillsTasks(response);
    }
    setIsValidating2(false);
  };

  const downloadCSV = (status: boolean) => {
    const filteredTasks = validatedTasks?.filter(
      (task) => task?.status === status
    );
    const csvHeaders = ["Estimate ID", "Tasks", "Status"];
    const csvData = filteredTasks?.map((task) => [
      selectedEstimateId, // Include the selectedEstimateId for each task
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
    link.setAttribute(
      "download",
      `Estimate_${selectedEstimateId}_${status ? "Available" : "NotAvailable"
      }.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcel = (status: boolean) => {
    // Combine both the original validated tasks and additional validated tasks
    const allValidatedTasks = [...validatedTasks, ...validatedAdditionalTasks];
    // Filter based on the selected status (available or not available)
    const filteredTasks = allValidatedTasks.filter((task) => task?.status === status) || [];

    // const filteredTasks =
    //   validatedTasks?.filter((task) => task?.status === status) || [];

    let excelData: Record<string, any>[] = [];

    if (status) {
      // Status === true: Only include TASK NUMBER, ESTIMATE ID, STATUS
      excelData =
        filteredTasks.length > 0
          ? filteredTasks.map((task) => ({
            "TASK NUMBER": task?.taskid || "",
            "DESCRIPTION": task?.description || "",
            STATUS: "Available",
          }))
          : [
            {
              "TASK NUMBER": "",
              "DESCRIPTION": "",
              STATUS: "",
            },
          ];
    } else {
      // Status === false: Include MAN HOURS and DESCRIPTION as empty
      excelData =
        filteredTasks.length > 0
          ? filteredTasks.map((task) => ({
            "TASK NUMBER": task?.taskid || "",
            DESCRIPTION: task?.description || "",
            "MAN HOURS": "",
            STATUS: "Not Available",
          }))
          : [
            {
              "TASK NUMBER": "",
              DESCRIPTION: "",
              "MAN HOURS": "",
              STATUS: "",
            },
          ];
    }

    // Create Excel sheet and download
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MPD");

    XLSX.writeFile(
      wb,
      `Estimate_${selectedEstimateId}_${status ? "Available" : "NotAvailable"
      }.xlsx`
    );
  };

  const downloadExcelValidateByID = (status: boolean) => {
    // Combine both the original validated tasks and additional validated tasks
    const allValidatedTasks = [...validatedTasksByID, ...validatedAdditionalTasks];
    // Filter based on the selected status (available or not available)
    const filteredTasks = allValidatedTasks.filter((task) => task?.status === status) || [];

    // const filteredTasks =
    //   validatedTasks?.filter((task) => task?.status === status) || [];

    let excelData: Record<string, any>[] = [];

    if (status) {
      // Status === true: Only include TASK NUMBER, ESTIMATE ID, STATUS
      excelData =
        filteredTasks.length > 0
          ? filteredTasks.map((task) => ({
            "TASK NUMBER": task?.taskid || "",
            "DESCRIPTION": task?.description || "",
            STATUS: "Available",
          }))
          : [
            {
              "TASK NUMBER": "",
              "DESCRIPTION": "",
              STATUS: "",
            },
          ];
    } else {
      // Status === false: Include MAN HOURS and DESCRIPTION as empty
      excelData =
        filteredTasks.length > 0
          ? filteredTasks.map((task) => ({
            "TASK NUMBER": task?.taskid || "",
            DESCRIPTION: task?.description || "",
            "MAN HOURS": "",
            STATUS: "Not Available",
          }))
          : [
            {
              "TASK NUMBER": "",
              DESCRIPTION: "",
              "MAN HOURS": "",
              STATUS: "",
            },
          ];
    }

    // Create Excel sheet and download
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MPD");

    XLSX.writeFile(
      wb,
      `Estimate_${selectedEstimateId}_${status ? "Available" : "NotAvailable"
      }.xlsx`
    );
  };

  const downloadExcelFilteredTasks = (status: boolean) => {
    const filteredTasks = combinedFilteredTasksList?.filter((task) => task?.status === status) || [];
    let excelData: Record<string, any>[] = [];
    if (status) {
      // Status === true: Only include TASK NUMBER, ESTIMATE ID, STATUS
      excelData =
        filteredTasks.length > 0
          ? filteredTasks.map((task) => ({
            "TASK NUMBER": task?.task_number || "",
            "DESCRIPTION": task?.description || "",
            // STATUS: "Available",
          }))
          : [
            {
              "TASK NUMBER": "",
              "DESCRIPTION": "",
              // STATUS: "",
            },
          ];
    } else {
      // Status === false: Include MAN HOURS and DESCRIPTION as empty
      excelData =
        filteredTasks.length > 0
          ? filteredTasks.map((task) => ({
            "TASK NUMBER": task?.task_number || "",
            DESCRIPTION: task?.description || "",
            // "MAN HOURS": "",
            // STATUS: "Not Available",
          }))
          : [
            {
              "TASK NUMBER": "",
              DESCRIPTION: "",
              // "MAN HOURS": "",
              // STATUS: "",
            },
          ];
    }
    // Create Excel sheet and download
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MPD");
    XLSX.writeFile(
      wb,
      `Estimate_${selectedEstimateId}_${status ? "Filtered_Available" : "Filtered_NotAvailable"
      }.xlsx`
    );
  };


  const [estimateDetails, setEstimateDetails] = useState<any>(null);
  const [loadingEstDet, setLoadingEstDet] = useState(false);
  const [selectedEstimateIdDetails, setSelectedEstimateIdDetails] = useState<any>();

  // useEffect(() => {
  //   const fetchEstDetails = async () => {
  //     setLoadingEstDet(true);
  //     const data = await getEstimateDetailsByID(selectedEstimateIdDetails);
  //     if (data) {
  //       setEstimateDetails(data);
  //     }
  //     setLoadingEstDet(false);
  //   };

  //   fetchEstDetails();
  // }, [selectedEstimateIdDetails]);
 
//   useEffect(() => {
//     const fetchEstDetails = async () => {
//       setLoadingEstDet(true);
//       const data = await getEstimateDetailsByID(selectedEstimateIdDetails);
//       if (data) {
//         setEstimateDetails(data);

//         // Populate form with API response data
//         const formData = {
//           tasks: data.tasks || [],
//           probability: data.probability || 0,
//           operator: data.operator || "",
//           operatorForModel: data.operatorForModel || false,
//           aircraftRegNo: data.aircraftRegNo || "",
//           aircraftModel: data.aircraftModel || "",
//           aircraftAge: data.aircraftAge || 0,
//           aircraftAgeThreshold: data.aircraftAgeThreshold || 3,
//           aircraftFlightHours: data.aircraftFlightHours || "",
//           aircraftFlightCycles: data.aircraftFlightCycles || "",
//           areaOfOperations: data.areaOfOperations || "",
//           cappingDetails: {
//             cappingTypeManhrs: data.cappingDetails?.cappingTypeManhrs || "",
//             cappingManhrs: data.cappingDetails?.cappingManhrs || "",
//             cappingTypeSpareCost: data.cappingDetails?.cappingTypeSpareCost || "",
//             cappingSpareCost: data.cappingDetails?.cappingSpareCost || "",
//           },
//           taskID: data.taskID || "",
//           taskDescription: data.taskDescription || "",
//           typeOfCheck: data.typeOfCheck || [],
//           typeOfCheckID: data.typeOfCheckID || "",
//           miscLaborTasks: data.miscLaborTasks || [],
//           additionalTasks: data.additionalTasks || [],
//           considerDeltaUnAvTasks: data.considerDeltaUnAvTasks || false,
//         };

//         // Set form values
//         form.setValues(formData);

//         // Update search state for operator combobox to reflect the populated value
//         setSearch(data.operator || "");

//         // Auto-populate selectedFields and showFields based on API data
//         const fieldsToShow = [];

//         // Check which optional fields have values and should be shown
//         if (data.probability) fieldsToShow.push("probability");
//         if (data.aircraftFlightCycles) fieldsToShow.push("aircraftFlightCycles");
//         if (data.aircraftFlightHours) fieldsToShow.push("aircraftFlightHours");
//         if (data.aircraftAgeThreshold && data.aircraftAgeThreshold !== 3) fieldsToShow.push("aircraftAgeThreshold");
//         if (data.areaOfOperations) fieldsToShow.push("areaOfOperations");
//         if (data.cappingDetails?.cappingManhrs || data.cappingDetails?.cappingTypeManhrs) fieldsToShow.push("cappingManhrs");
//         if (data.cappingDetails?.cappingSpareCost || data.cappingDetails?.cappingTypeSpareCost) fieldsToShow.push("cappingSpares");

//         // Update selected fields and show fields
//         setSelectedFields(fieldsToShow);
//         setShowFields(fieldsToShow);

//         // Force re-render to update form keys
//         setFormKey(prev => prev + 1);

//         // Scroll to top after state updates are complete
//         setTimeout(() => {
//           // Method 1: Scroll to Required Parameters section
//           const requiredSection = document.getElementById('required-parameters-section');
//           if (requiredSection) {
//             requiredSection.scrollIntoView({
//               behavior: 'smooth',
//               block: 'start',
//               inline: 'nearest'
//             });
//           }

//           // Method 2: Scroll the ScrollArea viewport to top
//           if (scrollAreaRef.current) {
//             const viewport = scrollAreaRef.current.querySelector('[data-scrollarea-viewport]');
//             if (viewport) {
//               viewport.scrollTop = 0;
//             }
//           }

//           // Method 3: Scroll the card into view
//           if (cardRef.current) {
//             cardRef.current.scrollIntoView({
//               behavior: 'smooth',
//               block: 'start',
//               inline: 'start'
//             });
//           }

//         }, 500);

//         // Immediate scroll attempt
//         if (scrollAreaRef.current) {
//           const viewport = scrollAreaRef.current.querySelector('[data-scrollarea-viewport]');
//           if (viewport) {
//             viewport.scrollTop = 0;
//           }
//         }
//       }
//       setLoadingEstDet(false);
//     };

//     if (selectedEstimateIdDetails) {
//       fetchEstDetails();
//     }
//   }, [selectedEstimateIdDetails]);


const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

const handleEditAndGenerateFile = async (estID: string) => {
  try {
    setLoadingEditId(estID); // ✅ set loading for this specific estimate
    setLoadingEstDet(true);

    // Step 1: Fetch Estimate Details
    const data = await getEstimateDetailsByID(estID);
    if (!data) {
      setLoadingEditId(null);
      return;
    }

    // Step 2: Populate Form
    setSelectedEstimateIdDetails(estID);
    setEstimateDetails(data);

    const formData = {
      tasks: data.tasks || [],
      probability: data.probability || 0,
      operator: data.operator || "",
      operatorForModel: data.operatorForModel || false,
      aircraftRegNo: data.aircraftRegNo || "",
      aircraftModel: data.aircraftModel || "",
      aircraftAge: data.aircraftAge || "", // was 0, now empty string for input
      aircraftAgeThreshold: data.aircraftAgeThreshold || 3,
      aircraftFlightHours: data.aircraftFlightHours || "",
      aircraftFlightCycles: data.aircraftFlightCycles || "",
      areaOfOperations: data.areaOfOperations || "",
      cappingDetails: {
        cappingTypeManhrs: data.cappingDetails?.cappingTypeManhrs || "",
        cappingManhrs: data.cappingDetails?.cappingManhrs || "",
        cappingTypeSpareCost: data.cappingDetails?.cappingTypeSpareCost || "",
        cappingSpareCost: data.cappingDetails?.cappingSpareCost || "",
      },
      taskID: data.taskID || "",
      taskDescription: data.taskDescription || "",
      typeOfCheck: data.typeOfCheck || [],
      typeOfCheckID: data.typeOfCheckID || "",
      miscLaborTasks: data.miscLaborTasks || [],
      additionalTasks: data.additionalTasks || [],
      considerDeltaUnAvTasks: data.considerDeltaUnAvTasks || false,
    };

    form.setValues(formData);
    setSearch(data.operator || "");

    // Step 3: Optional Fields
    const fieldsToShow = [];
    if (data.probability) fieldsToShow.push("probability");
    if (data.aircraftFlightCycles) fieldsToShow.push("aircraftFlightCycles");
    if (data.aircraftFlightHours) fieldsToShow.push("aircraftFlightHours");
    if (data.aircraftAgeThreshold && data.aircraftAgeThreshold !== 3) fieldsToShow.push("aircraftAgeThreshold");
    if (data.areaOfOperations) fieldsToShow.push("areaOfOperations");
    if (data.cappingDetails?.cappingManhrs || data.cappingDetails?.cappingTypeManhrs) fieldsToShow.push("cappingManhrs");
    if (data.cappingDetails?.cappingSpareCost || data.cappingDetails?.cappingTypeSpareCost) fieldsToShow.push("cappingSpares");

    setSelectedFields(fieldsToShow);
    setShowFields(fieldsToShow);
    setFormKey((prev) => prev + 1);

    // Step 4: Generate Excel
    const tasks = data.task || [];
    const descriptions = data.description || [];

    const excelData = tasks.length && descriptions.length
      ? tasks.map((task: string, idx: number) => ({
          "TASK NUMBER": task || "",
          "DESCRIPTION": descriptions[idx] || "",
        }))
      : [{ "TASK NUMBER": "", "DESCRIPTION": "" }];

    const worksheet = XLSX.utils.json_to_sheet(excelData, { skipHeader: false });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MPD");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const file = new File([blob], `Estimate_${estID}.xlsx`, { type: blob.type });

    await handleFileChange(file, tasks, descriptions, {
      sheetName: "MPD",
      columnName: "TASK NUMBER",
    });

    // Step 5: Scroll (optional)
    setTimeout(() => {
      document.getElementById("required-parameters-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      const viewport = scrollAreaRef.current?.querySelector("[data-scrollarea-viewport]");
      if (viewport) viewport.scrollTop = 0;

      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 500);
  } catch (err) {
    console.error("❌ Error in Edit & Re-run:", err);
  } finally {
    setLoadingEditId(null);
    setLoadingEstDet(false);
  }
};





  // console.log("Estimate Id Details >>>", estimateDetails);

  const [filteredTasksList, setFilteredTasksList] = useState<any>(null);
  const [loadingFiltTasks, setLoadingFiltTasks] = useState(false);
  useEffect(() => {
    const fetchFilteredTasks = async () => {
      setLoadingFiltTasks(true);
      const data = await getFilteredTasksByID(selectedEstimateId);
      if (data) {
        setFilteredTasksList(data);
      }
      setLoadingFiltTasks(false);
    };

    fetchFilteredTasks();
  }, [selectedEstimateId]);

  // Combine both arrays and add a status field to distinguish between available/not available
  const combinedFilteredTasksList = [
    ...(filteredTasksList?.available_tasks || [])
      .map((task: any) => ({
        ...task,
        status: true
      }))
      .filter((task: any) => task.task_number && task.task_number.trim() !== ''),

    ...(filteredTasksList?.not_avialable_tasks || [])
      .map((task: any) => ({
        ...task,
        status: false
      }))
      .filter((task: any) => task.task_number && task.task_number.trim() !== '')
  ];


  // // console.log("Filtered Tasks List >>>", filteredTasksList);
  // // console.log("Filtered combined List >>>", combinedFilteredTasksList);

  // const downloadAllValidatedTasks = async (
  //   tasks: string[],
  //   descriptions: string[],
  //   estID: string
  // ) => {
  //   // Check if tasks and descriptions have data
  //   const hasData = tasks.length > 0 && descriptions.length > 0;

  //   const excelData = hasData
  //     ? tasks.map((task, index) => ({
  //       "TASK NUMBER": task || "",
  //       DESCRIPTION: descriptions[index] || "",
  //       "FINAL MH": "",
  //     }))
  //     : [
  //       {
  //         "TASK NUMBER": "",
  //         DESCRIPTION: "",
  //         "FINAL MH": "",
  //       },
  //     ];

  //   // Create and download Excel
  //   const ws = XLSX.utils.json_to_sheet(excelData);
  //   const wb = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, "MPD");
  //   XLSX.writeFile(wb, `Estimate_${estID}.xlsx`);
  // };

  // Reset counter for keys to force re-render

  const downloadAllValidatedTasks = async (
    tasks: string[],
    descriptions: string[],
    estID: string
  ) => {
    // Check if tasks and descriptions have data
    const hasData = tasks.length > 0 && descriptions.length > 0;

    const excelData = hasData
      ? tasks.map((task, index) => ({
        "TASK NUMBER": task || "",
        DESCRIPTION: descriptions[index] || "",
        "FINAL MH": "",
      }))
      : [
        {
          "TASK NUMBER": "",
          DESCRIPTION: "",
          "FINAL MH": "",
        },
      ];

    // Create Excel workbook
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MPD");

    // Generate Excel file as blob instead of direct download
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Create File object from blob
    const fileName = `Estimate_${estID}.xlsx`;
    const file = new File([blob], fileName, { type: blob.type });

    // Download the file (for user to have a copy)
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);

    // Auto-select the file in dropzone by calling handleFileChange
    // Extract tasks from the created data for validation
    const extractedTasks = hasData ? tasks : [];
    const extractedDescriptions = hasData ? descriptions : [];

    // Call handleFileChange with the created file
    await handleFileChange(file, extractedTasks, extractedDescriptions, {
      sheetName: "MPD",
      columnName: "TASK NUMBER"
    });
  };
  // Modified function to create Excel and auto-select without download
  const createAndSelectExcelFile = async (
    tasks: string[],
    descriptions: string[],
    estID: string
  ) => {
    try {
      // Check if tasks and descriptions have data
      const hasData = tasks.length > 0 && descriptions.length > 0;

      const excelData = hasData
        ? tasks.map((task, index) => ({
          "TASK NUMBER": task || "",
          DESCRIPTION: descriptions[index] || "",
          "FINAL MH": "",
        }))
        : [
          {
            "TASK NUMBER": "",
            DESCRIPTION: "",
            "FINAL MH": "",
          },
        ];

      // Create Excel workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "MPD");

      // Generate Excel file as blob (without download)
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Create File object from blob
      const fileName = `Estimate_${estID}.xlsx`;
      const file = new File([blob], fileName, { type: blob.type });

      // Extract tasks from the created data for validation
      const extractedTasks = hasData ? tasks : [];
      const extractedDescriptions = hasData ? descriptions : [];

      // Auto-select the file in dropzone by calling handleFileChange
      await handleFileChange(file, extractedTasks, extractedDescriptions, {
        sheetName: "MPD",
        columnName: "TASK NUMBER"
      });

      // console.log(`Excel file ${fileName} created and auto-selected successfully`);

    } catch (error) {
      console.error('Error creating and selecting Excel file:', error);
      // Optional: Show user-friendly error message
      // toast.error('Failed to create and select Excel file');
    }
  };

//   const downloadAllValidatedTasksOnly = async (
//     tasks: string[],
//     descriptions: string[],
//     estID: string
//   ) => {
//     // Check if tasks and descriptions have data
//     const hasData = tasks.length > 0 && descriptions.length > 0;

//     const excelData = hasData
//       ? tasks.map((task, index) => ({
//         "TASK NUMBER": task || "",
//         DESCRIPTION: descriptions[index] || "",
//         "FINAL MH": "",
//       }))
//       : [
//         {
//           "TASK NUMBER": "",
//           DESCRIPTION: "",
//           "FINAL MH": "",
//         },
//       ];

//     // Create Excel workbook
//     const ws = XLSX.utils.json_to_sheet(excelData);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "MPD");

//     // Generate Excel file as blob instead of direct download
//     const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
//     const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

//     // Create File object from blob
//     const fileName = `Estimate_${estID}.xlsx`;
//     const file = new File([blob], fileName, { type: blob.type });

//     // Download the file (for user to have a copy)
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = fileName;
//     link.click();
//     window.URL.revokeObjectURL(url);
//   };
const [downloadingEstId, setDownloadingEstId] = useState<string | null>(null);

const downloadAllValidatedTasksOnly = async (estID: string) => {
  try {
    setDownloadingEstId(estID); // Mark this button as loading

    const validatedTasks = await getValidatedTasksByID(estID);

    if (!validatedTasks || validatedTasks.length === 0) {
      setDownloadingEstId(null);
      // showAppNotification("warning", "No validated tasks found.");
      return;
    }

    // Format data: TASK NUMBER and DESCRIPTION
    const excelData = validatedTasks.map((task: any) => ({
      "TASK NUMBER": task.taskid || "",
      "DESCRIPTION": task.description || "",
    }));

    // Create Excel sheet and download
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MPD"); // ✅ Sheet name

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = `Estimate_${estID}.xlsx`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Download error:", error);
    // showAppNotification("error", "Download failed");
  } finally {
    setDownloadingEstId(null); // Reset loading
  }
};




  const [formKey, setFormKey] = useState(0);
  // Add ref for scroll container
  const scrollAreaRefFields = useRef<HTMLDivElement>(null);
  // Add ref for the card container
  const cardRef = useRef<HTMLDivElement>(null);
  // Add ref for scroll container
  const scrollAreaRefContainer = useRef<HTMLDivElement>(null);

  // Form initialization
  const form = useForm<any>({
    initialValues: {
      tasks: [],
      probability: 0,
      operator: "",
      operatorForModel: false,
      aircraftRegNo: "",
      aircraftModel: "",
      aircraftAge: "", // was 0, now empty string for input
      aircraftAgeThreshold: 3,
      aircraftFlightHours: "",
      aircraftFlightCycles: "",
      areaOfOperations: "",
      cappingDetails: {
        cappingTypeManhrs: "",
        cappingManhrs: "",
        cappingTypeSpareCost: "",
        cappingSpareCost: "",
      },
      taskID: "",
      taskDescription: "",
      typeOfCheck: [],
      typeOfCheckID: "",
      miscLaborTasks: [],
      additionalTasks: [],
      considerDeltaUnAvTasks: false,
    },
    validateInputOnChange: true,

    validate: {
      operator: (value) => (value?.trim() ? null : "Operator is required"),
      aircraftRegNo: (value) =>
        value?.trim() ? null : "Aircraft Registration Number is required",
      typeOfCheck: (value) =>
        value?.length > 0 ? null : "Type of Check is required", // Modified for array validation
      typeOfCheckID: (value) =>
        value?.trim() ? null : "Type of Check ID is required", // Added validation
      aircraftModel: (value) =>
        value?.trim() ? null : "Aircraft Model is required",

      cappingDetails: {
        // Man Hours Capping Validation
        cappingTypeManhrs: (value, values) => {
          if (!value && values.cappingDetails.cappingManhrs) {
            return "Man Hours Type is required when Man Hours are entered";
          }
          return null;
        },
        cappingManhrs: (value, values) => {
          if (!value && values.cappingDetails.cappingTypeManhrs) {
            return "Man Hours is required when Type is selected";
          }
          return null;
        },

        // Spare Cost Capping Validation
        cappingTypeSpareCost: (value, values) => {
          if (!value && values.cappingDetails.cappingSpareCost) {
            return "Capping Type is required when Cost is entered";
          }
          return null;
        },
        cappingSpareCost: (value, values) => {
          if (!value && values.cappingDetails.cappingTypeSpareCost) {
            return "Cost is required when Type is selected";
          }
          return null;
        },
      },
    },
  });



  // API Data Fetching and State Management
  const [operatorsListAll, setOperatorsList] = useState<any[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  useEffect(() => {
    const fetchOperators = async () => {
      setLoadingOperators(true);
      const data = await getOperatorsList();
      if (data) {
        setOperatorsList(data);
      }
      setLoadingOperators(false);
    };

    fetchOperators();
  }, []);

  // console.log("all operatorsListAll>>>", operatorsListAll);

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [data, setData] = useState<string[]>([]);
  const [search, setSearch] = useState(form.values.operator);

  // Deduplicate operator list from API
  useEffect(() => {
    const uniqueOperators = Array.from(
      new Set(
        operatorsListAll.map((item: string) => item.trim().toLowerCase())
      )
    );

    const originalCasedOperators = uniqueOperators.map((unique) =>
      operatorsListAll.find(
        (item: string) => item.trim().toLowerCase() === unique
      ) || unique
    );

    setData(originalCasedOperators);
  }, [operatorsListAll]);

  const exactOptionMatch = data.some(
    (item) => item.toLowerCase() === search.toLowerCase()
  );

  const filteredOptions = exactOptionMatch
    ? data
    : data.filter((item) =>
      item.toLowerCase().includes(search.toLowerCase().trim())
    );

  const options = filteredOptions.map((item) => (
    <Combobox.Option
      value={item}
      key={item}
      style={{
        fontSize: '13px',
        padding: '6px 12px',
      }}
    >
      {item}
    </Combobox.Option>
  ));

  const clearSelection = () => {
    form.setFieldValue('operator', '');
    setSearch('');
    form.setFieldValue('operatorForModel', false);
    form.validateField('operator');
  };


  // Handle Submit
  const handleSubmit = async () => {
    const validationResult = form.validate();

    // Check if the form is valid
    if (validationResult.hasErrors) {
      // Find first input with error and focus it
      const errorFields = Object.keys(form.errors);
      if (errorFields.length > 0) {
        // Scroll to first error field if ref is available
        const firstErrorField = errorFields[0];
        if (firstErrorField === 'aircraftRegNo' && aircraftRegNoRef.current) {
          aircraftRegNoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          aircraftRegNoRef.current.focus();
        }
      }
      return;
    }

    // Additional custom validations
    if (
      form.values.aircraftRegNo.trim().toLowerCase() === "n/a" &&
      form.values.typeOfCheck.length === 0
    ) {
      form.setFieldError("typeOfCheck", "When Aircraft Registration Number is N/A, Type of Check is mandatory");
      return;
    }

    if (!selectedFile && additionalTasks.length === 0) {
      showAppNotification(
        "warning",
        "Error",
        "Please select a file or add at least one Additional Task."
      );
      return;
    }

    const validTasks = validatedTasks?.filter((task) => task?.status)?.map((task) => task?.taskid);

    const defaultAdditionalTasks = additionalTasks.length > 0
      ? additionalTasks
      : [{ taskID: "", taskDescription: "" }];

    const defaultMiscLaborTasks = selectedExpertInsightTasks.length > 0
      ? selectedExpertInsightTasks
      : [{
        taskID: "",
        taskDescription: "",
        manHours: 0,
        skill: "",
        spareParts: [
          { partID: "", description: "", quantity: 0, unit: "", price: 0 },
        ],
      }];

    const requestData = {
      tasks: validTasks || [],
      probability: Number(form.values.probability) || 0,
      operator: form.values.operator || "",
      operatorForModel: form.values.operatorForModel || false,
      aircraftRegNo: form.values.aircraftRegNo || "",
      aircraftModel: form.values.aircraftModel || "",
      aircraftAge: form.values.aircraftAge || 0, // Send 0 if empty
      aircraftAgeThreshold: form.values.aircraftAgeThreshold || 3,
      aircraftFlightHours: Number(form.values.aircraftFlightHours) || 0,
      aircraftFlightCycles: Number(form.values.aircraftFlightCycles) || 0,
      areaOfOperations: form.values.areaOfOperations || "",
      cappingDetails: {
        cappingTypeManhrs: form.values.cappingDetails.cappingTypeManhrs || "",
        cappingManhrs:
          form.values.cappingDetails.cappingManhrs?.toString().trim() === ""
            ? 0
            : Number(form.values.cappingDetails.cappingManhrs),
        cappingTypeSpareCost: form.values.cappingDetails.cappingTypeSpareCost || "",
        cappingSpareCost:
          form.values.cappingDetails.cappingSpareCost?.toString().trim() === ""
            ? 0
            : Number(form.values.cappingDetails.cappingSpareCost),
      },
      additionalTasks: defaultAdditionalTasks,
      typeOfCheck: form.values.typeOfCheck || [],
      typeOfCheckID: form.values.typeOfCheckID || "",
      miscLaborTasks: defaultMiscLaborTasks,
      considerDeltaUnAvTasks: form.values.considerDeltaUnAvTasks || false,
    };
    // // console.log("request data >>>>",requestData);
    try {
      setLoading(true);

      let fileToUpload = selectedFile;

      // ✅ Load fallback file if selectedFile is null
      if (!fileToUpload) {
        const response = await fetch(excelTemplateFile);
        const blob = await response.blob();
        fileToUpload = new File([blob], "empty-template.xlsx", { type: blob.type });
      }

      const response = await RFQFileUpload(requestData, fileToUpload);
      if (response) {
        setRfqSubmissionResponse(response);
        setRfqSubModalOpened(true);
        showAppNotification("success", "Success!", "RFQ submitted successfully!");

        // Reset form and states
        form.reset();
        form.setValues({
          tasks: [],
          probability: 0,
          operator: "",
          aircraftRegNo: "",
          aircraftModel: "",
          aircraftAge: "",
          operatorForModel: false,
          aircraftFlightHours: "",
          aircraftFlightCycles: "",
          areaOfOperations: "",
          cappingDetails: {
            cappingTypeManhrs: "",
            cappingManhrs: "",
            cappingTypeSpareCost: "",
            cappingSpareCost: "",
          },
          taskID: "",
          taskDescription: "",
          typeOfCheck: [],
          typeOfCheckID: "",
          miscLaborTasks: [],
          additionalTasks: [],
          considerDeltaUnAvTasks: false,
        });
        setSearch(""); // <-- Clear operator search state
        setSelectedFile(null);
        setValidatedTasks([]);
        setAdditionalTasks([]);
        setSelectedExpertInsightTasks([]);
        setFormKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error("API Error:", error);
      showAppNotification("error", "Error!", "Failed to submit RFQ!");
    } finally {
      setLoading(false);
    }
  };


  // console.log("rfq sub >>> ", rfqSubmissionResponse);

  const [modalTaskValidateData, setModalTaskValidateData] = useState<any>(null);
  const [loadingModalTasksValidate, setLoadingModalTasksValidate] = useState(false);

    useEffect(() => {
    const fetchModalTasksValidate = async () => {
      setLoadingModalTasksValidate(true);

      // Extract task numbers and descriptions as string arrays
      const additionalTaskIDs =
        additionalTasks?.map((task:any) => task.taskID?.toString() || "") || [];
      const additionalTaskDescriptions =
        additionalTasks?.map((task:any) => task.taskDescription?.toString() || "") || [];

      // Prepare request payload
      const requestData = {
        MPD_TASKS: {
          tasks: extractedTasks || [],
          description: extractedDescriptions || [],
        },
        ADD_TASKS: {
          tasks: additionalTaskIDs,
          description: additionalTaskDescriptions,
        },
        typeOfCheck: form.values.typeOfCheck || [],
        aircraftAge: form.values.aircraftAge || 0,
        aircraftModel: form.values.aircraftModel || "",
        operatorForModel: form.values.operatorForModel || false,
        operator: form.values.operator || "",
        aircraftAgeThreshold: form.values.aircraftAgeThreshold || 3,
      };

      const data = await getModelTasksValidate(requestData);
      setModalTaskValidateData(data);
      setLoadingModalTasksValidate(false);
    };

    fetchModalTasksValidate();
  }, [
    extractedTasks,
    additionalTasks,
    form.values.typeOfCheck,
    form.values.aircraftAge,
    form.values.aircraftModel,
    form.values.operatorForModel,
    form.values.operator,
    form.values.aircraftAgeThreshold,
  ]);

  // console.log("Modal Task Validate Data >>>", modalTaskValidateData);

  const combinedModalTasksValidate = [
    ...(modalTaskValidateData?.filtered_tasks_list || [])
      .map((task: any) => ({
        ...task,
        status: true
      }))
      .filter((task: any) => task.task_number && task.task_number.trim() !== ''),

    ...(modalTaskValidateData?.not_available_tasks_list || [])
      .map((task: any) => ({
        ...task,
        status: false
      }))
      .filter((task: any) => task.task_number && task.task_number.trim() !== '')
  ];

  const combinedModalTasksValidateAdditional = [
    ...(modalTaskValidateData?.add_filtered_tasks || [])
      .map((task: any) => ({
        ...task,
        status: true
      }))
      .filter((task: any) => task.task_number && task.task_number.trim() !== ''),

    ...(modalTaskValidateData?.add_not_available_tasks || [])
      .map((task: any) => ({
        ...task,
        status: false
      }))
      .filter((task: any) => task.task_number && task.task_number.trim() !== '')
  ];

  // console.log("Combined Modal Tasks Validate >>>", combinedModalTasksValidate);

  const [excelModalOpened, setExcelModalOpened] = useState(false);
  const [downloadedNotAvailableTasks, setDownloadedNotAvailableTasks] = useState<any[]>([]);

  const downloadExcelModalTaskValidate = (
  status: boolean,
  setTaskListCallback?: (tasks: any[]) => void
) => {
  const filteredTasks =
    combinedModalTasksValidate?.filter((task) => task?.status === status) || [];

  let excelData: Record<string, any>[] = [];

  if (status) {
    // Status === true: only TASK NUMBER & DESCRIPTION
    excelData =
      filteredTasks.length > 0
        ? filteredTasks.map((task) => ({
            "TASK NUMBER": task?.task_number || "",
            DESCRIPTION: task?.description || "",
          }))
        : [{ "TASK NUMBER": "", DESCRIPTION: "" }];
  } else {
    // Status === false: TASK NUMBER, DESCRIPTION, CHECK CATEGORY (comma-separated)
    excelData =
      filteredTasks.length > 0
        ? filteredTasks.map((task) => ({
            "TASK NUMBER": task?.task_number || "",
            DESCRIPTION: task?.description || "",
            "CHECK CATEGORY": Array.isArray(task?.check_category)
              ? task.check_category.filter(Boolean).join(", ")
              : "",
          }))
        : [{ "TASK NUMBER": "", DESCRIPTION: "", "CHECK CATEGORY": "" }];
  }

  // Download Excel
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "MPD");
  XLSX.writeFile(
    wb,
    `Estimate_${selectedEstimateId}_${
      status ? "ModalTasks_Available" : "ModalTasks_NotAvailable"
    }.xlsx`
  );

  // Pass filtered data for modal if status === false
  if (!status && setTaskListCallback) {
    setTaskListCallback(excelData);
  }
};


//   const handleSubmitSkills = async () => {
//     const validTasks = validatedSkillsTasks
//       ?.filter((task) => task?.status === true)
//       ?.map((task) => task?.taskid);

//     if (validTasks.length === 0) {
//       // showAppNotification("warning", "Warning!", "No valid tasks available to estimate the report.");
//       return null; // Return null to indicate no response
//     }

//     const requestData = {
//       source_tasks: validTasks,
//     };

//     // console.log("Submitting data:", requestData);

//     try {
//       setLoading(true);
//       const response = await getSkillAnalysis(requestData);
//       // console.log("API Response:", response);

//       // if (response) {
//       setSkillAnalysisData(response);
//       // showAppNotification("success", "Success!", "Successfully Generated Skill Analysis");
//       return response; // Return the response
//       // }
//     } catch (error) {
//       // showAppNotification("error", "Error!", "Failed Generating Skill Analysis, try again");
//       console.error("API Error:", error);
//     } finally {
//       setLoading(false);
//     }
//     return null; // Return null if no response
//   };

//   useEffect(() => {
//     handleSubmitSkills();
//   }, [validatedSkillsTasks]);

const handleSubmitSkills = async (validatedTasks: any[]) => {
  const validTasks = validatedTasks
    ?.filter((task) => task?.status === true)
    ?.map((task) => task?.taskid);

  if (!validTasks || validTasks.length === 0) {
    // showAppNotification("warning", "Warning!", "No valid tasks available to estimate the report.");
    return null;
  }

  const requestData = {
    source_tasks: validTasks,
  };

  // console.log("Submitting to skill analysis:", requestData);

  try {
    setLoading(true);
    const response = await getSkillAnalysis(requestData);
    // console.log("🎯 Skill Analysis Response:", response);
    setSkillAnalysisData(response);
    return response;
  } catch (error) {
    console.error("Skill Analysis API Error:", error);
    // showAppNotification("error", "Error!", "Failed Generating Skill Analysis");
  } finally {
    setLoading(false);
  }

  return null;
};


  // console.log("skillAnalysisData", skillAnalysisData);

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
  // console.log("estimate report >>>>", estimateReportData);

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
  // console.log("probabilityWiseData  >>>>", probabilityWiseData);

  // Transform data for the chart
  const transformedData = probabilityWiseData?.estProb?.map((item: any) => ({
    prob: item?.prob, // Multiply by 100 and round
    totalManhrs: Math.round(item?.totalManhrs),
    totalSpareCost: Math.round(item?.totalSpareCost),
  }));

  // Define your custom series names here
  const customSeriesNames = {
    totalManhrs: "Total Man Hours", // Custom name for totalManhrs
    totalSpareCost: "Total Spares Cost" // Custom name for totalSpareCost
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownload = (id: any) => {
    downloadEstimatePdf(id);
  };


  const handleAddAdditionalTask = () => {
    setAdditionalTasks([
      ...additionalTasks,
      { taskID: "", taskDescription: "" },
    ]);
  };

  const handleDeleteAdditionalTask = (index: any) => {
    const newTasks = additionalTasks.filter((_: any, i: any) => i !== index);
    setAdditionalTasks(newTasks);
  };

  const handleTaskChange = (index: any, field: any, value: any) => {
    const newTasks = additionalTasks.map((task: any, i: any) =>
      i === index ? { ...task, [field]: value } : task
    );
    setAdditionalTasks(newTasks);
  };

  // console.log("additional tasks >>>>", additionalTasks);

  // Step 3: Modify the "Show Tasks" button click handler to include additional tasks validation
  const handleShowTasks = async () => {
     (selectedFile?.name);
    setSelectedFileTasksOpened(true);

    // Check if there are any additional tasks to validate
    if (additionalTasks.length > 0) {
      // Extract task IDs from the additionalTasks array
      const additionalTaskIds = additionalTasks
        .filter((task: any) => task.taskID.trim() !== "")
        .map((task: any) => task.taskID);
      // Extract task IDs from the additionalTasks Descriptions array
      const additionalTaskDescriptions = additionalTasks
        .filter((task: any) => task.taskID.trim() !== "")
        .map((task: any) => task.taskDescription);

      // Only proceed with validation if there are valid task IDs
      if (additionalTaskIds.length > 0) {
        await validateAdditionalTasks(additionalTaskIds, additionalTaskDescriptions);
      }
    }
  };


  // Step 4: Create a function for validating additional tasks
  const validateAdditionalTasks = async (taskIds: any, descriptions: any) => {
    setIsValidating(true);
    try {
      const response = await validateTasks(taskIds, descriptions);
      if (response.length > 0) {
        setValidatedAdditionalTasks(response);
      }
      // console.log("Validated Additional Tasks:", response);
    } catch (error) {
      console.error("Error validating additional tasks:", error);
    } finally {
      setIsValidating(false);
    }
  };
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

  //     // console.log("Submitting data:", requestData);

  //     try {
  //         setLoading(true);
  //         const response = await postEstimateReport(requestData);
  //         // console.log("API Response:", response);

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
  //     // console.log("Updated UI response:", estimateReportData);
  // }, [estimateReportData]);
  // // console.log("response UI >>>>", estimateReportData);
  const [expanded, setExpanded] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [showFields, setShowFields] = useState<string[]>([]);

  const toggleFieldSelection = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };
  const fields = [
    {
      label: "Select Probability",
      name: "probability",
      component: (
        <NumberInput
          size="xs"
          min={0}
          max={100}
          step={1}
          {...form.getInputProps("probability")}
        />
      ),
    },
    {
      label: "Flight Cycles",
      name: "aircraftFlightCycles",
      component: (
        <TextInput
          size="xs"
          placeholder="Ex:50"
          {...form.getInputProps("aircraftFlightCycles")}
        />
      ),
    },
    {
      label: "Flight Hours",
      name: "aircraftFlightHours",
      component: (
        <TextInput
          size="xs"
          placeholder="Ex:50"
          {...form.getInputProps("aircraftFlightHours")}
        />
      ),
    },
    {
      label: "Aircraft Age Threshold",
      name: "aircraftAgeThreshold",
      component: (
        <TextInput
          size="xs"
          placeholder="Ex:3"
          {...form.getInputProps("aircraftAgeThreshold")}
        />
      ),
    },
    {
      label: "Area of Operations",
      name: "areaOfOperations",
      component: (
        <TextInput
          size="xs"
          placeholder="Ex: Area"
          {...form.getInputProps("areaOfOperations")}
        />
      ),
    },
    {
      label: "Expert Insights",
      name: "expertInsights",
      component: (
        <MultiSelect
          size="xs"
          // label="Expert Insights"
          placeholder="Select from Insights"
          data={expertInsightsTasks?.map((task) => ({
            value: task.taskID,
            label: task.taskID,
          }))}
          value={selectedExpertInsightsTaskIDs}
          onChange={handleExpertInsightsChange}
          style={(theme) => ({
            // Customize the selected badge styles
            selected: {
              backgroundColor: theme.colors.green[6], // Change this to your desired color
              color: theme.white, // Change text color if needed
            },
          })}
        />
      ),
    },
    { label: "Capping Man Hrs", name: "cappingManhrs" },
    { label: "Capping Spares", name: "cappingSpares" },
  ];

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Sort remarks from oldest to newest (ensures scrolling from bottom)
  const sortedRemarks = [...selectedEstRemarksData]?.sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  useEffect(() => {
    if (remarksOpened && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight; // Scroll to the bottom
    }
  }, [remarksOpened, sortedRemarks.length]); // Update on new messages

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    // Convert to IST by adding 5 hours 30 minutes
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);

    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // Ensures AM/PM format
      timeZone: "Asia/Kolkata", // Ensures IST format
    });
  };

  // Format date

  const scrollAreaRefRemark = useRef<HTMLDivElement | null>(null);
  const scrollViewportRefRemark = useRef<HTMLDivElement | null>(null);
  const contentRefRemark = useRef<HTMLDivElement | null>(null);

  // Add this effect to scroll to bottom when remarks change
  useEffect(() => {
    if (scrollViewportRefRemark.current) {
      // Scroll to bottom of the chat
      scrollViewportRefRemark.current.scrollTo({
        top: scrollViewportRefRemark.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [selectedEstRemarksData]); // Dependency on remarks data
  const [newRemark, setNewRemark] = useState("");
  const handleRemark = async () => {
    if (!newRemark.trim()) {
      showNotification({
        title: "Error",
        message: "Remark cannot be empty",
        color: "red",
      });
      return;
    }

    const data = { remark: newRemark };
    const result = await updateRemarkByEstID(selectedEstimateRemarks, data);
    // console.log("result", result);
    if (result) {
      // Create a new remark object similar to what your API would return
      const user = currentUser; // Replace with actual current user name or ID

      const currentDate = new Date();
      // Adjust for the 5:30 that formatDate will add later
      currentDate.setHours(currentDate.getHours() - 5);
      currentDate.setMinutes(currentDate.getMinutes() - 30);

      const newRemarkObj = {
        remark: newRemark,
        updatedBy: user,
        createdAt: currentDate.toISOString(), // Current timestamp
      };
      setSelectedEstRemarksData((prevRemarks) => [
        ...prevRemarks,
        newRemarkObj,
      ]);
      setNewRemark("");
      fetchEstimatesStatus();
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

  const downloadExcelReport = () => {
    if (!estimateReportData || typeof estimateReportData !== "object") {
      console.warn("No valid data available for Excel export");
      return;
    }

    // Define headers
    const mainHeader = "WORK SCOPE REVIEW"; // Merged main header
    const columnHeaders = [
      "S.NO",
      "AIRCRAFT REGISTRATION",
      "AGE",
      "AIRCRAFT MODEL",
      "CHECK TYPE",
      "MPD TASKS",
      "MPD TASKS MH (WITHOUT FACTOR)",
      "ADDITIONAL TASKS",
      "ADDITIONAL TASKS MH",
      "AD/SB TASKS",
      "AD/SB TASKS MH (WITHOUT FACTOR)",
      "MISC MH",
      "PRELOAD",
      "TAT (DAYS)",
      "UNBILLABLE MH",
      "UNBILLABLE MATERIAL COST",
      "REMARKS",
    ];

    // Function to process data fields
    const processField = (field: any) =>
      field === null || field === undefined ? "-" : field;

    // Ensure valid data format
    const reportEntries = Array.isArray(estimateReportData.records)
      ? estimateReportData.records
      : [estimateReportData];

    // Prepare data rows
    const excelData = reportEntries.map((est: any, index: number) => [
      index + 1,
      processField(est.aircraftRegNo),
      processField(est.aircraftAge),
      processField(est.aircraftModel),
      // processField(est.typeOfCheck),
      Array.isArray(est.typeOfCheck)
        ? est.typeOfCheck.join(", ")
        : processField(est.typeOfCheck),
      processField(est.tasks?.length),
      processField(Math.round(est.aggregatedTasks?.totalMhs)),
      "N/A",
      "N/A",
      processField(est.findings?.length),
      processField(Math.round(est.aggregatedFindings?.totalMhs)),
      "N/A",
      "N/A",
      "-",
      processField(est.capping?.unbillable_mhs),
      processField(est.capping?.unbillable_cost),
      "N/A",
    ]);

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("SUMMARY");

    // Add main header (Merged)
    worksheet.mergeCells("A1:Q1"); // Merge across columns A to Q
    const titleCell = worksheet.getCell("A1");
    titleCell.value = mainHeader;
    titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1F497D" },
    }; // Dark Blue background

    // Add column headers (Row 2)
    const headerRow = worksheet.addRow(columnHeaders);
    headerRow.height = 26; // Increased row height for better readability

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      }; // Enable text wrapping

      // Apply background color only to text cells, not the entire row
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4B0082" }, // Indigo background
      };

      // Apply borders to headers
      cell.border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
      };
    });

    // Append data rows
    excelData.forEach((row: any) => {
      const dataRow = worksheet.addRow(row);
      dataRow.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
        };
      });
    });

    // Adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 20; // Set uniform column width
    });

    // Generate and save the file
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "Estimate_Report.xlsx");
    });
  };

  const downloadCSVReport = () => {
    if (!estimateReportData || typeof estimateReportData !== "object") {
      console.warn("No valid data available for CSV export");
      return;
    }

    // Define headers
    const columnHeaders = [
      "S.NO",
      "AIRCRAFT REGISTRATION",
      "AGE",
      "AIRCRAFT MODEL",
      "CHECK TYPE",
      "MPD TASKS",
      "MPD TASKS MH (WITHOUT FACTOR)",
      "ADDITIONAL TASKS",
      "ADDITIONAL TASKS MH",
      "AD/SB TASKS",
      "AD/SB TASKS MH (WITHOUT FACTOR)",
      "MISC MH",
      "PRELOAD",
      "TAT (DAYS)",
      "UNBILLABLE MH",
      "UNBILLABLE MATERIAL COST",
      "REMARKS",
    ];

    // Function to process data fields
    const processField = (field: any) =>
      field === null || field === undefined ? "-" : field;

    // Ensure valid data format
    const reportEntries = Array.isArray(estimateReportData.records)
      ? estimateReportData.records
      : [estimateReportData];

    // Prepare data rows
    const csvData = reportEntries.map((est: any, index: any) => [
      index + 1,
      processField(est.aircraftRegNo),
      processField(est.aircraftAge),
      processField(est.aircraftModel),
      processField(est.typeOfCheck),
      processField(est.tasks?.length),
      processField(Math.round(est.aggregatedTasks?.totalMhs)),
      "N/A",
      "N/A",
      processField(est.findings?.length),
      processField(Math.round(est.aggregatedFindings?.totalMhs)),
      "N/A",
      "N/A",
      "-",
      processField(est.capping?.unbillable_mhs),
      processField(est.capping?.unbillable_cost),
      "N/A",
    ]);

    // Combine headers and data
    const csvContent = [columnHeaders, ...csvData]
      .map((row) => row.map((field: any) => `"${field}"`).join(","))
      .join("\n");

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Estimate_Report.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  const [rangeType, setRangeType] = useState("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [estimatesSummary, setEstimatesSummary] = useState<any[]>([]);
  const [loadingEstimatesSummary, setLoadingEstimatesSummary] = useState(false);
  const [statusText, setStatusText] = useState("");

  // console.log("Selected Date range :",rangeType + dateRange);

  
  const fetchAllEstimatesSummary = async () => {
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (rangeType === "Today") {
      startDate = dayjs().startOf("day").toISOString();
      endDate = dayjs().endOf("day").toISOString();
    } else if (rangeType === "Last Week") {
      startDate = dayjs().subtract(1, "week").startOf("day").toISOString();
      endDate = dayjs().endOf("day").toISOString();
    } else if (rangeType === "Custom Range") {
      if (dateRange[0] && dateRange[1]) {
        startDate = dayjs(dateRange[0]).startOf("day").toISOString();
        endDate = dayjs(dateRange[1]).endOf("day").toISOString();
      } else {
        return;
      }
    }

    if (startDate && endDate) {
      setLoadingEstimatesSummary(true);
      setStatusText("Loading...");
      try {
        const response = await getAllEstimatesSummary(startDate, endDate);
        setEstimatesSummary(response || []);

        if (response && response.length > 0) {
          setStatusText("Ready to download");
        } else {
          setStatusText("No data found");
        }
      } catch (err) {
        setStatusText("Error fetching data");
        setEstimatesSummary([]);
      } finally {
        setLoadingEstimatesSummary(false);
      }
    }
  };

  useEffect(() => {
    fetchAllEstimatesSummary();
  }, [rangeType, dateRange]);

  useEffect(() => {
    if (rangeType === "Today") {
      setDateRange([
        dayjs().startOf("day").toDate(),
        dayjs().endOf("day").toDate(),
      ]);
    } else if (rangeType === "Last Week") {
      setDateRange([
        dayjs().subtract(6, "day").startOf("day").toDate(),
        dayjs().endOf("day").toDate(),
      ]);
    } else if (rangeType === "Custom Range") {
      setDateRange([null, null]);
    }
  }, [rangeType]);

  // Custom Excel column headers mapping
  const getExcelFormattedData = (data: any[]) => {
  return data.map((item, index) => ({
    "S. NO": index + 1,
    "CREATED AT": dayjs(item.createdAt).format("YYYY-MM-DD HH:mm:ss"),
    "ESTIMATE ID": item.estID,
    "NO OF PACKAGES": item.noOfPackages,
    "A/c REG NO": item.aircraftRegNo,
    "OPERATOR": item.operator,
    "AIRCRAFT MODEL": item.aircraftModel,
    "AIRCRAFT AGE": item.aircraftAge,
    "CHECK TYPE": Array.isArray(item.typeOfCheck) ? item.typeOfCheck.join(", ") : item.typeOfCheck,
    // "PROBABILITY": item.probability,

    // Additional Flags
    "CONSIDER DELTA UNAV TASKS": item.considerDeltaUnAvTasks,
    "OPERATOR FOR MODEL": item.operatorForModel,
    "AIRCRAFTAGE THRESHOLD": item.aircraftageThreshold,

    // Tasks Before Filter
    "AVAILABLE TASKS BEFORE FILTER": item.available_tasks_before_filter,
    "NOT AVAILABLE TASKS BEFORE FILTER": item.unavailable_tasks_before_filter,

    // Tasks After Filter
    "AVAILABLE TASKS AFTER FILTER": item.available_tasks_after_filter,
    "UNAVAILABLE TASKS AFTER FILTER": item.unavailable_tasks_after_filter,

    // Matching Percentages
    "MATCHING % BEFORE FILTER": item.task_matching_percentage_before_filter,
    "MATCHING % AFTER FILTER": item.task_matching_percentage_after_filter,

    // Task Count and Others
    "TOTAL TASKS COUNT": item.total_tasks_count,
    "AVAILABLE TASKS IN OTHER CHECK CATEGORY": item.available_tasks_in_other_check_category,

    // Manhours & Costs
    "MH": item.totalManhrs,
    "PRELOAD COST": item.preloadcost,
    "TOTAL FINDING MH": item.findingsManhrs,
    "TOTAL FINDING SPARES COST": item.findingsSpareCost,

    // Capping and Unbillable Details
    "CAPPING TYPE MANHRS": item.cappingTypeManhrs,
    "UNBILLABLE MH CAP": item.cappingManhrs,
    "UNBILLABLE MH": item.unbillableManhrs,
    "CAPPING TYPE SPARE COST": item.cappingTypeSpareCost,
    "UNBILLABLE MATERIAL CAP": item.cappingSpareCost,
    "UNBILLABLE MATERIAL COSTING": item.unbillableSpareCost,

    // Final TAT
    "TAT": Math.floor (item.TAT ?? 0) || 0,
    "EXTENDED TAT": Math.floor(item.extendedTAT ?? 0) || 0,
    "TOTAL TAT": Math.floor(item.TAT ?? 0) + Math.floor(item.extendedTAT ?? 0) || 0,
    "TAT MESSAGE": item.TATMessage,
  }));
};

  const handleDownloadEstimateSummary = () => {
  if (!estimatesSummary.length) return;

  const formatted = getExcelFormattedData(estimatesSummary);
  const worksheet = XLSX.utils.json_to_sheet(formatted);

  // ✅ Define column widths (in characters)
  worksheet["!cols"] = [
    { wch: 6 },   // S. NO
    { wch: 20 },  // CREATED AT
    { wch: 35 },  // ESTIMATE ID
    {wch: 15 },  // NO OF PACKAGES
    { wch: 15 },  // A/c REG NO
    { wch: 30 },  // OPERATOR
    { wch: 15 },  // AIRCRAFT MODEL
    { wch: 15 },  // AIRCRAFT AGE
    { wch: 25 },  // CHECK TYPE
    // { wch: 12 },  // PROBABILITY
    { wch: 25 },  // CONSIDER DELTA UNAV TASKS
    { wch: 20 },  // OPERATOR FOR MODEL
    { wch: 22 },  // AIRCRAFTAGE THRESHOLD
    { wch: 30 },  // AVAILABLE TASKS BEFORE FILTER
    { wch: 32 },  // NOT AVAILABLE TASKS BEFORE FILTER
    { wch: 28 },  // AVAILABLE TASKS AFTER FILTER
    { wch: 30 },  // UNAVAILABLE TASKS AFTER FILTER
    { wch: 28 },  // MATCHING % BEFORE FILTER
    { wch: 26 },  // MATCHING % AFTER FILTER
    { wch: 20 },  // TOTAL TASKS COUNT
    { wch: 35 },  // AVAILABLE TASKS IN OTHER CHECK CATEGORY
    { wch: 10 },  // MH
    { wch: 18 },  // PRELOAD COST
    { wch: 20 },  // TOTAL FINDING MH
    { wch: 26 },  // TOTAL FINDING SPARES COST
    { wch: 22 },  // CAPPING TYPE MANHRS
    { wch: 20 },  // UNBILLABLE MH CAP
    { wch: 18 },  // UNBILLABLE MH
    { wch: 26 },  // CAPPING TYPE SPARE COST
    { wch: 24 },  // UNBILLABLE MATERIAL CAP
    { wch: 28 },  // UNBILLABLE MATERIAL COSTING
    { wch: 10 },  // TAT
    { wch: 10 },  // EXTENDED TAT
    { wch: 10 },  // TOTAL TAT
    { wch: 20 },  // TAT MESSAGE
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Estimates Summary");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const filename = `EstimatesSummary.xlsx`;
  saveAs(blob, filename);
};


  return (
    <>
      {/* Estimate success Modal */}
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
              <Text size="sm" fw={600}></Text>
            </Group>
            <Space h="sm" />

            <Group justify="center">
              <Text size="sm" fw={500} ta="center" className="text-gray-700">
                {rfqSubmissionResponse?.msg}
              </Text>
            </Group>
            <Space h="sm" />

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
            <Space h="lg" />
            <Group justify="center">
              <Button
                onClick={handleCloseModal}
                size="sm"
                variant="filled"
                color="indigo"
              >
                Close
              </Button>
            </Group>
          </div>
        )}
      </Modal>
      {/* Tasks for Estimate Id */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          //   form.reset();
        }}
        size={1200}
        title={
          <>
            <Group justify="space-between">
              <Group>
                <Text c="gray" fw={600}>
                  Tasks for :
                </Text>
                <Text fw={600}>{selectedEstimateId}</Text>
              </Group>
            </Group>
            <Space h="sm" />
          </>
        }
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {loadingValidatedByID ? (
          <LoadingOverlay
            visible={loadingValidatedByID}
            zIndex={1000}
            overlayProps={{ radius: "sm", blur: 2 }}
            loaderProps={{ color: "indigo", type: "bars" }}
          />
        ) : (
          <SimpleGrid cols={2} spacing="md">
            {/* Left side Before filtered */}
            <Box
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '480px',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '12px'
              }}
            >
              {/* Fixed Header */}
              <Group mb="md" style={{ flexShrink: 0 }}>
                <Badge variant="filled" color="orange" radius="sm" size="lg">
                  {validatedTasksByID?.length}
                </Badge>
                {/* <Text fw={600} size="md">Before Filtered</Text> */}
                <Group>
                  <Tooltip label="Download Available Tasks">
                    <Button
                      size="xs"
                      color="green"
                      variant="light"
                      rightSection={<IconDownload size="18" />}
                      onClick={() => downloadExcelValidateByID(true)}
                    >
                      {
                        validatedTasksByID?.filter((ele) => ele?.status === true)
                          ?.length
                      }
                    </Button>
                  </Tooltip>
                  <Tooltip label="Download Not Available Tasks">
                    <Button
                      size="xs"
                      color="blue"
                      variant="light"
                      rightSection={<IconDownload size="18" />}
                      onClick={() => downloadExcelValidateByID(false)}
                    >
                      {
                        validatedTasksByID?.filter((ele) => ele?.status === false)
                          ?.length
                      }
                    </Button>
                  </Tooltip>
                </Group>
              </Group>

              {/* Scrollable Content */}
              <ScrollArea
                style={{
                  flex: 1,
                  width: '100%'
                }}
                scrollbars="y"
                offsetScrollbars={false}
              >
                <Box style={{ width: '100%', paddingRight: '8px' }}>
                  <SimpleGrid
                    cols={4}
                    spacing="xs"
                    style={{
                      width: '100%',
                      minWidth: 0 // Allows grid to shrink below content size
                    }}
                  >
                    {validatedTasksByID
                      ?.slice() // to avoid mutating the original array
                      .sort((a, b) => (a?.taskid || '').localeCompare(b?.taskid || ''))
                      ?.map((task, index) => {
                        const badgeColor = task?.status ? "green" : "blue";
                        return task?.taskid?.length > 12 ? (
                          <Tooltip
                            key={index}
                            label={task?.taskid}
                            withArrow
                            position="top"
                          >
                            <Badge
                              fullWidth
                              color={badgeColor}
                              variant="light"
                              radius="sm"
                              size="md"
                              style={{
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
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
                            radius="sm"
                            size="sm"
                            style={{
                              minWidth: 0,
                              overflow: 'hidden'
                            }}
                          >
                            {task?.taskid}
                          </Badge>
                        );
                      })}
                  </SimpleGrid>
                </Box>
              </ScrollArea>
            </Box>

            {/* Right side After filtered */}
            <Box
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '480px',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '12px'
              }}
            >
              {/* Fixed Header */}
              <Group mb="md" style={{ flexShrink: 0 }}>
                <Badge variant="filled" color="teal" radius="sm" size="lg">
                  {/* {combinedFilteredTasksList?.length} */}
                  {filteredTasksList?.filtered_tasks_count?.total_count || 0}
                </Badge>
                <Text fw={600} size="md">After Filter</Text>
                <Group>
                  <Tooltip label="Download Available Tasks">
                    <Button
                      size="xs"
                      color="cyan"
                      variant="light"
                      rightSection={<IconDownload size="18" />}
                      onClick={() => downloadExcelFilteredTasks(true)}
                    // disabled={filteredTasksList?.filtered_tasks_count?.available_tasks_count > 0 ? false : true}
                    >
                      {/* {
                        combinedFilteredTasksList?.filter((ele) => ele?.status === true)
                          ?.length
                      } */}
                      {filteredTasksList?.filtered_tasks_count?.available_tasks_count || 0}
                    </Button>
                  </Tooltip>
                  <Tooltip label="Download Not Available Tasks">
                    <Button
                      size="xs"
                      color="violet"
                      variant="light"
                      rightSection={<IconDownload size="18" />}
                      onClick={() => downloadExcelFilteredTasks(false)}
                    // disabled={filteredTasksList?.filtered_tasks_count?.not_available_tasks_count > 0 ? false : true}
                    >
                      {/* {
                        combinedFilteredTasksList?.filter((ele) => ele?.status === false)
                          ?.length
                      } */}
                      {filteredTasksList?.filtered_tasks_count?.not_available_tasks_count || 0}
                    </Button>
                  </Tooltip>
                </Group>
              </Group>

              {/* Scrollable Content */}
              <ScrollArea
                style={{
                  flex: 1,
                  width: '100%'
                }}
                scrollbars="y"
                offsetScrollbars={false}
              >
                <Box style={{ width: '100%', paddingRight: '8px' }}>
                  <SimpleGrid
                    cols={4}
                    spacing="xs"
                    style={{
                      width: '100%',
                      minWidth: 0 // Allows grid to shrink below content size
                    }}
                  >
                    {
                      combinedFilteredTasksList
                        ?.slice() // to avoid mutating the original array
                        ?.sort((a, b) => (a?.task_number || '').localeCompare(b?.task_number || ''))
                        ?.map((task, index) => {
                          const badgeColor = task?.status ? "cyan" : "violet";
                          return task?.task_number?.length > 12 ? (
                            <Tooltip
                              key={index}
                              label={task?.task_number}
                              withArrow
                              position="top"
                            >
                              <Badge
                                fullWidth
                                color={badgeColor}
                                variant="light"
                                radius="sm"
                                size="md"
                                style={{
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {task?.task_number}
                              </Badge>
                            </Tooltip>
                          ) : (
                            <Badge
                              fullWidth
                              key={index}
                              color={badgeColor}
                              variant="light"
                              radius="sm"
                              size="sm"
                              style={{
                                minWidth: 0,
                                overflow: 'hidden'
                              }}
                            >
                              {task?.task_number}
                            </Badge>
                          );
                        })
                    }
                  </SimpleGrid>
                </Box>
              </ScrollArea>
            </Box>
          </SimpleGrid>
        )}
      </Modal>
      {/* Probabiity wise data for estimate id */}
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
              <Title order={4} c="dimmed">
                Probability wise Details
              </Title>
              <Title order={4}>{selectedEstimateIdProbability}</Title>
            </Group>
          </>
        }
      >
        {isProbWiseLoading && (
          <LoadingOverlay
            visible={isProbWiseLoading}
            zIndex={1000}
            overlayProps={{ radius: "sm", blur: 2 }}
            loaderProps={{ color: "indigo", type: "bars" }}
          />
        )}

        <Group p={10}>
          <AreaChart
            h={350}
            data={transformedData || []}
            dataKey="prob"
            withLegend
            withTooltip
            xAxisLabel="Probability (%)"
            yAxisLabel="Value"
            // tooltipProps={{
            //   content: ({ label, payload }) => (
            //     <ChartTooltip
            //       label={"Probability : " + label}
            //       payload={payload.map(item => ({
            //         ...item,
            //         name: customSeriesNames[item.name] || item.name
            //       }))}
            //     />
            //   ),
            // }}
            series={[
              {
                name: "totalManhrs",
                color: "green.6",
                label: customSeriesNames.totalManhrs  // Custom display name
              },
              {
                name: "totalSpareCost",
                color: "blue.6",
                label: customSeriesNames.totalSpareCost  // Custom display name
              },
            ]}
            curveType="linear"
          // legendProps={{
          //   verticalAlign: 'bottom',
          //   formatter: (name) => customSeriesNames[name] || name
          // }}
          />
        </Group>
      </Modal>

      {/* <Modal
        opened={selectedFileTasksOpened}
        onClose={() => {
          setSelectedFileTasksOpened(false);
          //   form.reset();
        }}
        size={800}
        title={
          <>
            <Group justify="space-between">
              <Group>
                <Badge variant="filled" color="teal" radius="sm" size="lg">
                  {validatedTasks?.length}
                </Badge>
                <Text c="gray" fw={600}>
                  Tasks for :
                </Text>
                <Text fw={600}>{selectedEstimateId}</Text>
              </Group>

              <Group>
                <Tooltip label="Download Available Tasks">
                  <Button
                    size="xs"
                    color="green"
                    variant="light"
                    rightSection={<IconDownload size="18" />}
                    onClick={() => downloadExcel(true)}
                  >
                    {
                      validatedTasks?.filter((ele) => ele?.status === true)
                        ?.length
                    }
                  </Button>

                </Tooltip>

                <Tooltip label="Download Not Available Tasks">
                  <Button
                    size="xs"
                    color="blue"
                    variant="light"
                    rightSection={<IconDownload size="18" />}
                    onClick={() => downloadExcel(false)}
                  >
                    {
                      validatedTasks?.filter((ele) => ele?.status === false)
                        ?.length
                    }
                  </Button>

                </Tooltip>
              </Group>
            </Group>
            <Space h="sm" />
            {sheetInfo && (
              <Group gap="xs" mb="xs">
                <Text size="sm" c="dimmed">
                  Sheet:
                </Text>
                <Badge size="sm" color="black" variant="light">
                  {sheetInfo.sheetName}
                </Badge>
                <Text size="sm" c="dimmed">
                  Column:
                </Text>
                <Badge size="sm" color="black" variant="light">
                  {sheetInfo.columnName}
                </Badge>
              </Group>
            )}
            <Group justify="space-between">
              <Group mb="xs" align="center">
                <Text size="md" fw={500}>
                  Tasks Available
                </Text>
                {validatedTasks?.length > 0 ? (
                  <Badge ta="center" color="green" size="md" radius="lg">
                    {Math.round(
                      (validatedTasks?.filter((ele) => ele.status === true)
                        ?.length /
                        validatedTasks?.length) *
                      100 || 0
                    )}{" "}
                    %
                  </Badge>
                ) : (
                  <Badge
                    variant="light"
                    ta="center"
                    color="green"
                    size="md"
                    radius="lg"
                  >
                    0
                  </Badge>
                )}
              </Group>
              <Group mb="xs" align="center">
                <Text size="md" fw={500}>
                  Tasks Not-Available
                </Text>
                {validatedTasks?.length > 0 ? (
                  <Badge ta="center" color="blue" size="md" radius="lg">
                    {Math.round(
                      (validatedTasks?.filter((ele) => ele.status === false)
                        ?.length /
                        validatedTasks?.length) *
                      100 || 0
                    )}{" "}
                    %
                  </Badge>
                ) : (
                  <Badge
                    variant="light"
                    ta="center"
                    color="blue"
                    size="md"
                    radius="lg"
                  >
                    0
                  </Badge>
                )}
              </Group>
            </Group>
          </>
        }
        scrollAreaComponent={ScrollArea.Autosize}
      >
        <LoadingOverlay
          visible={isValidating}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ color: "indigo", type: "bars" }}
        />
        {validatedTasks?.length > 0 ? (
          <SimpleGrid cols={5}>
            {validatedTasks?.map((task, index) => (
              <Badge
                fullWidth
                key={index}
                color={task?.status === false ? "blue" : "green"}
                variant="light"
                radius="sm"
                style={{ margin: "0.25em" }}
              >
                {task?.taskid}
              </Badge>
            ))}
          </SimpleGrid>
        ) : (
          <Text ta="center" size="sm" c="dimmed">
            No tasks found. Please Select a file.
          </Text>
        )}

      </Modal>  */}
      {/* Updated Modal component to display both original and additional validated tasks */}
      <Modal
        opened={selectedFileTasksOpened}
        onClose={() => {
          setSelectedFileTasksOpened(false);
          setValidatedAdditionalTasks([]);
        }}
        size={1200}
        title={
          <>
            <Group justify="space-between">
              <Group>
                <Text c="gray" fw={600}>
                  Tasks for:
                </Text>
                <Text fw={600}>{selectedEstimateId}</Text>
              </Group>


            </Group>
            <Space h="sm" />
            {sheetInfo && (
              <Group gap="xs" mb="xs">
                <Text size="sm" c="dimmed">
                  Sheet:
                </Text>
                <Badge size="sm" color="black" variant="light">
                  {sheetInfo.sheetName}
                </Badge>
                <Text size="sm" c="dimmed">
                  Column:
                </Text>
                <Badge size="sm" color="black" variant="light">
                  {sheetInfo.columnName}
                </Badge>
              </Group>
            )}
          </>
        }
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {
          isValidating ? (
            <LoadingOverlay
              visible={isValidating}
              zIndex={1000}
              overlayProps={{ radius: "sm", blur: 2 }}
              loaderProps={{ color: "indigo", type: "bars" }}
            />
          ) : (
            <>
              <SimpleGrid cols={2} spacing="md">
                {/* Left side Before filtered */}
                <Box
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '480px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                >
                  {/* Fixed Header */}
                  <Group mb="md" style={{ flexShrink: 0 }}>
                    <Badge variant="filled" color="orange" radius="sm" size="lg">
                      {validatedTasks.length + validatedAdditionalTasks.length}
                    </Badge>
                    <Group>
                      <Tooltip label="Download Available Tasks">
                        <Button
                          size="xs"
                          color="green"
                          variant="light"
                          rightSection={<IconDownload size="18" />}
                          onClick={() => downloadExcel(true)}
                        >
                          {
                            [...validatedTasks, ...validatedAdditionalTasks].filter(
                              (ele) => ele?.status === true
                            ).length
                          }
                        </Button>
                      </Tooltip>

                      <Tooltip label="Download Not Available Tasks">
                        <Button
                          size="xs"
                          color="blue"
                          variant="light"
                          rightSection={<IconDownload size="18" />}
                          onClick={() => downloadExcel(false)}
                        >
                          {
                            [...validatedTasks, ...validatedAdditionalTasks].filter(
                              (ele) => ele?.status === false
                            ).length
                          }
                        </Button>
                      </Tooltip>
                    </Group>

                    <Group justify="space-between">
                      <Group mb="xs" align="center">
                        <Text size="md" fw={500}>
                          Tasks Available
                        </Text>
                        {(validatedTasks.length > 0 || validatedAdditionalTasks.length > 0) ? (
                          <Badge ta="center" color="green" size="md" radius="lg">
                            {
                              (([...validatedTasks, ...validatedAdditionalTasks].filter(
                                (ele) => ele?.status === true
                              ).length /
                                [...validatedTasks, ...validatedAdditionalTasks].length) *
                                100)?.toFixed(2) || 0
                            }{" "}
                            %
                          </Badge>
                        ) : (
                          <Badge
                            variant="light"
                            ta="center"
                            color="green"
                            size="md"
                            radius="lg"
                          >
                            0
                          </Badge>
                        )}
                      </Group>
                      <Group mb="xs" align="center">
                        <Text size="md" fw={500}>
                          Tasks Not-Available
                        </Text>
                        {(validatedTasks.length > 0 || validatedAdditionalTasks.length > 0) ? (
                          <Badge ta="center" color="blue" size="md" radius="lg">
                            {
                              (([...validatedTasks, ...validatedAdditionalTasks].filter(
                                (ele) => ele?.status === false
                              ).length /
                                [...validatedTasks, ...validatedAdditionalTasks].length) *
                                100)?.toFixed(2) || 0
                            }{" "}
                            %
                          </Badge>
                        ) : (
                          <Badge
                            variant="light"
                            ta="center"
                            color="blue"
                            size="md"
                            radius="lg"
                          >
                            0
                          </Badge>
                        )}
                      </Group>
                    </Group>
                  </Group>

                  {/* Scrollable Content */}
                  <ScrollArea
                    style={{
                      flex: 1,
                      width: '100%'
                    }}
                    scrollbars="y"
                    scrollbarSize={3}
                    scrollHideDelay={0}
                    offsetScrollbars={false}
                  >
                    <Box style={{ width: '100%', paddingRight: '8px' }}>

                      {/* Display all validated tasks */}
                      {(validatedTasks.length > 0 || validatedAdditionalTasks.length > 0) ? (
                        <>
                          {validatedTasks.length > 0 && (
                            <Box mb="md">
                              {/* <Text size="sm" fw={600} mb="xs"> Tasks :</Text> */}
                              <SimpleGrid 
                              cols={4}
                              spacing="md"
                              style={{
                                width: '100%',
                                minWidth: 0 // Allows grid to shrink below content size
                              }}
                              >
                                {validatedTasks
                                  ?.slice() // to avoid mutating the original array
                                  .sort((a, b) => (a?.taskid || '').localeCompare(b?.taskid || ''))
                                  ?.map((task, index) => (
                                    <Badge
                                      fullWidth
                                      key={`original-${index}`}
                                      color={task?.status === false ? "blue" : "green"}
                                      variant="light"
                                      radius="sm"
                                      style={{ margin: "0.25em" }}
                                    >
                                      {task?.taskid}
                                    </Badge>
                                  ))}
                              </SimpleGrid>
                            </Box>
                          )}


                        </>
                      ) : (
                        <Text ta="center" size="sm" c="dimmed">
                          No tasks found. Please select a file or add additional tasks.
                        </Text>
                      )}

                    </Box>
                  </ScrollArea>
                </Box>

                {/* Right side After filtered */}
                <Box
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '480px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                >
              {/* Fixed Header */}
              <Group mb="md" style={{ flexShrink: 0 }}>
                <Badge variant="filled" color="teal" radius="sm" size="lg">
                  {/* {combinedFilteredTasksList?.length} */}
                  {modalTaskValidateData?.filtered_tasks_count?.total_count || 0}
                </Badge>
                <Text fw={600} size="md">After Filter</Text>
                <Group>
                  <Tooltip label="Download Available Tasks">
                    <Button
                      size="xs"
                      color="cyan"
                      variant="light"
                      rightSection={<IconDownload size="18" />}
                      onClick={() => downloadExcelModalTaskValidate(true)}
                    // disabled={filteredTasksList?.filtered_tasks_count?.available_tasks_count > 0 ? false : true}
                    >
                      {/* {
                        combinedFilteredTasksList?.filter((ele) => ele?.status === true)
                          ?.length
                      } */}
                      {modalTaskValidateData?.filtered_tasks_count?.available_tasks_count || 0}
                    </Button>
                  </Tooltip>
                  <Tooltip label="Download Not Available Tasks">
                    <Button
                      size="xs"
                      color="violet"
                      variant="light"
                      rightSection={<IconDownload size={18} />}
                      onClick={() => {
                        downloadExcelModalTaskValidate(false, setDownloadedNotAvailableTasks); // download + store
                        setExcelModalOpened(true); // open modal
                      }}
                      disabled={
                        (modalTaskValidateData?.filtered_tasks_count?.not_available_tasks_count || 0) === 0
                      }
                    >
                      {modalTaskValidateData?.filtered_tasks_count?.not_available_tasks_count || 0}
                    </Button>
                  </Tooltip>

                </Group>
                <Group justify="space-between">
                      <Group mb="xs" align="center">
                        <Text size="md" fw={500}>
                          Tasks Available
                        </Text>
                        {(modalTaskValidateData?.filtered_tasks_count?.available_tasks_count > 0) ? (
                          <Badge ta="center" color="cyan" size="md" radius="lg">
                            {
                              ((modalTaskValidateData?.filtered_tasks_count?.available_tasks_count /
                                modalTaskValidateData?.filtered_tasks_count?.total_count) *
                                100)?.toFixed(2) || 0
                            }{" "}
                            %
                          </Badge>
                        ) : (
                          <Badge
                            variant="light"
                            ta="center"
                            color="cyan"
                            size="md"
                            radius="lg"
                          >
                            0
                          </Badge>
                        )}
                      </Group>
                      <Group mb="xs" align="center">
                        <Text size="md" fw={500}>
                          Tasks Not-Available
                        </Text>
                        {(modalTaskValidateData?.filtered_tasks_count?.not_available_tasks_count > 0) ? (
                          <Badge ta="center" color="violet" size="md" radius="lg">
                            {
                              ((modalTaskValidateData?.filtered_tasks_count?.not_available_tasks_count /
                                modalTaskValidateData?.filtered_tasks_count?.total_count) *
                                100)?.toFixed(2) || 0
                            }{" "}
                            %
                          </Badge>
                        ) : (
                          <Badge
                            variant="light"
                            ta="center"
                            color="blue"
                            size="md"
                            radius="lg"
                          >
                            0
                          </Badge>
                        )}
                      </Group>
                    </Group>
              </Group>
              {/* Scrollable Content */}
              <ScrollArea
                style={{
                  flex: 1,
                  width: '100%'
                }}
                scrollbars="y"
                scrollbarSize={3}
                scrollHideDelay={0}
                offsetScrollbars={false}
              >
                <Box style={{ width: '100%', paddingRight: '8px' }}>
                  <SimpleGrid
                    cols={4}
                    spacing="md"
                    style={{
                      width: '100%',
                      minWidth: 0 // Allows grid to shrink below content size
                    }}
                  >
                    {
                      combinedModalTasksValidate
                        ?.slice() // to avoid mutating the original array
                        ?.sort((a, b) => (a?.task_number || '').localeCompare(b?.task_number || ''))
                        ?.map((task, index) => {
                          const badgeColor = task?.status ? "cyan" : "violet";
                          return task?.task_number?.length > 12 ? (
                            <Tooltip
                              key={index}
                              label={task?.task_number}
                              withArrow
                              position="top"
                            >
                              <Badge
                                fullWidth
                                color={badgeColor}
                                variant="light"
                                radius="sm"
                                size="md"
                                style={{
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {task?.task_number}
                              </Badge>
                            </Tooltip>
                          ) : (
                            <Badge
                              fullWidth
                              key={index}
                              color={badgeColor}
                              variant="light"
                              radius="sm"
                              size="sm"
                              style={{
                                minWidth: 0,
                                overflow: 'hidden'
                              }}
                            >
                              {task?.task_number}
                            </Badge>
                          );
                        })
                    }
                  </SimpleGrid>
                </Box>
              </ScrollArea>
                </Box>
              </SimpleGrid>
              <Space h="md" />
              <SimpleGrid cols={2} spacing="md">
                {/* Display additional validated tasks with a separator */}
                {validatedAdditionalTasks.length > 0 && (
                  <Box
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                  >
                    <Text size="sm" fw={600} mb="xs">Additional Tasks :</Text>
                    <SimpleGrid cols={4}>
                      {validatedAdditionalTasks
                        ?.slice() // to avoid mutating the original array
                        .sort((a, b) => (a?.taskid || '').localeCompare(b?.taskid || ''))
                        .map((task, index) => (
                          <Badge
                            fullWidth
                            key={`additional-${index}`}
                            color={task?.status === false ? "blue" : "green"}
                            variant="light"
                            radius="sm"
                            style={{ margin: "0.25em" }}
                          >
                            {task?.taskid}
                          </Badge>
                        ))}
                    </SimpleGrid>
                  </Box>
                )}

                {
                  combinedModalTasksValidateAdditional.length > 0 && (
                  <Box
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                  >
                    <Text size="sm" fw={600} mb="xs">Additional Tasks after Filter :</Text>
                    <SimpleGrid cols={4}>
                      {combinedModalTasksValidateAdditional
                        ?.slice() // to avoid mutating the original array
                        .sort((a, b) => (a?.task_number || '').localeCompare(b?.task_number || ''))
                        .map((task, index) => (
                          <Badge
                            fullWidth
                            key={`additional-${index}`}
                            color={task?.status === false ? "violet" : "cyan"}
                            variant="light"
                            radius="sm"
                            style={{ margin: "0.25em" }}
                          >
                            {task?.task_number}
                          </Badge>
                        ))}
                    </SimpleGrid>
                  </Box>
                  )
                }

              </SimpleGrid>
            </>
          )
        }
      </Modal>
      {/* Remarks for Estimate id */}
      <Modal
        opened={remarksOpened}
        onClose={() => {
          setRemarksOpened(false);
          //   form.reset();
        }}
        size={800}
        title={
          <>
            <Group>
              <Group>
                <ThemeIcon variant="white">
                  <IconMessage />
                </ThemeIcon>
                <Title order={4} c="dimmed">
                  Remarks
                </Title>
              </Group>

              <Title order={4}>{selectedEstimateRemarks}</Title>
            </Group>
          </>
        }
      >
        <Card h="50vh" withBorder bg="#f0eded" radius="lg">
          <ScrollArea
            h="100%"
            ref={scrollAreaRefRemark}
            viewportRef={scrollViewportRefRemark}
            scrollbarSize={0}
            scrollHideDelay={0}
          >
            <Stack justify="flex-start" h="100%" gap="md">
              {selectedEstRemarksData?.filter(
                (remark: any, index: number) =>
                  !(index === 0 && !remark.remark.trim())
              ).length === 0 ? ( // Remove first object if empty
                // If all remarks are removed, show "No Remarks Found"
                <Text size="sm" c="dimmed" ta="center">
                  No Remarks Found
                </Text>
              ) : (
                selectedEstRemarksData
                  ?.filter(
                    (remark: any, index: number) =>
                      !(index === 0 && !remark.remark.trim())
                  ) // Remove first object if empty
                  .map((remark: any) => {
                    const isCurrentUser = remark.updatedBy === currentUser; // Adjust as needed

                    return (
                      <Flex
                        key={remark.createdAt}
                        direction="column"
                        align={isCurrentUser ? "flex-end" : "flex-start"}
                      >
                        <Paper
                          p="xs"
                          radius="md"
                          withBorder
                          bg="white"
                          style={{
                            maxWidth: "80%",
                            minWidth: "50%",
                            alignSelf: isCurrentUser
                              ? "flex-end"
                              : "flex-start",
                          }}
                        >
                          <Group justify="space-between" gap="xs" mb={5}>
                            <Group gap="xs">
                              <Avatar
                                color={isCurrentUser ? "blue" : "cyan"}
                                radius="xl"
                                size="sm"
                              >
                                {remark.updatedBy.charAt(0)?.toUpperCase()}
                              </Avatar>
                              <Text size="sm" fw={500}>
                                {remark.updatedBy?.toUpperCase() || "N/A"}
                              </Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                              {formatDate(remark.createdAt)}
                            </Text>
                          </Group>
                          <Text size="sm" ml={30}>
                            {remark.remark}
                          </Text>
                        </Paper>
                      </Flex>
                    );
                  })
              )}
            </Stack>
          </ScrollArea>
        </Card>
        <Divider
          variant="dashed"
          labelPosition="center"
          color={"gray"}
          pb="sm"
          pt="sm"
          label={
            <>
              <Box ml={5}>Add Remarks</Box>
            </>
          }
        />

        <Textarea
          radius="md"
          // label="Add New Remark !"
          //   description="Input description"
          placeholder="Add your Remark here"
          autosize
          minRows={2}
          maxRows={3}
          value={newRemark}
          onChange={(e) => setNewRemark(e.target.value)}
        />
        <Space h="xs" />
        <Group justify="flex-end">
          <Button
            size="xs"
            variant="gradient"
            gradient={{ from: "blue", to: "green", deg: 90 }}
            onClick={handleRemark}
          >
            Submit
          </Button>
        </Group>
        <Group></Group>
      </Modal>
      {/* filtered not available tasks */}
      <Modal
        opened={excelModalOpened}
        onClose={() => setExcelModalOpened(false)}
        title="After Filter Not-Available Tasks"
        size={1000}
      >
        {/* AG Grid Wrapper */}
        <div
          className="ag-theme-alpine"
          style={{
            height: 500, // Total height of grid section
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Grid body scrolls independently */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <AgGridReact
              rowData={downloadedNotAvailableTasks}
              columnDefs={[
                {
                  field: "TASK NUMBER",
                  headerName: "Task Number",
                  flex: 0.5,
                  autoHeight: true,
                  cellStyle: {
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: '1.5rem',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  },
                },
                {
                  field: "DESCRIPTION",
                  headerName: "Description",
                  flex: 2,
                  autoHeight: true,
                  cellStyle: {
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: '1.5rem',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  },
                },
                {
                  field: "CHECK CATEGORY",
                  headerName: "Check Category",
                  flex: 1,
                  autoHeight: true,
                  cellStyle: {
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: '1.5rem',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  },
                },
              ]}
              defaultColDef={{
                resizable: true,
                wrapText: true,
                autoHeight: true,
              }}
              pagination={true}
              paginationPageSize={10}
              suppressPaginationPanel={false} // Keeps pagination visible
              domLayout="normal" // Required for scrollable rows
            />
          </div>
        </div>
      </Modal>

      <div style={{ padding: 60 }}>
        <Grid grow gutter="xs">
          <Grid.Col span={{ base: 12, md: 4, lg: 4 }}>
            {/* <Card withBorder
                            // className="glass-card"
                            h='20vh' radius='md'
                        // style={{
                        //     background: 'rgba(255, 255, 255, 0.1)',
                        //     backdropFilter : "blur(50px)",
                        //     boxShadow : "0 4px 30px rgba(0, 0, 0, 0.1)",
                        //     borderRadius: '8px',
                        //     padding: '16px',
                        //     display: 'flex',
                        //     flexDirection: "column",
                        // }}
                        > */}
            {/* <Group> */}
            {/* <Text size="md" fw={500}>
                                    Select Document
                                </Text> */}

            {/* </Group>
                        </Card> */}
            {/* <Space h='xs'/> */}
            <Card withBorder h="60vh" radius="md">
              <Group justify="space-between">
                <Text size="md" fw={500}>
                  Select Document
                </Text>

                <Group>
                  <Tooltip label="Download RFQ Template Example">
                    <ActionIcon
                      color="green"
                      variant="light"
                      onClick={downloadEmptyExcel}
                    >
                      <IconFileDownload />
                    </ActionIcon>
                  </Tooltip>
                  {/* {
                                    selectedFile && ( */}
                  <Tooltip
                    label={
                      selectedFile
                        ? "Show Tasks for Selected file"
                        : "Select file for Tasks"
                    }
                  >
                    <Button
                      size="xs"
                      color="#000480"
                      radius="md"
                      variant="light"
                      disabled={!selectedFile && additionalTasks?.length === 0}
                      onClick={handleShowTasks}
                      // onClick={() => {
                      //   setSelectedEstimateId(selectedFile?.name);
                      //   setSelectedFileTasksOpened(true);
                      // }}
                      rightSection={<IconListCheck size={20} />}
                    >
                      Show Tasks
                    </Button>
                  </Tooltip>
                  {/* )
                                } */}
                </Group>
              </Group>

              <Space h="xs" />
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
                <Space h="sm" />
                <Group justify="space-between" pb="sm">
                  <Text size="md" fw={500}>
                    Add Tasks
                  </Text>
                  <Button
                    size="xs"
                    onClick={handleAddAdditionalTask}
                    color="blue"
                    variant="light"
                    rightSection={<IconMessage2Plus size={18} />}
                  >
                    Add Task
                  </Button>
                </Group>

                <Table withRowBorders withTableBorder withColumnBorders>
                  <thead>
                    <tr>
                      <th style={{ width: "100px", height: "100%" }}>
                        Task ID
                      </th>{" "}
                      <th style={{ width: "300px" }}>Description</th>{" "}
                      <th style={{ width: "50px" }}>Actions</th>{" "}
                    </tr>
                  </thead>
                  <tbody>
                    {additionalTasks?.map((task: any, index: any) => (
                      <tr key={index}>
                        <td style={{ alignContent: "start" }}>
                          <TextInput
                            size="xs"
                            placeholder="Ex: 1234"
                            value={task.taskID}
                            onChange={(e) =>
                              handleTaskChange(index, "taskID", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <Textarea
                            size="xs"
                            // w='18vw'
                            placeholder="Task Description"
                            autosize
                            minRows={1}
                            value={task.description}
                            onChange={(e) =>
                              handleTaskChange(
                                index,
                                "taskDescription",
                                e.target.value.replace(/\n/g, " ")
                              )
                            }
                          />
                        </td>
                        <td>
                          <Center>
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => handleDeleteAdditionalTask(index)}
                            >
                              <IconTrash size="20" />
                            </ActionIcon>
                          </Center>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {/* <SimpleGrid cols={1} spacing='xs'>
                                    <TextInput
                                        size="xs"
                                        leftSection={<IconChecklist />}
                                        placeholder="1234..."
                                        label="Task ID"
                                        {...form.getInputProps("taskID")}
                                    />
                                    <Textarea
                                        size="xs"
                                        label="Description"
                                        placeholder="Task Description"
                                        autosize
                                        minRows={4}
                                        {...form.getInputProps("taskDescription")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<IconFileCheck size='20' />}
                                        placeholder="check"
                                        label="Check Type"
                                        {...form.getInputProps("typeOfCheck")}
                                    />
                                    
                                </SimpleGrid> */}
              </ScrollArea>
            </Card>
          </Grid.Col>

          {/* <Grid.Col span={5}>
                        <Card withBorder h='60vh' radius='md'>

                            <LoadingOverlay
                                visible={isValidating}
                                zIndex={1000}
                                overlayProps={{ radius: 'sm', blur: 2 }}
                                loaderProps={{ color: 'indigo', type: 'bars' }}
                            />

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
                                scrollbarSize={5}
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
                    </Grid.Col> */}
          <Grid.Col span={{ base: 12, md: 4, lg: 4 }}>
            <Card ref={cardRef} withBorder h="60vh" radius="md">

              <Group justify="flex-end">
                <Menu
                  shadow="md"
                  width={250}
                  opened={menuOpened}
                  onOpen={open}
                  onClose={close}
                  withinPortal
                >
                  <Menu.Target>

                    <Button
                      size="xs"
                      color="#000480"
                      radius="md"
                      variant="light"
                      rightSection={<IconChevronDown size={16} />}
                      style={{ width: 180 }}
                    >
                      Input Parameters
                    </Button>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>Input Parameters</Menu.Label>
                    <ScrollArea type="auto" style={{ maxHeight: 300 }} offsetScrollbars>
                      <Stack gap="xs" p="xs">
                        {fields.map((field) => (
                          <Checkbox
                            key={field.name}
                            label={field.label}
                            checked={selectedFields.includes(field.name)}
                            onChange={() => toggleFieldSelection(field.name)}
                          />
                        ))}
                      </Stack>
                    </ScrollArea>

                    <Divider my="xs" />

                    <Button
                      fullWidth
                      variant="light"
                      onClick={() => {
                        setShowFields([...selectedFields]);
                        close(); // Close the menu
                      }}
                    >
                      Show Inputs
                    </Button>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              <ScrollArea
                ref={scrollAreaRefFields}
                // style={{ flex: 1, overflow: "auto" }}
                offsetScrollbars
                scrollHideDelay={1}
                scrollbarSize={0}
              >
                {/* <Text size="md" m="sm" fw={500}>
                  Required Parameters
                </Text> */}
                <Divider my="xs" label="Required Parameters" labelPosition="center" />
                <SimpleGrid cols={2}>
                  <MultiSelect
                    size="xs"
                    searchable
                    label="Check Type"
                    placeholder="Check Type"
                    data={[
                      "EOL",
                      "C CHECK",
                      "NON C CHECK",
                      "18Y CHECK",
                      "12Y CHECK",
                      "6Y CHECK",
                    ]}
                    value={form.values.typeOfCheck}
                    onChange={(value) => {
                      form.setFieldValue("typeOfCheck", value);
                      form.validateField("typeOfCheck");
                    }}
                    error={form.errors.typeOfCheck}
                    withAsterisk
                    styles={{
                      input: {
                        backgroundColor: '#edf4ff',
                      },
                      pill: {
                        backgroundColor: '#ffffff',
                      },
                      // dropdown: {
                      //   backgroundColor: '#edf4ff',
                      // },
                    }}
                  />

                  <TextInput
                    size="xs"
                    leftSection={<MdPin />}
                    placeholder="Ex: 5.5"
                    label="Aircraft Age"
                    value={form.values.aircraftAge === 0 || form.values.aircraftAge === "0" ? "" : form.values.aircraftAge}
                    onChange={e => {
                      const val = e.target.value;
                      // Accept only numbers or empty
                      if (/^\d*\.?\d*$/.test(val)) {
                        form.setFieldValue("aircraftAge", val);
                      }
                    }}
                    onBlur={e => {
                      // If left empty, set to 0 for submission
                      if (e.target.value === "") form.setFieldValue("aircraftAge", 0);
                    }}
                    error={form.errors.aircraftAge}
                    styles={{
                      input: {
                        backgroundColor: '#edf4ff',
                      },
                    }}
                  />

                  {/* Show Aircraft Age Threshold in required section if selected */}
                  {showFields.includes("aircraftAgeThreshold") && (

                    <TextInput
                      size="xs"
                      placeholder="Ex:3"
                      label="Aircraft Age Threshold"
                      {...form.getInputProps("aircraftAgeThreshold")}
                      styles={{
                        input: {
                          backgroundColor: '#edf4ff',
                        },
                      }}
                    />

                  )}
                  <Select
                    key={`aircraftModel-select-${formKey}`}
                    size="xs"
                    searchable
                    clearable
                    leftSection={<IconPlaneTilt size={20} />}
                    placeholder="Select Aircraft Model"
                    label="Aircraft Model"
                    data={models}
                    value={form.values.aircraftModel}
                    onChange={(value) => {
                      form.setFieldValue("aircraftModel", value || "");
                      form.validateField("aircraftModel");
                    }}
                    error={form.errors.aircraftModel}
                    withAsterisk
                    styles={{
                      input: {
                        backgroundColor: '#edf4ff',
                      },
                    }}
                  />

                  <div>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        marginBottom: '4px',
                        display: 'block',
                      }}
                    >
                      Operator <span style={{ color: 'red' }}>*</span>
                    </label>

                    <Combobox
                      key={`operator-combobox-${formKey}`} // Added key for re-render
                      store={combobox}
                      withinPortal={true}
                      position="bottom-start"
                      middlewares={{ flip: false, shift: false }}
                      onOptionSubmit={(val) => {
                        if (val === '$create') {
                          setData((current) => [...current, search]);
                          form.setFieldValue('operator', search);
                          setSearch(search);
                        } else {
                          form.setFieldValue('operator', val);
                          setSearch(val);
                        }
                        combobox.closeDropdown();
                      }}
                    >
                      <Combobox.Target>
                        <InputBase
                          size="xs"
                          leftSection={<IconPlaneTilt size={20} />}
                          rightSection={
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                paddingRight: '4px'
                              }}
                            >
                              <Checkbox
                                size="sm"
                                checked={form.values.operatorForModel}
                                color="#000480"
                                onChange={(event) =>
                                  form.setFieldValue('operatorForModel', event.currentTarget.checked)
                                }
                                disabled={!form.values.operator}
                                title="Consider for Model"
                                style={{ cursor: 'pointer' }}
                              />
                              {search ? (
                                <IconX
                                  size={14}
                                  style={{ cursor: 'pointer' }}
                                  onClick={clearSelection}
                                />
                              ) : (
                                <Combobox.Chevron size="xs" />
                              )}
                            </div>
                          }
                          value={search}
                          onChange={(event) => {
                            combobox.openDropdown();
                            combobox.updateSelectedOptionIndex();
                            setSearch(event.currentTarget.value);
                          }}
                          onClick={() => combobox.openDropdown()}
                          onFocus={() => combobox.openDropdown()}
                          onBlur={() => {
                            combobox.closeDropdown();
                            setSearch(form.values.operator || '');
                            form.validateField('operator');
                          }}
                          placeholder="Indigo, AirIndia"
                          rightSectionPointerEvents="auto"
                          rightSectionWidth={80}
                          error={form.errors.operator}
                          styles={{
                            input: {
                              backgroundColor: form.values.operatorForModel ? '#edf4ff' : '#f5f5f5',
                              paddingRight: '80px',
                            },
                          }}
                        />
                      </Combobox.Target>

                      <Combobox.Dropdown>
                        <Combobox.Options
                          style={{
                            maxHeight: 200,
                            overflowY: 'auto',
                            fontSize: '12px',
                            zIndex: 1000
                          }}
                        >
                          {loadingOperators ? (
                            <Center>
                              <Loader
                                style={{ padding: '20px' }}
                                size="sm"
                                color="#000480"
                              />
                            </Center>

                          ) : data.length === 0 ? (
                            <div
                              style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: '#666',
                                fontSize: '13px',
                              }}
                            >
                              No operators found
                            </div>
                          ) : (
                            <>
                              {options}
                              {!exactOptionMatch && search.trim().length > 0 && (
                                <Combobox.Option value="$create">
                                  + Create "{search}"
                                </Combobox.Option>
                              )}
                            </>
                          )}
                        </Combobox.Options>
                      </Combobox.Dropdown>
                    </Combobox>
                  </div>




                  <TextInput
                    ref={aircraftRegNoRef}
                    size="xs"
                    leftSection={<IconPlaneTilt size="20" />}
                    placeholder="Ex: N-64AB, SP-LR"
                    label="Aircraft Reg No"
                    {...form.getInputProps("aircraftRegNo")}
                    error={form.errors.aircraftRegNo}
                    withAsterisk
                    styles={{
                      input: {
                        // backgroundColor: '#e6fcec',
                        backgroundColor: '#f5f5f5',
                        paddingRight: '80px',
                      },
                    }}

                  />

                  <TextInput
                    size="xs"
                    label="Check Type Description (for ID)"
                    placeholder="Enter Check Type ID"
                    {...form.getInputProps("typeOfCheckID")}
                    error={form.errors.typeOfCheckID}
                    withAsterisk
                    styles={{
                      input: {
                        // backgroundColor: '#e6fcec',
                        backgroundColor: '#f5f5f5',
                        paddingRight: '80px',
                      },
                    }}
                  />

                </SimpleGrid>
                <Space h="md" />
                <SimpleGrid cols={2} spacing="xs">
                  <Card
                    // bg='#f5f5f5' 
                    p='5'
                    withBorder
                  >
                    <Checkbox
                      checked={form.values.considerDeltaUnAvTasks}
                      onChange={(event) =>
                        form.setFieldValue('considerDeltaUnAvTasks', event.currentTarget.checked)}
                      label="Consider Delta Un-Available Tasks"
                      color="#000480"
                      size="sm"
                    />
                  </Card>

                </SimpleGrid>
                <Space h="xs" />

                {/* Filter out aircraftAgeThreshold from additional parameters since it's now in required */}
                {showFields?.filter(field => field !== "aircraftAgeThreshold").length > 0 ? (
                  <>
                    {/* <Text size="md" fw={500}>
                      Additional Parameters
                    </Text> */}
                    <Divider my="xs" label="Additional Parameters" labelPosition="center" />
                  </>
                ) : (
                  <></>
                )}
                <SimpleGrid cols={1} spacing="xs">
                  <SimpleGrid cols={2}>
                    {showFields
                      .filter(
                        (field) =>
                          !["cappingManhrs", "cappingSpares", "aircraftAgeThreshold"].includes(field)
                      ) // Exclude capping fields from the main display
                      .map((field) => (
                        <div key={field}>
                          <Text size="xs" fw={500}>
                            {fields.find((f) => f.name === field)?.label}
                          </Text>
                          {fields.find((f) => f.name === field)?.component}
                        </div>
                      ))}
                  </SimpleGrid>
                </SimpleGrid>

                {/* Capping Fields Section */}
                <SimpleGrid cols={1} spacing="xs" mt="sm">
                  {selectedFields.includes("cappingManhrs") && (
                    <Grid>
                      <Grid.Col span={7}>
                        <Select
                          key={`cappingTypeManhrs-select-${formKey}`}
                          size="xs"
                          label="Man Hrs Capping Type"
                          placeholder="Select Capping Type"
                          // data={["per_source_card", "per_IRC"]}
                          data={[
                            { value: "per_source_card", label: "Per Source Card" },
                            { value: "per_IRC", label: "Per Defect" },
                          ]}
                          allowDeselect
                          {...form.getInputProps(
                            "cappingDetails.cappingTypeManhrs"
                          )}
                        />
                      </Grid.Col>
                      <Grid.Col span={5}>
                        <TextInput
                          size="xs"
                          leftSection={<IconClockHour4 size={20} />}
                          placeholder="Ex: 40"
                          label="Man Hours"
                          {...form.getInputProps(
                            "cappingDetails.cappingManhrs"
                          )}
                        />
                      </Grid.Col>
                    </Grid>
                  )}

                  {selectedFields.includes("cappingSpares") && (
                    <Grid>
                      <Grid.Col span={7}>
                        <Select
                          key={`cappingTypeSpareCost-select-${formKey}`}
                          size="xs"
                          label="Spares Capping Type"
                          placeholder="Select Capping Type"
                          // data={["per_source_card", "per_IRC", "per_line_item"]}
                          data={[
                            { value: "per_source_card", label: "Per Source Card" },
                            { value: "per_IRC", label: "Per Defect" },
                            { value: "per_line_item", label: "Per Line Item" },
                            { value: "per_line_item_per_source_card", label: "Per Line Item Per Source Card" },
                          ]}
                          allowDeselect
                          {...form.getInputProps(
                            "cappingDetails.cappingTypeSpareCost"
                          )}
                        />
                      </Grid.Col>
                      <Grid.Col span={5}>
                        <TextInput
                          size="xs"
                          leftSection={<IconSettingsDollar size={20} />}
                          placeholder="Ex: 600$"
                          label="Cost($)"
                          {...form.getInputProps(
                            "cappingDetails.cappingSpareCost"
                          )}
                        />
                      </Grid.Col>
                    </Grid>
                  )}
                </SimpleGrid>
              </ScrollArea>
            </Card>
          </Grid.Col>
        </Grid>

        <Group justify="center" pt="sm" pb="sm">
          <Button
            onClick={handleSubmit}
            variant="gradient"
            gradient={{ from: "indigo", to: "cyan", deg: 90 }}
            // variant="filled"
            // color='#1A237E'
            disabled={
              extractedTasks?.length > 0 || additionalTasks?.length > 0
                ? false
                : true
            }
            leftSection={<MdLensBlur size={14} />}
            rightSection={<MdOutlineArrowForward size={14} />}
          >
            Generate Estimate
          </Button>
        </Group>

        <Space h="sm" />
        <Card>
      <Stack gap="xs">
      <Group justify="space-between" align="center" gap="sm">
        {/* Left Side: Title + Icon */}
        <Group gap="xs">
          <ThemeIcon variant="light">
            <IconReport />
          </ThemeIcon>
          <Title order={5}>Estimations</Title>
        </Group>

        {/* Right Side: Dropdown + Date Range Picker + Download */}
        <Group justify="right">
          <Flex direction='column' align='end'>
              <Group gap="xs">
                {rangeType === "Custom Range" && (
                  <DatePickerInput
                    type="range"
                    value={dateRange}
                    onChange={setDateRange}
                    size="xs"
                    allowSingleDateInRange
                    styles={{ input: { width: rem(220) } }}
                    placeholder="Select range"
                    clearable
                  />
                )}

                <Select
                // label={statusText}
                  data={["Today", "Last Week", "Custom Range"]}
                  value={rangeType}
                  onChange={(value) => setRangeType(value || "Today")}
                  size="xs"
                  styles={{ input: { width: rem(140) } }}
                  allowDeselect={false}
                />

                <Tooltip label="Download Estimates Summary" withArrow>
                  <ActionIcon
                    variant="light"
                    color="green"
                    radius="sm"
                    size="lg"
                    style={{ padding: 6 }}
                    onClick={handleDownloadEstimateSummary}
                    disabled={loadingEstimatesSummary || estimatesSummary.length === 0}
                  >
                    {loadingEstimatesSummary ? (
                      <Loader size={24} color="green" />
                    ) : (
                      <img src={excelIcon} alt="Download" height={28} style={{ display: "block" }} />
                    )}
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Text size="xs" c="dimmed" pr={45}>
                {statusText}
              </Text>
              </Flex>
      </Group> 
      </Group>
      {/* <Tooltip label="Download Estimates Summary"> 
            <ActionIcon
              variant="gradient"
              size="lg"
              aria-label="Gradient action icon"
              gradient={{ from: 'rgba(13, 0, 158, 1)', to: 'rgba(152, 143, 255, 1)', deg: 310 }}
            >
              <IconDownload />
            </ActionIcon>
          </Tooltip> */}
    </Stack>
          <Space h="sm" />
          <Tabs color="violet" variant="outline" radius="md" defaultValue="recent">
            <Tabs.List>
              <Tabs.Tab value="recent" leftSection={<IconClipboardText size={20} />}>
                Recent
              </Tabs.Tab>
              <Tabs.Tab value="history" leftSection={<IconHistory size={20} />}>
                History
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="recent">
              <div
                className="ag-theme-alpine"
                style={{
                  width: "100%",
                  border: "none",
                  height: "400px",
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
                  pagination={true}
                  paginationPageSize={10} // Changed to 10
                  domLayout="normal" // Changed from autoHeight to normal for fixed height
                  suppressDragLeaveHidesColumns={true} // Prevents column removal when dragging outside
                  suppressColumnMoveAnimation={true} // Optional: prevents animation issues
                  rowData={estimatesStatusData || []}
                  columnDefs={[
                    {
                      field: "createdAt",
                      headerName: "Date",
                      resizable: true,
                      sortable: false,
                      filter: true,
                      floatingFilter: true,
                      flex: 1.8,
                      suppressMovable: false,
                      suppressMenu: true,
                      lockPosition: false,
                      valueGetter: (params: any) => {
                        const value = params.data?.createdAt;
                        if (!value) return "";
                        const dayjsDate = dayjs(value).add(5.5, 'hour');
                        const formatted = dayjsDate.format("DD-MMM-YYYY, HH:mm:ss");
                        return `${formatted} ${value}`;
                      },
                      cellRenderer: (params: any) => {
                        if (!params.value) return null;
                        const parts = params.value.split(" ");
                        const formattedPart = parts.slice(0, 2).join(" ");
                        return <Text mt="xs">{formattedPart}</Text>;
                      },
                    },
                    {
                      field: "estID",
                      headerName: "Estimate ID",
                      sortable: false,
                      filter: true,
                      floatingFilter: true,
                      resizable: true,
                      flex: 2,
                      suppressMovable: false,
                      suppressMenu: true,
                    },
                    {
                      field: "aircraftRegNo",
                      headerName: "Aircraft Reg No",
                      sortable: false,
                      filter: true,
                      floatingFilter: true,
                      resizable: true,
                      flex: 1,
                      suppressMovable: false,
                      suppressMenu: true,
                    },
                    {
                      field: "totalMhs",
                      headerName: "Total ManHrs (Hr)",
                      sortable: false,
                      // filter: true,
                      floatingFilter: true,
                      resizable: true,
                      flex: 1,
                      cellRenderer: (params: any) => (
                        <Text mt="xs">
                          {Math.round(params.value)}{" "}
                          {/* Use Math.round to round to the nearest whole number */}
                        </Text>
                      ),
                      suppressMovable: false,
                      suppressMenu: true,
                    },
                    {
                      field: "totalPartsCost",
                      headerName: "Total Cost ($)",
                      sortable: false,
                      // filter: true,
                      floatingFilter: true,
                      resizable: true,
                      flex: 1,
                      cellRenderer: (params: any) => (
                        <Text mt="xs">{Math.round(params.value)}</Text>
                      ),
                      suppressMovable: false,
                      suppressMenu: true,
                    },
                    {
                      field: "status",
                      headerName: "Status",
                      sortable: false,
                      filter: true,
                      floatingFilter: true,
                      resizable: true,
                      flex: 1.5,
                      suppressMovable: false,
                      suppressMenu: true,
                      cellRenderer: (val: any) => {
                        const status = val.data.status?.toLowerCase();
                        const errorMessage = val.data.error || "No error message";

                        let badgeColor: string;
                        let badgeIcon: JSX.Element;

                        switch (status) {
                          case "completed":
                            badgeColor = "#10b981"; // Green
                            badgeIcon = <IconCircleCheck size={15} />;
                            break;
                          case "progress":
                            badgeColor = "#f59e0b"; // Orange
                            badgeIcon = <IconLoader size={15} className="animate-spin" />;
                            break;
                          case "initiated":
                            badgeColor = "#3b82f6"; // Blue
                            badgeIcon = <IconClockUp size={15} />;
                            break;
                          case "csv generated":
                            badgeColor = "#9333ea"; // Purple
                            badgeIcon = <IconFileCheck size={15} />;
                            break;
                          case "failed":
                            badgeColor = "gray"; // Red
                            badgeIcon = <IconAlertTriangle size={15} />;
                            break;
                          default:
                            badgeColor = "gray";
                            badgeIcon = <IconFileCheck size={15} />;
                        }

                        const knownErrors = [
                          "No packages found for aircraft",
                          "No tasks data found",
                          "No parts data found",
                          "No defects data found",
                        ];

                        // Utility to detect known error patterns
                        const getSafeErrorMessage = (message: string) => {
                          if (!message) return "An Unexpected error occured";

                          const lowerMsg = message;

                          const hasKnownError = knownErrors.some((err) =>
                            lowerMsg?.includes(err)
                          );

                          return hasKnownError ? message : "An Unexpected error occured";
                        };

                        // If failed, return with Popover
                        if (status === "failed") {
                          const safeMessage = getSafeErrorMessage(errorMessage);

                          return (
                            <Popover width={250} position="top" withArrow shadow="md">
                              <Popover.Target>
                                <Badge
                                  mt="xs"
                                  variant="light"
                                  fullWidth
                                  color={badgeColor}
                                  rightSection={badgeIcon}
                                  style={{ cursor: "pointer" }}
                                >
                                  {val.data.status}
                                </Badge>
                              </Popover.Target>

                              <Popover.Dropdown
                                style={{
                                  maxHeight: 150,
                                  overflowY: "auto",
                                  padding: "10px",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                <Text size="sm">{safeMessage}</Text>
                              </Popover.Dropdown>
                            </Popover>
                          );
                        }


                        // Default rendering for other statuses
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
                      sortable: false,
                      // filter: true,
                      // floatingFilter: true,
                      flex: 2,
                      resizable: true,
                      // editable: true,
                      suppressMovable: false,
                      suppressMenu: true,
                      cellRenderer: (val: any, index : any) => {
                        return (
                          <Group mt="xs" align="center" justify="center">
                            <Tooltip label="Show Tasks">
                              <ActionIcon
                                size={20}
                                color="indigo"
                                variant="light"
                                onClick={ async () => {
                                  setSelectedEstimateId(val.data.estID);
                                  setSelectedEstimateIdValidate(val.data.estID);
                                //   await fetchValidatedTaskByID(val.data.estID); // call API immediately
                                //   setSelectedEstimateTasks(val.data.tasks);
                                //   handleValidateTasks(val.data.tasks, val.data.descriptions);
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
                                disabled={
                                  val?.data?.status?.toLowerCase() !== "completed"
                                }
                                onClick={() => {
                                  setSelectedEstimateIdReport(val.data.estID);
                                  setSelectedEstimateIdValidate(val.data.estID);
                                //   handleValidateSkillsTasks(val.data.tasks, val.data.descriptions);
                                  // setOpened(true);
                                }}
                              >
                                <IconReport />
                              </ActionIcon>
                            </Tooltip>

                            {/* <Tooltip label="Probability Details">
                          <ActionIcon
                            size={20}
                            color="rgba(156, 104, 0, 1)"
                            variant="light"
                            disabled={
                              val?.data?.status?.toLowerCase() !== "completed"
                            }
                            onClick={(values: any) => {
                              setProbOpened(true);
                              setSelectedEstimateIdProbability(
                                val?.data?.estID
                              );
                            }}
                          >
                            <IconChartArcs3 />
                          </ActionIcon>
                        </Tooltip> */}
                            <Tooltip label="Remarks!">
                              <ActionIcon
                                size={20}
                                color="blue"
                                variant="light"
                                disabled={
                                  val?.data?.status?.toLowerCase() !== "completed"
                                }
                                onClick={(values: any) => {
                                  setRemarksOpened(true);
                                  setSelectedEstimateIdRemarks(val?.data?.estID);
                                  setSelectedEstRemarksData(val?.data?.remarks);
                                }}
                              >
                                <IconMessage />
                              </ActionIcon>
                              {/* </Indicator> */}
                            </Tooltip>
                            <Tooltip label="Download Uploaded File">
                                <ActionIcon
                                    size={20}
                                    color="lime"
                                    variant="light"
                                    onClick={() => downloadAllValidatedTasksOnly(val.data.estID)}
                                    disabled={downloadingEstId === val.data.estID}
                                >
                                    {downloadingEstId === val.data.estID ? (
                                    <Loader size="xs" color="green" />
                                    ) : (
                                    <IconFileDownload />
                                    )}
                                </ActionIcon>
                                </Tooltip>


                          <Tooltip label="Edit & Re-run Estimate">
  <ActionIcon
    size={20}
    color="lime"
    variant="light"
    onClick={() => handleEditAndGenerateFile(val.data.estID)}
    disabled={loadingEditId === val.data.estID}
  >
    {loadingEditId === val.data.estID ? (
      <Loader size="xs" color="green" />
    ) : (
      <IconEdit />
    )}
  </ActionIcon>
</Tooltip>


                          </Group>
                        );
                      },
                    },
                  ]}
                />
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="history">
              <>
                <Group p={15}>
                  <DatePickerInput
                    value={selectedHistoryDate}
                    onChange={(date) => {
                      setSelectedHistoryDate(date);
                      setCurrentPage(0); // reset page number
                      setPageSize(10);   // reset page size
                    }}
                    placeholder="Select date"
                    label="Select Date"
                    size="xs"
                    clearable
                    minDate={new Date(2025, 2, 1)} // March is month 2 (0-indexed)
                    maxDate={new Date()} // today's date
                    styles={{ input: { width: '15vw' } }}
                  />

                  <TextInput
                    value={selectedHistoryEstId}
                    onChange={(e) => {
                      setSelectedHistoryEstId(e.currentTarget.value.toUpperCase());
                      setCurrentPage(0); // reset page number
                      setPageSize(10);   // reset page size
                    }}
                    placeholder="Estimate ID"
                    label="Estimate ID"
                    size="xs"
                    styles={{ input: { width: '16vw' } }}
                  />
                  <TextInput
                    value={selectedHistoryAircrRegNo}
                    onChange={(e) => {
                      setSelectedHistoryAircrRegNo(e.currentTarget.value);
                      setCurrentPage(0); // reset page number
                      setPageSize(10);   // reset page size
                    }}
                    placeholder="Aircraft Reg No"
                    label="Aircraft Reg No"
                    size="xs"
                    styles={{ input: { width: '100%' } }}
                  />
                  <Select
                    value={selectedHistoryStatus}
                    onChange={(value) => {
                      setSelectedHistoryStatus(value);
                      setCurrentPage(0); // reset page number
                      setPageSize(10);   // reset page size
                    }}
                    data={["Completed", "Progress", "Initiated", "Failed"]}
                    placeholder="Select Status"
                    label="Status"
                    size="xs"
                    clearable
                    styles={{ input: { width: '100%' } }}
                  />
                </Group>
                <div
                  className="ag-theme-alpine"
                  style={{
                    width: "100%",
                    border: "none",
                    height: "350px",
                    position: "relative",
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

                      /* Custom loading overlay styles */
                      .custom-loading-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(255, 255, 255, 0.8);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                        pointer-events: none;
                      }

                      /* Hide default ag-grid loading overlay */
                      .ag-overlay-loading-wrapper {
                        display: none !important;
                      }

                      /* Ensure header and pagination stay visible during loading */
                      .ag-theme-alpine .ag-header {
                        position: relative;
                        z-index: 1001;
                      }

                      .ag-theme-alpine .ag-paging-panel {
                        position: relative;
                        z-index: 1001;
                      }
                    `}
                  </style>

                  {/* Custom Mantine Loading Overlay */}
                  {loadingHistoryEstimates && (
                    <div className="custom-loading-overlay">
                      <Loader size="sm" color="#000480" />
                    </div>
                  )}

                  <AgGridReact
                    onGridReady={onGridReady}
                    rowData={loadingHistoryEstimates ? [] : historyEstimatesStatusData}
                    pagination={false}
                    // paginationPageSize={pageSize}
                    // onPaginationChanged={(params) => {
                    //   if (params.api) {
                    //     const newPage = params.api.paginationGetCurrentPage();
                    //     setCurrentPage(newPage);
                    //   }
                    // }}
                    onFirstDataRendered={(params) => {
                      // This ensures AG Grid initializes properly and pagination works
                      params.api.paginationGoToPage(currentPage);
                    }}
                    // onPageSizeChanged={(params : any) => {
                    //   if (params.api) {
                    //     const newSize = params.api.paginationGetPageSize();
                    //     setPageSize(newSize);
                    //     setCurrentPage(0); // reset to first page
                    //   }
                    // }}
                    overlayLoadingTemplate=""
                    domLayout="normal"
                    columnDefs={[
                      {
                        field: "createdAt",
                        headerName: "Date",
                        resizable: true,
                        sortable: false,
                        flex: 1.8,
                        suppressMovable: false,
                        suppressMenu: true,
                        lockPosition: false,
                        // filter: true,
                        // floatingFilter: true,
                        // 
                        valueGetter: (params: any) => {
                          const value = params.data?.createdAt;
                          if (!value) return "";
  
                          // Use dayjs to parse and add 5.5 hours (IST offset)
                          const dayjsDate = dayjs(value).add(5.5, 'hour');
                          const formatted = dayjsDate.format("DD-MMM-YYYY, HH:mm:ss");
                          return `${formatted} ${value}`;
                        },
                        cellRenderer: (params: any) => {
                          if (!params.value) return null;
                          const parts = params.value.split(" ");
                          const formattedPart = parts.slice(0, 2).join(" ");
                          return <Text mt="xs">{formattedPart}</Text>;
                        },
                        // cellRenderer: (params: any) => {
                        //   if (!params.value) return null;
                        //   const parts = params.value.split(" ");
                        //   const formattedPart = parts.slice(0, 2).join(" ");
                        //   return <Text mt="xs">{formattedPart}</Text>;
                        // },
                      },
                      {
                        field: "estID",
                        headerName: "Estimate ID",
                        resizable: true,
                        sortable: false,
                        // filter: true,
                        // floatingFilter: true,
                        flex: 2,
                        suppressMovable: false,
                        suppressMenu: true,
                      },
                      {
                        field: "aircraftRegNo",
                        headerName: "Aircraft Reg No",
                        resizable: true,
                        sortable: false,
                        // filter: true,
                        // floatingFilter: true,
                        flex: 1,
                        suppressMovable: false,
                        suppressMenu: true,
                      },
                      {
                        field: "totalMhs",
                        headerName: "Total ManHrs (Hr)",
                        resizable: true,
                        flex: 1,
                        suppressMovable: false,
                        sortable: false,
                        suppressMenu: true,
                        cellRenderer: (params: any) => (
                          <Text mt="xs">{Math.round(params.value)}</Text>
                        ),
                      },
                      {
                        field: "totalPartsCost",
                        headerName: "Total Cost ($)",
                        resizable: true,
                        sortable: false,
                        flex: 1,
                        suppressMovable: false,
                        suppressMenu: true,
                        cellRenderer: (params: any) => (
                          <Text mt="xs">{Math.round(params.value)}</Text>
                        ),
                      },
                      {
                        field: "status",
                        headerName: "Status",
                        sortable: false,
                        // filter: true,
                        // floatingFilter: true,
                        resizable: true,
                        flex: 1.5,
                        suppressMovable: false,
                        suppressMenu: true,
                        cellRenderer: (val: any) => {
                          const status = val.data.status?.toLowerCase();
                          const errorMessage = val.data.error || "No error message";

                          let badgeColor: string;
                          let badgeIcon: JSX.Element;

                          switch (status) {
                            case "completed":
                              badgeColor = "#10b981"; // Green
                              badgeIcon = <IconCircleCheck size={15} />;
                              break;
                            case "progress":
                              badgeColor = "#f59e0b"; // Orange
                              badgeIcon = <IconLoader size={15} className="animate-spin" />;
                              break;
                            case "initiated":
                              badgeColor = "#3b82f6"; // Blue
                              badgeIcon = <IconClockUp size={15} />;
                              break;
                            case "csv generated":
                              badgeColor = "#9333ea"; // Purple
                              badgeIcon = <IconFileCheck size={15} />;
                              break;
                            case "failed":
                              badgeColor = "gray"; // Red
                              badgeIcon = <IconAlertTriangle size={15} />;
                              break;
                            default:
                              badgeColor = "gray";
                              badgeIcon = <IconFileCheck size={15} />;
                          }

                          const knownErrors = [
                            "No packages found for aircraft",
                            "No tasks data found",
                            "No parts data found",
                            "No defects data found",
                          ];

                          // Utility to detect known error patterns
                          const getSafeErrorMessage = (message: string) => {
                            if (!message) return "An Unexpected error occured";

                            const lowerMsg = message;

                            const hasKnownError = knownErrors.some((err) =>
                              lowerMsg?.includes(err)
                            );

                            return hasKnownError ? message : "An Unexpected error occured";
                          };

                          // If failed, return with Popover
                          if (status === "failed") {
                            const safeMessage = getSafeErrorMessage(errorMessage);

                            return (
                              <Popover width={250} position="top" withArrow shadow="md">
                                <Popover.Target>
                                  <Badge
                                    mt="xs"
                                    variant="light"
                                    fullWidth
                                    color={badgeColor}
                                    rightSection={badgeIcon}
                                    style={{ cursor: "pointer" }}
                                  >
                                    {val.data.status}
                                  </Badge>
                                </Popover.Target>

                                <Popover.Dropdown
                                  style={{
                                    maxHeight: 200,
                                    overflowY: "auto",
                                    padding: "10px",
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  <Text size="sm">{safeMessage}</Text>
                                </Popover.Dropdown>
                              </Popover>
                            );
                          }


                          // Default rendering for other statuses
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
                      sortable: false,
                      // filter: true,
                      // floatingFilter: true,
                      flex: 2,
                      resizable: true,
                      // editable: true,
                      suppressMovable: false,
                      suppressMenu: true,
                      cellRenderer: (val: any, index : any) => {
                        return (
                          <Group mt="xs" align="center" justify="center">
                            <Tooltip label="Show Tasks">
                              <ActionIcon
                                size={20}
                                color="indigo"
                                variant="light"
                                onClick={ async () => {
                                  setSelectedEstimateId(val.data.estID);
                                  setSelectedEstimateIdValidate(val.data.estID);
                                //   await fetchValidatedTaskByID(val.data.estID); // call API immediately
                                //   setSelectedEstimateTasks(val.data.tasks);
                                //   handleValidateTasks(val.data.tasks, val.data.descriptions);
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
                                disabled={
                                  val?.data?.status?.toLowerCase() !== "completed"
                                }
                                onClick={() => {
                                  setSelectedEstimateIdReport(val.data.estID);
                                  setSelectedEstimateIdValidate(val.data.estID);
                                //   handleValidateSkillsTasks(val.data.tasks, val.data.descriptions);
                                  // setOpened(true);
                                }}
                              >
                                <IconReport />
                              </ActionIcon>
                            </Tooltip>

                            {/* <Tooltip label="Probability Details">
                          <ActionIcon
                            size={20}
                            color="rgba(156, 104, 0, 1)"
                            variant="light"
                            disabled={
                              val?.data?.status?.toLowerCase() !== "completed"
                            }
                            onClick={(values: any) => {
                              setProbOpened(true);
                              setSelectedEstimateIdProbability(
                                val?.data?.estID
                              );
                            }}
                          >
                            <IconChartArcs3 />
                          </ActionIcon>
                        </Tooltip> */}
                            <Tooltip label="Remarks!">
                              <ActionIcon
                                size={20}
                                color="blue"
                                variant="light"
                                disabled={
                                  val?.data?.status?.toLowerCase() !== "completed"
                                }
                                onClick={(values: any) => {
                                  setRemarksOpened(true);
                                  setSelectedEstimateIdRemarks(val?.data?.estID);
                                  setSelectedEstRemarksData(val?.data?.remarks);
                                }}
                              >
                                <IconMessage />
                              </ActionIcon>
                              {/* </Indicator> */}
                            </Tooltip>
                            <Tooltip label="Download Uploaded File">
                                <ActionIcon
                                    size={20}
                                    color="lime"
                                    variant="light"
                                    onClick={() => downloadAllValidatedTasksOnly(val.data.estID)}
                                    disabled={downloadingEstId === val.data.estID}
                                >
                                    {downloadingEstId === val.data.estID ? (
                                    <Loader size="xs" color="green" />
                                    ) : (
                                    <IconFileDownload />
                                    )}
                                </ActionIcon>
                                </Tooltip>


                          <Tooltip label="Edit & Re-run Estimate">
  <ActionIcon
    size={20}
    color="lime"
    variant="light"
    onClick={() => handleEditAndGenerateFile(val.data.estID)}
    disabled={loadingEditId === val.data.estID}
  >
    {loadingEditId === val.data.estID ? (
      <Loader size="xs" color="green" />
    ) : (
      <IconEdit />
    )}
  </ActionIcon>
</Tooltip>



                          </Group>
                        );
                      },
                    },
                    ]}
                  />
                </div>
                <Divider my="sm" />
                {/* Custom footer for pagination */}
                <Group justify="right" mt="sm" px="md">
                  <Text size="sm">
                    <Text span c="black" fw={600}>
                      {currentPage * pageSize + 1}
                    </Text>{" "}
                    <Text span fw={100}>to</Text>{" "}
                    <Text span c="black" fw={600}>
                      {Math.min((currentPage + 1) * pageSize, historyEstimatesCount || 0)}
                    </Text>{" "}
                    <Text span fw={100}>of</Text>{" "}
                    <Text span c="black" fw={600}>
                      {historyEstimatesCount || 0}
                    </Text>{" "}
                  </Text>


                  <Group gap="xs">
                    <Text size="xs">Page Size:</Text>
                    <Select
                      color="black"
                      size="xs"
                      radius='sm'
                      data={["10", "20", "30", "50"]}
                      value={String(pageSize)}
                      styles={{ input: { width: '5vw', borderColor: "gray" } }}
                      onChange={(value) => {
                        if (value) {
                          setPageSize(parseInt(value, 10));
                          setCurrentPage(0); // Reset to first page
                        }
                      }}
                    />
                    <Space w='lg' />
                    <Pagination
                      color="black"
                      withEdges
                      total={Math.ceil((historyEstimatesCount || 0) / pageSize)}
                      value={currentPage + 1}
                      onChange={(page) => setCurrentPage(page - 1)} // convert to 0-based
                      size="xs"
                    />
                  </Group>
                </Group>

              </>
            </Tabs.Panel>
          </Tabs>

        </Card>
        <Space h="sm" />

        <SegmentedControl
          color="indigo"
          bg="white"
          value={value}
          onChange={setValue}
          data={[
            { label: "Estimate", value: "estimate" },
            { label: "Skill", value: "skill" },
          ]}
        />

        <Space h="sm" />
        {estimateReportData !== null ? (
          <Group>
            <Title order={4} c="gray">
              Selected Estimate :
            </Title>
            <Title order={4}>{estimateReportData?.estID || "-"}</Title>
          </Group>
        ) : (
          <></>
        )}

        {value === "estimate" ? (
          <>
            {estimateReportData !== null ? (
              <>
                <Divider
                  variant="dashed"
                  labelPosition="center"
                  color={"gray"}
                  pb="sm"
                  pt="sm"
                  label={
                    <>
                      <Box ml={5}>Estimate</Box>
                    </>
                  }
                />
                <Space h="sm" />
                {
                  <Group mb="md" justify="space-between">
                    <Group>
                      <SegmentedControl
                        color="blue"
                        bg="white"
                        value={tabValue}
                        onChange={setTabValue}
                        data={[
                          { label: "Estimation", value: "overall" },
                          { label: "Findings", value: "finding" },
                          { label: "MPD", value: "mpd" },
                        ]}
                      />
                      <Title order={4} fw={500} c="dimmed">
                        {tabValue === "overall"
                          ? "Estimate Report"
                          : tabValue === "finding"
                            ? "Findings Report"
                            : "MPD Report"}
                        {/* Overall Estimate Report */}
                      </Title>
                    </Group>
                    {tabValue === "overall" && (
                      <Group>
                        <Button
                          size="xs"
                          // variant="filled"
                          // color="#124076"
                          variant="gradient"
                          gradient={{
                            from: "rgba(67, 143, 230, 1)",
                            to: "rgba(0, 50, 107, 1)",
                            deg: 184,
                          }}
                          // radius='lg'
                          // leftSection={<MdPictureAsPdf size={14} />}
                          rightSection={<MdOutlineFileDownload size={14} />}
                          onClick={downloadCSVReport}
                        // loading={downloading}
                        >
                          {downloading ? "Downloading..." : "CSV"}
                        </Button>
                        <Button
                          size="xs"
                          variant="gradient"
                          gradient={{
                            from: "rgba(67, 143, 230, 1)",
                            to: "rgba(0, 50, 107, 1)",
                            deg: 184,
                          }}
                          // variant="filled"
                          // color="#124076"
                          // radius='lg'
                          // leftSection={<MdPictureAsPdf size={14} />}
                          rightSection={<MdOutlineFileDownload size={14} />}
                          onClick={downloadExcelReport}
                        // loading={downloading}
                        >
                          {downloading ? "Downloading..." : "Excel"}
                        </Button>
                      </Group>
                    )}
                  </Group>
                }
                {tabValue === "overall" ? (
                  <>
                    <OverallEstimateReport
                      TATTime={estimateReportData?.tat || 0}
                      extendedTATTime={estimateReportData?.extendedTat || 0}
                      tatMessage={estimateReportData?.tatMessage}
                      noOfPackages={estimateReportData?.noOfPackages || 0}
                      estimatedManHrs={
                        estimateReportData?.overallEstimateReport?.estimateManhrs || {}
                      }
                      estimatedSparesCost={
                        estimateReportData?.overallEstimateReport?.estimatedSpareCost || 0
                      }
                      capppingMhsType={
                        estimateReportData?.cappingValues?.cappingTypeManhrs || ""
                      }
                      unbilledCapppingMhs={
                        estimateReportData?.cappingValues?.unbillableManhrs || 0
                      }
                      cappingUnbilledCostType={
                        estimateReportData?.cappingValues?.cappingTypeSpareCost || ""
                      }
                      cappingUnbilledCost={
                        estimateReportData?.cappingValues?.unbillableSpareCost || 0
                      }
                      cappingManhrs={
                        estimateReportData?.cappingDetails?.cappingManhrs || 0
                      }
                      cappingSpareCost={
                        estimateReportData?.cappingDetails?.cappingSpareCost || 0
                      }
                      parts={
                        estimateReportData?.overallEstimateReport?.spareParts?.sort(
                          (a: any, b: any) => b?.price - a?.price
                        ) || []
                      }
                      spareCostData={[
                        {
                          date: "Min",
                          Cost: Math.round(
                            (estimateReportData?.overallEstimateReport?.estimatedSpareCost || 0) * 0.95
                          ),
                        },
                        {
                          date: "Estimated",
                          Cost: Math.round(
                            estimateReportData?.overallEstimateReport?.estimatedSpareCost || 0
                          ),
                        },
                        {
                          date: "Max",
                          Cost: Math.round(
                            (estimateReportData?.overallEstimateReport?.estimatedSpareCost || 0) * 1.03
                          ),
                        },
                      ]}
                    />
                  </>
                ): tabValue === "finding" ? (
                  <>
                    <OverallFindingsReport
                      TATTime={estimateReportData?.tat || 0}
                      extendedTATTime={estimateReportData?.extendedTat || 0}
                      tatMessage={estimateReportData?.tatMessage}
                      noOfPackages={estimateReportData?.noOfPackages || 0}
                      estimatedManHrs={
                        estimateReportData?.aggregatedFindings
                          ?.estimateManhrs || {}
                      }
                      estimatedSparesCost={
                        estimateReportData?.aggregatedFindings
                          ?.estimatedSpareCost || 0
                      }
                      capppingMhsType={
                        estimateReportData?.cappingValues?.cappingTypeManhrs || 0
                      }
                      unbilledCapppingMhs={
                        estimateReportData?.cappingValues?.unbillableManhrs || 0
                      }
                      cappingUnbilledCostType={
                        estimateReportData?.cappingValues?.cappingTypeSpareCost || 0
                      }
                      cappingUnbilledCost={
                        estimateReportData?.cappingValues?.unbillableSpareCost || 0
                      }
                      cappingManhrs={estimateReportData?.cappingDetails?.cappingManhrs || 0}
                      cappingSpareCost={estimateReportData?.cappingDetails?.cappingSpareCost || 0}
                      
                      parts={
                        estimateReportData?.aggregatedFindings?.spareParts?.sort((a: any, b: any) => b?.price - a?.price) || []
                      }
                      spareCostData={[
                        {
                          date: "Min",
                          Cost: Math.round(
                            estimateReportData?.aggregatedFindings
                              ?.estimatedSpareCost * 0.95
                          ),
                        },
                        {
                          date: "Estimated",
                          Cost: Math.round(
                            estimateReportData?.aggregatedFindings
                              ?.estimatedSpareCost
                          ),
                        },
                        {
                          date: "Max",
                          Cost: Math.round(
                            estimateReportData?.aggregatedFindings
                              ?.estimatedSpareCost * 1.03
                          ),
                        },
                      ]}
                    />
                  </>
                ) : (
                    <>
                      <OverallMPDReport
                        TATTime={estimateReportData?.tat || 0}
                        extendedTATTime={estimateReportData?.extendedTat || 0}
                        tatMessage={estimateReportData?.tatMessage}
                        estimatedManHrs={
                          estimateReportData?.aggregatedTasks?.estimateManhrs || {}
                        }
                        noOfPackages={estimateReportData?.noOfPackages || 0}
                        estimatedSparesCost={
                          estimateReportData?.aggregatedTasks?.estimatedSpareCost || 0
                        }
                        capppingMhsType={
                          estimateReportData?.cappingValues?.cappingTypeManhrs || ""
                        }
                        unbilledCapppingMhs={
                          estimateReportData?.cappingValues?.unbillableManhrs || 0
                        }
                        cappingUnbilledCostType={
                          estimateReportData?.cappingValues?.cappingTypeSpareCost || ""
                        }
                        cappingUnbilledCost={
                          estimateReportData?.cappingValues?.unbillableSpareCost || 0
                        }
                        cappingManhrs={
                          estimateReportData?.cappingDetails?.cappingManhrs || 0
                        }
                        cappingSpareCost={
                          estimateReportData?.cappingDetails?.cappingSpareCost || 0
                        }
                        parts={
                          estimateReportData?.aggregatedTasks?.spareParts?.sort(
                            (a: any, b: any) => b?.price - a?.price
                          ) || []
                        }
                        spareCostData={[
                          {
                            date: "Min",
                            Cost: Math.round(
                              (estimateReportData?.aggregatedTasks?.estimatedSpareCost || 0) * 0.95
                            ),
                          },
                          {
                            date: "Estimated",
                            Cost: Math.round(
                              estimateReportData?.aggregatedTasks?.estimatedSpareCost || 0
                            ),
                          },
                          {
                            date: "Max",
                            Cost: Math.round(
                              (estimateReportData?.aggregatedTasks?.estimatedSpareCost || 0) * 1.03
                            ),
                          },
                        ]}
                      />
                    </>
                  )}

                <Space h="sm" />

                {/* <OverallEstimateReport
                                            totalTATTime={estimateReportData?.overallEstimateReport?.estimatedTatTime || 0}
                                            estimatedManHrs={estimateReportData?.overallEstimateReport?.estimateManhrs || {}}
                                            capppingMhs={estimateReportData?.capping?.unbillable_mhs || 0}
                                            estimatedSparesCost={estimateReportData?.overallEstimateReport?.estimatedSpareCost || 0}
                                            cappingUnbilledCost={estimateReportData?.capping?.unbillable_cost || 0}
                                            parts={estimateReportData?.overallEstimateReport?.spareParts || []
                                                // [
                                                //   { partDesc: "Bolt", partName: "M12 Bolt", qty: 4.0, price: 10.00, unit: "" },
                                                //   { partDesc: "Screw", partName: "Wood Screw", qty: 2.0, price: 5.00, unit: "" },
                                                // ]
                                            }
                                            spareCostData={[
                                                { date: "Min", Cost: 100 },
                                                { date: "Estimated", Cost: 800 },
                                                { date: "Max", Cost: 1000 },
                                            ]}
                                        />
                                        <Space h='xl' /> */}

                {/* <FindingsWiseSection tasks={jsonData?.tasks} findings={jsonData.findings} /> */}

                {
                  tabValue === "overall" || tabValue === "finding" ? (
                    <FindingsWiseSection
                      tasks={estimateReportData?.tasks}
                      findings={estimateReportData?.findings}
                    />
                  ) : (
                    <></>
                  )
                }
                {
                  tabValue === "overall" || tabValue === "mpd" ? (
                    <PreloadWiseSection tasks={estimateReportData?.tasks} />
                  ) : (
                    <></>
                  )
                }
                {/* <FindingsWiseSection
                  tasks={estimateReportData?.tasks}
                  findings={estimateReportData?.findings}
                /> */}

                <Space h="md" />
                {/* <PreloadWiseSection tasks={jsonData?.tasks} /> */}
                {/* <PreloadWiseSection tasks={estimateReportData?.tasks} /> */}
              </>
            ) : (
              <></>
            )}
          </>
        ) : (
          <>
            <SkillRequirementAnalytics skillAnalysisData={skillAnalysisData} />
          </>
        )}
      </div>
    </>
  );
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
  logItem?: string;
  description: string;
  probability?: number;
  prob?: number; // Alternative name based on your data
  mhs: ManHours;
  spareParts?: SparePart[];
  spare_parts?: any[]; // Alternative name based on your data
  skill: string[];
  cluster: string;
  task_defect_probability: number;
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
  unit: any;
}

interface ChartData {
  date: string;
  Cost: number;
}

interface TATDashboardProps {
  TATTime: number;
  extendedTATTime: number;
  noOfPackages: number; // Added noOfPackages prop
  tatMessage: string;
  estimatedManHrs: {
    min: number;
    estimated: number;
    max: number;
    capping: number;
  };
  cappingManhrs: any;
  cappingSpareCost: any;
  capppingMhsType: any;
  unbilledCapppingMhs : any;
  cappingUnbilledCost: any;
  cappingUnbilledCostType: any;
  parts: Part[];
  estimatedSparesCost: number;
  spareCostData: ChartData[];
}

const OverallEstimateReport: React.FC<TATDashboardProps> = ({
  TATTime,
  extendedTATTime,
  tatMessage,
  noOfPackages, // Added noOfPackages prop
  estimatedManHrs,
  cappingUnbilledCost,
  capppingMhsType,
  unbilledCapppingMhs,
  cappingManhrs,
  cappingSpareCost,
  cappingUnbilledCostType,
  parts,
  estimatedSparesCost,
  spareCostData,
}: any) => {
  return (
    <Box>
      {/* <Title order={4} mb="md" fw={500} c="dimmed">Overall Estimate Report</Title> */}
      <Grid gutter="xs">
        {/* Left Section - Estimate Overview */}
        <Grid.Col span={3}>
          <Card withBorder radius="md" p="xs" h="100%">
            {/* <Title order={5} mb="md" fw={500} c="dimmed">Estimate Overview</Title> */}

            {/* Total TAT Time */}
            <Card withBorder radius="md" p="5" bg="blue.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="blue.6">
                  <IconClock size={24} />
                </ThemeIcon>
                <Group justify="space-between" style={{ flex: 1 }}>
                  <Flex direction="column" align="flex-start">
                    <Text size="sm" fw={500} c="dimmed">
                      TAT Time
                    </Text>
                    <Text size="xl" fw={700} c="blue.6">
                      {Math.floor(TATTime) || 0} days
                    </Text>
                  </Flex>
                  <Flex direction="column" align="flex-start">
                    <Text size="sm" fw={500} c="dimmed">
                      Extended TAT Time
                    </Text>
                    <Text size="xl" fw={700} c="blue.6">
                      {Math.floor(extendedTATTime) || 0} days
                    </Text>
                  </Flex>
                  <Popover position="left" withArrow shadow="md">
                    <Popover.Target>
                      <ThemeIcon 
                        variant="light" 
                        radius="md" 
                        size={20} 
                        color="yellow.6"
                        style={{ cursor: 'pointer' }}
                      >
                        <IconMessage size={20} />
                      </ThemeIcon>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <Text size="sm" style={{ maxWidth: '300px' }}>
                        {tatMessage}
                      </Text>
                    </Popover.Dropdown>
                  </Popover>
                </Group>
              </Group>
            </Card>
            
            <Space h="xs" />
            
            {/* Number of Packages */}
            <Card withBorder radius="md" p="5" bg="orange.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="orange.6">
                  <IconPackage size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Number of Packages
                  </Text>
                  <Text size="xl" fw={700} c="orange.6">
                    {noOfPackages || 0}
                  </Text>
                </Flex>
              </Group>
            </Card>
            
            <Space h="xs" />
            
            {/* Estimated Man Hours */}
            <Card withBorder radius="md" p="md" bg="gray.0">
              <Text size="sm" fw={500} c="dimmed" mb="md">
                Estimated Man Hours
              </Text>
              <Flex gap="md" direction="column">
                {Object.entries(estimatedManHrs || {})
                  .filter(([key, val]) => key !== "est")
                  .map(([key, value]: any) => {
                    // Determine color based on key
                    const color =
                      key === "min_mh"
                        ? "teal.6"
                        : key === "max_mh"
                          ? "blue.6"
                          : key === "avg_mh"
                            ? "green.6"
                            : "green.6";

                    // Format the label, replace "avg" with "Estimated"
                    const label = key.includes("avg")
                      ? "Estimated"
                      : key.charAt(0).toUpperCase() + key.slice(1);

                    return (
                      <Box key={key}>
                        <Group justify="space-between" mb={5}>
                          <Text fz="xs" fw={500}>
                            {label.replace("_mh", "")}
                          </Text>
                          <Text fz="sm" fw={600} c={color}>
                            {typeof value === "number"
                              ? value.toFixed(0)
                              : value}{" "}
                            Hrs
                          </Text>
                        </Group>
                        <Progress
                          color={color}
                          value={
                            typeof value === "number"
                              ? Math.min(value / 100, 100)
                              : 0
                          }
                          size="md"
                          radius="sm"
                        />
                      </Box>
                    );
                  })}
              </Flex>
            </Card>

            <Space h="xs" />
            
            {/* Unbillable Cost */}
            <Card withBorder radius="md" p="5" mb="sm" bg="gray.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="blue.6">
                  <IconSettingsDollar size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Unbillable Material Cost
                  </Text>
                  <Text size="xs" c="black">
                    {(cappingUnbilledCostType || "")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char: any) => char.toUpperCase()
                      )} - ($ {cappingSpareCost || 0})
                  </Text>
                  <Text size="lg" fw={600} c="blue.6">
                    ${cappingUnbilledCost?.toFixed(2) || 0}
                  </Text>
                </Flex>
              </Group>
              
              <Space h="sm" />
              
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="green.6">
                  <IconClockHour4 size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Unbillable Man Hours
                  </Text>
                  <Text size="xs" c="black">
                    {(capppingMhsType || "")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char: any) => char.toUpperCase()
                      )} - ({cappingManhrs || 0} hr)
                  </Text>
                  <Text size="lg" fw={600} c="green.6">
                    {Math.round(unbilledCapppingMhs)} hr
                  </Text>
                </Flex>
              </Group>
            </Card>
          </Card>
        </Grid.Col>

        {/* Center Section - Parts Table (6 columns width) */}
        <Grid.Col span={6}>
          <Card
            withBorder
            radius="md"
            p="md"
            h="100%"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <Title order={5} mb="md" size="sm" fw={500} c="dimmed">
              Estimated Parts
            </Title>
            <Box style={{ flex: 1, height: "500px" }}>
              <div
                className="ag-theme-alpine"
                style={{
                  width: "100%",
                  height: "100%",
                }}
              >
                <style>
                  {`
                      .ag-theme-alpine {
                        --ag-header-background-color: #f8f9fa;
                        --ag-odd-row-background-color: #ffffff;
                        --ag-even-row-background-color: #f9f9f9;
                        --ag-row-hover-color: #f1f3f5;
                        --ag-border-color: #e9ecef;
                        --ag-font-size: 13px;
                      }
                      
                      .ag-theme-alpine .ag-header-cell {
                        font-weight: 600;
                        color: #495057;
                      }
                      
                      .ag-theme-alpine .ag-row {
                        border-bottom: 1px solid var(--ag-border-color);
                      }
  
                      .ag-theme-alpine .ag-cell {
                        padding: 8px;
                      }
                    `}
                </style>
                <AgGridReact
                  rowData={parts || []}
                  domLayout="normal"
                  // defaultColDef={{
                  //   sortable: false,
                  //   resizable: true,
                  //   filter: true,
                  //   floatingFilter: true,

                  // }}
                  columnDefs={[
                    {
                      field: "partId",
                      headerName: "Part Number",
                      flex: 1.5,
                      minWidth: 120,
                      sortable: true,
                      resizable: true,
                      filter: true,
                      floatingFilter: true,
                    },
                    {
                      field: "desc",
                      headerName: "Description",
                      flex: 1.5,
                      minWidth: 120,
                      sortable: true,
                      resizable: true,
                      filter: true,
                      floatingFilter: true,
                    },
                    {
                      field: "qty",
                      headerName: "Qty",
                      flex: 0.8,
                      minWidth: 80,
                      filter: "agNumberColumnFilter",
                      cellRenderer: (val: any) => {
                        return (
                          <>
                            <Center>
                              <Text>{val?.data?.qty?.toFixed(2)}</Text>
                            </Center>
                          </>
                        );
                      },
                    },
                    {
                      field: "unit",
                      headerName: "Units",
                      flex: 0.8,
                      minWidth: 80,
                      cellRenderer: (val: any) => {
                        return (
                          <Text>
                            {val?.data?.unit === "nan" ? "Unknown" : val?.data?.unit}
                          </Text>
                        );
                      },
                    },
                    {
                      field: "price",
                      headerName: "Price ($)",
                      flex: 1,
                      minWidth: 90,
                      filter: "agNumberColumnFilter",
                      cellRenderer: (params: any) => {
                        if (params.value === null || params.value === undefined)
                          return "";
                        return <Text>
                          {parseFloat(params.value).toFixed(2)}
                        </Text>
                      },
                    },
                  ]}
                  pagination={true}
                  paginationPageSize={10}
                />
              </div>
            </Box>
          </Card>
        </Grid.Col>

        {/* Right Section - Chart (3 columns width) */}
        <Grid.Col span={3}>
          <Card withBorder radius="md" p="xs" h="100%">
            <Title order={5} m="xs" size="sm" fw={500} c="dimmed">
              Spare Cost Analysis
            </Title>
            <Card withBorder radius="md" p="5" bg="blue.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="blue.6">
                  <MdOutlineMiscellaneousServices size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Estimated Spares Cost
                  </Text>
                  <Text size="xl" fw={700} c="blue.6">
                    ${estimatedSparesCost?.toFixed(2) || 0}
                  </Text>
                </Flex>
              </Group>
            </Card>
            <Space h='5' />

            <Card withBorder radius="md" p="xs" bg="blue.0">
              {/* <Text size="sm" fw={500} c="dimmed" mb="md">
                  Spare Cost Trend
                </Text> */}
              <AreaChart
                h={380}
                data={
                  spareCostData || [
                    { date: "Min", Cost: 100 },
                    { date: "Estimated", Cost: 750 },
                    { date: "Max", Cost: 1000 },
                  ]
                }
                dataKey="date"
                series={[{ name: "Cost", color: "blue.9" }]}
                curveType="monotone"
                withGradient
                connectNulls
                gridAxis="y"
                withLegend={false}
                tooltipProps={{
                  content: ({ payload, label }) => {
                    if (payload && payload.length > 0) {
                      return (
                        <Card p="xs" withBorder>
                          <Text fw={500} size="sm">
                            {label}
                          </Text>
                          <Text size="sm">${payload[0].value}</Text>
                        </Card>
                      );
                    }
                    return null;
                  },
                }}
                yAxisProps={{
                  tickFormatter: (value) => `$${value}`,
                  domain: ["dataMin - 10", "dataMax + 10"],
                }}
              />
            </Card>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
};

const OverallFindingsReport: React.FC<any> = ({
  TATTime,
  extendedTATTime,
  tatMessage,
  noOfPackages, // Added noOfPackages prop
  estimatedManHrs,
  cappingUnbilledCost,
  capppingMhsType,
  unbilledCapppingMhs,
  cappingManhrs,
  cappingSpareCost,
  cappingUnbilledCostType,
  parts,
  estimatedSparesCost,
  spareCostData,
}: any) => {
    return (
    <Box>
      {/* <Title order={4} mb="md" fw={500} c="dimmed">Overall Estimate Report</Title> */}
      <Grid gutter="xs">
        {/* Left Section - Estimate Overview */}
        <Grid.Col span={3}>
          <Card withBorder radius="md" p="xs" h="100%">
            {/* <Title order={5} mb="md" fw={500} c="dimmed">Estimate Overview</Title> */}

            {/* Total TAT Time */}
            <Card withBorder radius="md" p="5" bg="blue.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="blue.6">
                  <IconClock size={24} />
                </ThemeIcon>
                <Group justify="space-between" style={{ flex: 1 }}>
                  <Flex direction="column" align="flex-start">
                    <Text size="sm" fw={500} c="dimmed">
                      TAT Time
                    </Text>
                    <Text size="xl" fw={700} c="blue.6">
                      {Math.floor(TATTime) || 0} days
                    </Text>
                  </Flex>
                  <Flex direction="column" align="flex-start">
                    <Text size="sm" fw={500} c="dimmed">
                      Extended TAT Time
                    </Text>
                    <Text size="xl" fw={700} c="blue.6">
                      {Math.floor(extendedTATTime) || 0} days
                    </Text>
                  </Flex>
                  <Popover position="left" withArrow shadow="md">
                    <Popover.Target>
                      <ThemeIcon 
                        variant="light" 
                        radius="md" 
                        size={20} 
                        color="yellow.6"
                        style={{ cursor: 'pointer' }}
                      >
                        <IconMessage size={20} />
                      </ThemeIcon>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <Text size="sm" style={{ maxWidth: '300px' }}>
                        {tatMessage}
                      </Text>
                    </Popover.Dropdown>
                  </Popover>
                </Group>
              </Group>
            </Card>
            
            <Space h="xs" />
            
            {/* Number of Packages */}
            <Card withBorder radius="md" p="5" bg="orange.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="orange.6">
                  <IconPackage size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Number of Packages
                  </Text>
                  <Text size="xl" fw={700} c="orange.6">
                    {noOfPackages || 0}
                  </Text>
                </Flex>
              </Group>
            </Card>
            
            <Space h="xs" />
            
            {/* Estimated Man Hours */}
            <Card withBorder radius="md" p="md" bg="gray.0">
              <Text size="sm" fw={500} c="dimmed" mb="md">
                Estimated Man Hours
              </Text>
              <Flex gap="md" direction="column">
                {Object.entries(estimatedManHrs || {})
                  .filter(([key, val]) => key !== "est")
                  .map(([key, value]: any) => {
                    // Determine color based on key
                    const color =
                      key === "min_mh"
                        ? "teal.6"
                        : key === "max_mh"
                          ? "blue.6"
                          : key === "avg_mh"
                            ? "green.6"
                            : "green.6";

                    // Format the label, replace "avg" with "Estimated"
                    const label = key.includes("avg")
                      ? "Estimated"
                      : key.charAt(0).toUpperCase() + key.slice(1);

                    return (
                      <Box key={key}>
                        <Group justify="space-between" mb={5}>
                          <Text fz="xs" fw={500}>
                            {label.replace("_mh", "")}
                          </Text>
                          <Text fz="sm" fw={600} c={color}>
                            {typeof value === "number"
                              ? value.toFixed(0)
                              : value}{" "}
                            Hrs
                          </Text>
                        </Group>
                        <Progress
                          color={color}
                          value={
                            typeof value === "number"
                              ? Math.min(value / 100, 100)
                              : 0
                          }
                          size="md"
                          radius="sm"
                        />
                      </Box>
                    );
                  })}
              </Flex>
            </Card>

            <Space h="xs" />
            
            {/* Unbillable Cost */}
            <Card withBorder radius="md" p="5" mb="sm" bg="gray.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="blue.6">
                  <IconSettingsDollar size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Unbillable Material Cost
                  </Text>
                  <Text size="xs" c="black">
                    {(cappingUnbilledCostType || "")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char: any) => char.toUpperCase()
                      )} - ($ {cappingSpareCost || 0})
                  </Text>
                  <Text size="lg" fw={600} c="blue.6">
                    ${cappingUnbilledCost?.toFixed(2) || 0}
                  </Text>
                </Flex>
              </Group>
              
              <Space h="sm" />
              
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="green.6">
                  <IconClockHour4 size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Unbillable Man Hours
                  </Text>
                  <Text size="xs" c="black">
                    {(capppingMhsType || "")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char: any) => char.toUpperCase()
                      )} - ({cappingManhrs || 0} hr)
                  </Text>
                  <Text size="lg" fw={600} c="green.6">
                    {Math.round(unbilledCapppingMhs)} hr
                  </Text>
                </Flex>
              </Group>
            </Card>
          </Card>
        </Grid.Col>

        {/* Center Section - Parts Table (6 columns width) */}
        <Grid.Col span={6}>
          <Card
            withBorder
            radius="md"
            p="md"
            h="100%"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <Title order={5} mb="md" size="sm" fw={500} c="dimmed">
              Estimated Parts
            </Title>
            <Box style={{ flex: 1, height: "500px" }}>
              <div
                className="ag-theme-alpine"
                style={{
                  width: "100%",
                  height: "100%",
                }}
              >
                <style>
                  {`
                      .ag-theme-alpine {
                        --ag-header-background-color: #f8f9fa;
                        --ag-odd-row-background-color: #ffffff;
                        --ag-even-row-background-color: #f9f9f9;
                        --ag-row-hover-color: #f1f3f5;
                        --ag-border-color: #e9ecef;
                        --ag-font-size: 13px;
                      }
                      
                      .ag-theme-alpine .ag-header-cell {
                        font-weight: 600;
                        color: #495057;
                      }
                      
                      .ag-theme-alpine .ag-row {
                        border-bottom: 1px solid var(--ag-border-color);
                      }
  
                      .ag-theme-alpine .ag-cell {
                        padding: 8px;
                      }
                    `}
                </style>
                <AgGridReact
                  rowData={parts || []}
                  domLayout="normal"
                  // defaultColDef={{
                  //   sortable: true,
                  //   resizable: true,
                  //   filter: true,
                  //   floatingFilter: true,

                  // }}
                  columnDefs={[
                    {
                      field: "partId",
                      headerName: "Part Number",
                      flex: 1.5,
                      minWidth: 120,
                      sortable: true,
                      resizable: true,
                      filter: true,
                      floatingFilter: true,
                    },
                    {
                      field: "desc",
                      headerName: "Description",
                      flex: 1.5,
                      minWidth: 120,
                      sortable: true,
                      resizable: true,
                      filter: true,
                      floatingFilter: true,
                    },
                    {
                      field: "qty",
                      headerName: "Qty",
                      flex: 0.8,
                      minWidth: 80,
                      filter: "agNumberColumnFilter",
                    },
                    {
                      field: "unit",
                      headerName: "Units",
                      flex: 0.8,
                      minWidth: 80,
                      cellRenderer: (val: any) => {
                        return (
                          <Text>
                            {val?.data?.unit === "nan" ? "Unknown" : val?.data?.unit}
                          </Text>
                        );
                      },
                    },
                    {
                      field: "price",
                      headerName: "Price ($)",
                      flex: 1,
                      minWidth: 90,
                      filter: "agNumberColumnFilter",
                      valueFormatter: (params) => {
                        if (params.value === null || params.value === undefined)
                          return "";
                        return `$${parseFloat(params.value).toFixed(2)}`;
                      },
                    },
                  ]}
                  pagination={true}
                  paginationPageSize={10}
                />
              </div>
            </Box>
          </Card>
        </Grid.Col>

        {/* Right Section - Chart (3 columns width) */}
        <Grid.Col span={3}>
          <Card withBorder radius="md" p="xs" h="100%">
            <Title order={5} m="xs" size="sm" fw={500} c="dimmed">
              Spare Cost Analysis
            </Title>
            {/* Estimated Spares Cost */}
            <Card withBorder radius="md" p="5" bg="blue.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="blue.6">
                  <MdOutlineMiscellaneousServices size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Estimated Spares Cost
                  </Text>
                  <Text size="xl" fw={700} c="blue.6">
                    ${estimatedSparesCost?.toFixed(2) || 0}
                  </Text>
                </Flex>
              </Group>
            </Card>
            <Space h='5' />
            <Card withBorder radius="md" p="md" bg="blue.0">
              {/* <Text size="sm" fw={500} c="dimmed" mb="md">
                  Spare Cost Trend
                </Text> */}
              <AreaChart
                h={380}
                data={
                  spareCostData || [
                    { date: "Min", Cost: 100 },
                    { date: "Estimated", Cost: 750 },
                    { date: "Max", Cost: 1000 },
                  ]
                }
                dataKey="date"
                series={[{ name: "Cost", color: "blue.9" }]}
                curveType="monotone"
                withGradient
                connectNulls
                gridAxis="y"
                withLegend={false}
                tooltipProps={{
                  content: ({ payload, label }) => {
                    if (payload && payload.length > 0) {
                      return (
                        <Card p="xs" withBorder>
                          <Text fw={500} size="sm">
                            {label}
                          </Text>
                          <Text size="sm">${payload[0].value}</Text>
                        </Card>
                      );
                    }
                    return null;
                  },
                }}
                yAxisProps={{
                  tickFormatter: (value) => `$${value}`,
                  domain: ["dataMin - 10", "dataMax + 10"],
                }}
              />
            </Card>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
};

const OverallMPDReport: React.FC<any> = ({
  TATTime,
  extendedTATTime,
  tatMessage,
  estimatedManHrs,
  cappingUnbilledCost,
  capppingMhsType,
  unbilledCapppingMhs,
  cappingManhrs,
  cappingSpareCost,
  cappingUnbilledCostType,
  parts,
  estimatedSparesCost,
  spareCostData,
  noOfPackages, // Added noOfPackages prop
}: any) => {
  return (
    <Box>
      {/* <Title order={4} mb="md" fw={500} c="dimmed">Overall Estimate Report</Title> */}
      <Grid gutter="xs">
        {/* Left Section - Estimate Overview */}
        <Grid.Col span={3}>
          <Card withBorder radius="md" p="xs" h="100%">
            {/* <Title order={5} mb="md" fw={500} c="dimmed">Estimate Overview</Title> */}
            
            {/* Total TAT Time */}
            <Card withBorder radius="md" p="5" bg="blue.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="blue.6">
                  <IconClock size={24} />
                </ThemeIcon>
                <Group justify="space-between" style={{ flex: 1 }}>
                  <Flex direction="column" align="flex-start">
                    <Text size="sm" fw={500} c="dimmed">
                      TAT Time
                    </Text>
                    <Text size="xl" fw={700} c="blue.6">
                      {Math.floor(TATTime) || 0} days
                    </Text>
                  </Flex>
                  <Flex direction="column" align="flex-start">
                    <Text size="sm" fw={500} c="dimmed">
                      Extended TAT Time
                    </Text>
                    <Text size="xl" fw={700} c="blue.6">
                      {Math.floor(extendedTATTime) || 0} days
                    </Text>
                  </Flex>
                  <Popover position="left" withArrow shadow="md">
                    <Popover.Target>
                      <ThemeIcon 
                        variant="light" 
                        radius="md" 
                        size={20} 
                        color="yellow.6"
                        style={{ cursor: 'pointer' }}
                      >
                        <IconMessage size={20} />
                      </ThemeIcon>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <Text size="sm" style={{ maxWidth: '300px' }}>
                        {tatMessage}
                      </Text>
                    </Popover.Dropdown>
                  </Popover>
                </Group>
              </Group>
            </Card>
            
            <Space h="xs" />
            
            {/* Number of Packages */}
            <Card withBorder radius="md" p="5" bg="orange.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="orange.6">
                  <IconPackage size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Number of Packages
                  </Text>
                  <Text size="xl" fw={700} c="orange.6">
                    {noOfPackages || 0}
                  </Text>
                </Flex>
              </Group>
            </Card>
            
            <Space h="xs" />
            
            {/* Estimated Man Hours */}
            <Card withBorder radius="md" p="md" bg="gray.0">
              <Text size="sm" fw={500} c="dimmed" mb="md">
                Estimated Man Hours
              </Text>
              <Flex gap="md" direction="column">
                {Object.entries(estimatedManHrs || {})
                  .filter(([key, val]) => key !== "est")
                  .map(([key, value]: any) => {
                    // Determine color based on key
                    const color =
                      key === "min_mh"
                        ? "teal.6"
                        : key === "max_mh"
                          ? "blue.6"
                          : key === "avg_mh"
                            ? "green.6"
                            : "green.6";

                    // Format the label, replace "avg" with "Estimated"
                    const label = key.includes("avg")
                      ? "Estimated"
                      : key.charAt(0).toUpperCase() + key.slice(1);

                    return (
                      <Box key={key}>
                        <Group justify="space-between" mb={5}>
                          <Text fz="xs" fw={500}>
                            {label.replace("_mh", "")}
                          </Text>
                          <Text fz="sm" fw={600} c={color}>
                            {typeof value === "number"
                              ? value.toFixed(0)
                              : value}{" "}
                            Hrs
                          </Text>
                        </Group>
                        <Progress
                          color={color}
                          value={
                            typeof value === "number"
                              ? Math.min(value / 100, 100)
                              : 0
                          }
                          size="md"
                          radius="sm"
                        />
                      </Box>
                    );
                  })}
              </Flex>
            </Card>
            
            <Space h="xs" />
            
            {/* Unbillable Cost */}
            <Card withBorder radius="md" p="5" mb="sm" bg="gray.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="blue.6">
                  <IconSettingsDollar size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Unbillable Material Cost
                  </Text>
                  <Text size="xs" c="black">
                    {(cappingUnbilledCostType || "")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char: any) => char.toUpperCase()
                      )} - ($ {cappingSpareCost || 0})
                  </Text>
                  <Text size="lg" fw={600} c="blue.6">
                    ${cappingUnbilledCost?.toFixed(2) || 0}
                  </Text>
                </Flex>
              </Group>
              
              <Space h="sm" />
              
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="green.6">
                  <IconClockHour4 size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Unbillable Man Hours
                  </Text>
                  <Text size="xs" c="black">
                    {(capppingMhsType || "")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char: any) => char.toUpperCase()
                      )} - ({cappingManhrs || 0} hr)
                  </Text>
                  <Text size="lg" fw={600} c="green.6">
                    {Math.round(unbilledCapppingMhs)} hr
                  </Text>
                </Flex>
              </Group>
            </Card>
          </Card>
        </Grid.Col>

        {/* Center Section - Parts Table (6 columns width) */}
        <Grid.Col span={6}>
          <Card
            withBorder
            radius="md"
            p="md"
            h="100%"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <Title order={5} mb="md" size="sm" fw={500} c="dimmed">
              Estimated Parts
            </Title>
            <Box style={{ flex: 1, height: "500px" }}>
              <div
                className="ag-theme-alpine"
                style={{
                  width: "100%",
                  height: "100%",
                }}
              >
                <style>
                  {`
                      .ag-theme-alpine {
                        --ag-header-background-color: #f8f9fa;
                        --ag-odd-row-background-color: #ffffff;
                        --ag-even-row-background-color: #f9f9f9;
                        --ag-row-hover-color: #f1f3f5;
                        --ag-border-color: #e9ecef;
                        --ag-font-size: 13px;
                      }
                      
                      .ag-theme-alpine .ag-header-cell {
                        font-weight: 600;
                        color: #495057;
                      }
                      
                      .ag-theme-alpine .ag-row {
                        border-bottom: 1px solid var(--ag-border-color);
                      }
  
                      .ag-theme-alpine .ag-cell {
                        padding: 8px;
                      }
                    `}
                </style>
                <AgGridReact
                  rowData={parts || []}
                  domLayout="normal"
                  // defaultColDef={{
                  //   sortable: true,
                  //   resizable: true,
                  //   filter: true,
                  //   floatingFilter: true,

                  // }}
                  columnDefs={[
                    {
                      field: "partId",
                      headerName: "Part Number",
                      flex: 1.5,
                      minWidth: 120,
                      sortable: true,
                      resizable: true,
                      filter: true,
                      floatingFilter: true,
                    },
                    {
                      field: "desc",
                      headerName: "Description",
                      flex: 1.5,
                      minWidth: 120,
                      sortable: true,
                      resizable: true,
                      filter: true,
                      floatingFilter: true,
                    },
                    {
                      field: "qty",
                      headerName: "Qty",
                      flex: 0.8,
                      minWidth: 80,
                      filter: "agNumberColumnFilter",
                    },
                    {
                      field: "unit",
                      headerName: "Units",
                      flex: 0.8,
                      minWidth: 80,
                      cellRenderer: (val: any) => {
                        return (
                          <Text>
                            {val?.data?.unit === "nan" ? "Unknown" : val?.data?.unit}
                          </Text>
                        );
                      },
                    },
                    {
                      field: "price",
                      headerName: "Price ($)",
                      flex: 1,
                      minWidth: 90,
                      filter: "agNumberColumnFilter",
                      valueFormatter: (params) => {
                        if (params.value === null || params.value === undefined)
                          return "";
                        return `$${parseFloat(params.value).toFixed(2)}`;
                      },
                    },
                  ]}
                  pagination={true}
                  paginationPageSize={10}
                />
              </div>
            </Box>
          </Card>
        </Grid.Col>

        {/* Right Section - Chart (3 columns width) */}
        <Grid.Col span={3}>
          <Card withBorder radius="md" p="xs" h="100%">
            <Title order={5} m="xs" size="sm" fw={500} c="dimmed">
              Spare Cost Analysis
            </Title>

            {/* Estimated Spares Cost */}
            <Card withBorder radius="md" p="5" bg="blue.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="blue.6">
                  <MdOutlineMiscellaneousServices size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    Estimated Spares Cost
                  </Text>
                  <Text size="xl" fw={700} c="blue.6">
                    ${estimatedSparesCost?.toFixed(2) || 0}
                  </Text>
                </Flex>
              </Group>
            </Card>
            <Space h='5' />
            <Card withBorder radius="md" p="md" bg="blue.0">
              {/* <Text size="sm" fw={500} c="dimmed" mb="md">
                  Spare Cost Trend
                </Text> */}
              <AreaChart
                h={380}
                data={
                  spareCostData || [
                    { date: "Min", Cost: 100 },
                    { date: "Estimated", Cost: 750 },
                    { date: "Max", Cost: 1000 },
                  ]
                }
                dataKey="date"
                series={[{ name: "Cost", color: "blue.9" }]}
                curveType="monotone"
                withGradient
                connectNulls
                gridAxis="y"
                withLegend={false}
                tooltipProps={{
                  content: ({ payload, label }) => {
                    if (payload && payload.length > 0) {
                      return (
                        <Card p="xs" withBorder>
                          <Text fw={500} size="sm">
                            {label}
                          </Text>
                          <Text size="sm">${payload[0].value}</Text>
                        </Card>
                      );
                    }
                    return null;
                  },
                }}
                yAxisProps={{
                  tickFormatter: (value) => `$${value}`,
                  domain: ["dataMin - 10", "dataMax + 10"],
                }}
              />
            </Card>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
};

const FindingsWiseSection: React.FC<FindingsWiseSectionProps> = ({
  findings,
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<any>(null);
  const [selectedFindingDetail, setSelectedFindingDetail] =
    useState<FindingDetail | null>(null);
  const [taskSearch, setTaskSearch] = useState<string>("");
  const [clusterSearch, setClusterSearch] = useState<string>("");
  const [tableOpened, setTableOpened] = useState(false);
  const [flattenedData, setFlattenedData] = useState([]);

  // Extract unique task IDs from findings
  const uniqueTaskIds = useMemo(() => {
    const taskIds = findings.map((finding) => finding.taskId);
    return [...new Set(taskIds)];
  }, [findings]);

  // Filter tasks based on search
  const filteredTasks = useMemo(() => {
    if (!taskSearch.trim()) return uniqueTaskIds;

    return uniqueTaskIds.filter((taskId) =>
      taskId.toLowerCase().includes(taskSearch.toLowerCase())
    );
  }, [uniqueTaskIds, taskSearch]);

  // Group tasks by the first special character
  //   const groupedTasks = useMemo(() => {
  //     return uniqueTaskIds.reduce((groups, taskId) => {
  //       const firstSpecialCharIndex = Math.min(
  //         taskId.indexOf("-") !== -1 ? taskId.indexOf("-") : Infinity,
  //         taskId.indexOf("/") !== -1 ? taskId.indexOf("/") : Infinity,
  //         taskId.indexOf(" ") !== -1 ? taskId.indexOf(" ") : Infinity,
  //         taskId.indexOf("+") !== -1 ? taskId.indexOf("+") : Infinity
  //       );

  //       const groupKey =
  //         firstSpecialCharIndex !== Infinity
  //           ? taskId.substring(0, firstSpecialCharIndex)
  //           : taskId;

  //       if (!groups[groupKey]) {
  //         groups[groupKey] = [];
  //       }

  //       groups[groupKey].push(taskId);
  //       return groups;
  //     }, {} as Record<string, string[]>);
  //   }, [uniqueTaskIds]);
  const groupedTasks = useMemo(() => {
    return uniqueTaskIds.reduce((groups, taskId) => {
      const trimmedId = taskId?.trim() || "";

      // Get the first two characters
      const firstTwo = trimmedId.slice(0, 2);

      let groupKey = "Unknown";

      if (/^[A-Za-z]{2}$/.test(firstTwo)) {
        groupKey = firstTwo.toUpperCase(); // Group by first two alphabets
      } else if (/^\d{2}$/.test(firstTwo)) {
        groupKey = firstTwo; // Group by first two digits
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      groups[groupKey].push(taskId);
      return groups;
    }, {} as Record<string, string[]>);
  }, [uniqueTaskIds]);

  // Filter tasks based on search
  const filteredGroups = useMemo(() => {
    if (!taskSearch.trim()) return groupedTasks;

    const filtered: Record<string, string[]> = {};

    Object.keys(groupedTasks).forEach((groupKey) => {
      const filteredTasks = groupedTasks[groupKey].filter((taskId) =>
        taskId.toLowerCase().includes(taskSearch.toLowerCase())
      );

      if (filteredTasks.length > 0) {
        filtered[groupKey] = filteredTasks;
      }
    });

    return filtered;
  }, [groupedTasks, taskSearch]);

  // Get all group keys for default opened accordions
  const defaultOpenValues = useMemo(() => {
    return Object.keys(filteredGroups);
  }, [filteredGroups]);

  // Get all clusters for the selected task with their probability values
  const getClustersForTask = useMemo(() => {
    if (!selectedTaskId) return [];

    // Find all findings with the selected taskId
    const relatedFindings = findings.filter((f) => f.taskId === selectedTaskId);
    if (relatedFindings.length === 0) return [];

    // Extract all clusters from all findings with this taskId along with their prob values
    const clusterMap: { cluster: string; prob: number }[] = [];

    relatedFindings.forEach((finding) => {
      finding.details.forEach((detail) => {
        if (
          detail.cluster &&
          !clusterMap.some((item) => item.cluster === detail.cluster)
        ) {
          clusterMap.push({
            cluster: detail.cluster,
            prob: detail.prob || 0, // Default to 0 if prob is not available
          });
        }
      });
    });

    // Sort the clusters by prob value in descending order
    return clusterMap.sort((a, b) => b.prob - a.prob);
  }, [findings, selectedTaskId]);

  // Filter clusters based on search
  const filteredClusters = useMemo(() => {
    if (!clusterSearch.trim()) return getClustersForTask;

    return getClustersForTask.filter((clusterItem) =>
      clusterItem.cluster.toLowerCase().includes(clusterSearch.toLowerCase())
    );
  }, [getClustersForTask, clusterSearch]);

  // Get finding detail for selected cluster
  const getSelectedFindingDetail = useMemo(() => {
    if (!selectedTaskId || !selectedCluster) return null;

    // Find the finding that contains the selected cluster
    for (const finding of findings) {
      if (finding.taskId === selectedTaskId) {
        for (const detail of finding.details) {
          if (detail.cluster === selectedCluster) {
            return detail;
          }
        }
      }
    }

    return null;
  }, [findings, selectedTaskId, selectedCluster]);

  // Important: Auto-select first task from first accordion on initial load
  useEffect(() => {
    if (Object.keys(filteredGroups).length > 0 && !selectedTaskId) {
      const firstGroupKey = Object.keys(filteredGroups)[0];
      const firstTaskId = filteredGroups[firstGroupKey][0];

      setSelectedTaskId(firstTaskId);
    }
  }, [filteredGroups, selectedTaskId]);

  // UPDATED: Auto-select highest probability cluster when task changes
  useEffect(() => {
    if (selectedTaskId) {
      // Get sorted clusters for this task (already sorted by prob in getClustersForTask)
      const sortedClusters = getClustersForTask;

      // If there are clusters available, select the one with highest probability (first in the sorted array)
      if (sortedClusters.length > 0) {
        const highestProbCluster = sortedClusters[0].cluster;
        setSelectedCluster(highestProbCluster);
      } else {
        // Reset if no clusters found
        setSelectedCluster(null);
        setSelectedFindingDetail(null);
      }
    }
  }, [selectedTaskId, getClustersForTask]);

  // Update selected finding detail when cluster changes
  useEffect(() => {
    setSelectedFindingDetail(getSelectedFindingDetail);
  }, [getSelectedFindingDetail]);

  // Format spare parts for display
  const formattedSpareParts = useMemo(() => {
    if (!selectedFindingDetail) return [];

    // Check if using spareParts or spare_parts field based on data structure
    const parts = selectedFindingDetail.spare_parts || [];

    return parts.map((part) => ({
      partId: part.partId,
      desc: part.desc,
      qty: part.qty || 1, // Default to 1 if not specified
      unit: part.unit,
      price: part.price || 0, // Default to 0 if not specified
      prob: part.prob || 0,
    }))?.sort((a: any, b: any) => b?.price - a?.price);
  }, [selectedFindingDetail]);

  // Flatten the data structure when findings change
  useEffect(() => {
    const flattened: any = [];

    findings.forEach((finding) => {
      finding.details.forEach((detail) => {
        if (detail.spare_parts && detail.spare_parts.length > 0) {
          detail.spare_parts.forEach((part) => {
            flattened.push({
              sourceTask: finding.taskId,
              description: detail.description,
              cluster_id: detail.cluster,
              taskDefectProbability: detail?.task_defect_probability,
              probability: detail.prob,
              mhsMin: Math.round(detail.mhs.min),
              mhsMax: Math.round(detail.mhs.max),
              mhsAvg: Math.round(detail.mhs.avg),
              mhsEst: Math.round(detail.mhs.est),
              partId: part.partId,
              partDesc: part.desc,
              unit: part.unit,
              qty: part.qty,
              price: part.price,
              prob: part.prob,
            });
          });
        } else {
          flattened.push({
            sourceTask: finding.taskId,
            description: detail.description,
            cluster_id: detail.cluster,
            taskDefectProbability: detail?.task_defect_probability,
            probability: detail.prob,
            mhsMin: Math.round(detail.mhs.min),
            mhsMax: Math.round(detail.mhs.max),
            mhsAvg: Math.round(detail.mhs.avg),
            mhsEst: Math.round(detail.mhs.est),
            partId: "-",
            partDesc: "-",
            unit: "-",
            qty: 0,
            price: 0,
            prob: 0,
          });
        }
      });
    });

    setFlattenedData(flattened);
  }, [findings]);

  // Column definitions for the table
  const columnDefs: ColDef[] = [
    {
      headerName: "Source Task",
      field: "sourceTask",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 200,
      pinned: "left",
    },
    {
      headerName: "Description",
      field: "description",
      filter: true,
      floatingFilter: true,
      resizable: true,
      width: 400,
    },
    {
      headerName: "Cluster ID",
      field: "cluster_id",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 280,
    },
    
    // taskDefectProbability :detail?.task_defect_probability,
    {
      headerName: "Task Defect Probability (%)",
      field: "taskDefectProbability",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 150,
      cellRenderer: (val: any) => {
        return <Text>{(val?.data?.taskDefectProbability || 0).toFixed(2)}</Text>;
      },
    },
    {
      headerName: "Defect Probability (%)",
      field: "probability",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Man Hours",
      field: "mhsMin",
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 300,
      cellRenderer: (val: any) => {
        return (
          <Flex direction="row" justify="space-between">
            <Badge variant="light" color="teal" fullWidth>
              Min : {val?.data?.mhsMin || "-"}
            </Badge>
            {/* <Badge variant="light" color="blue" fullWidth>
              Avg : {val?.data?.mhsAvg || "-"}
            </Badge> */}
            <Badge variant="light" color="blue" fullWidth>
              Est : {val?.data?.mhsEst || "-"}
            </Badge>
            <Badge variant="light" color="violet" fullWidth>
              Max : {val?.data?.mhsMax || "-"}
            </Badge>
          </Flex>
        );
      },
    },
    {
      headerName: "Part Number",
      field: "partId",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Part Description",
      field: "partDesc",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 200,
    },
    {
      headerName: "Quantity",
      field: "qty",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 200,
      cellRenderer: (val: any) => {
        return <Text>{val?.data?.qty?.toFixed(2) || "-"}</Text>;
      },
    },
    {
      headerName: "Unit",
      field: "unit",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 100,
      cellRenderer: (val: any) => {
        return (
          <Text>
            {val?.data?.unit === "nan" ? "Unknown" : val?.data?.unit}
          </Text>
        );
      },
    },
    {
      headerName: "Price ($)",
      field: "price",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 200,
      cellRenderer: (val: any) => {
        return <Text>{val?.data?.price?.toFixed(2) || "-"}</Text>;
      },
    },
    {
      headerName: "Part Probability (%)",
      field: "prob",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 200,
      cellRenderer: (val: any) => {
        return <Text>{val?.data?.prob?.toFixed(2) || "0"}</Text>;
      },
    },
  ];

  const downloadCSV = () => {
    if (!flattenedData || flattenedData.length === 0) {
      showNotification({
        title: "Export Failed",
        message: "No data available for export",
        color: "red",
      });
      return;
    }

    // Define CSV Headers (Column Titles)
    const csvHeaders = [
      "Source Task",
      "Description",
      "Cluster ID",
      "Probability",
      "MHS Min",
      "MHS Max",
      "MHS Avg",
      "MHS Est",
      "Part Number",
      "Part Description",
      "Quantity",
      "Unit",
      "Price",
      "Part Probability",
    ];

    // Function to escape CSV fields
    const escapeCSVField = (field: any) => {
      if (field === null || field === undefined) return "-"; // Handle null or undefined
      const stringField = String(field);
      // If the field contains a comma, double quote, or newline, wrap it in double quotes
      if (
        stringField.includes(",") ||
        stringField.includes('"') ||
        stringField.includes("\n")
      ) {
        return `"${stringField.replace(/"/g, '""')}"`; // Escape double quotes by doubling them
      }
      return stringField;
    };

    // Map ALL Flattened Data to CSV Format (not just visible rows)
    const csvData = flattenedData.map((task: any) => [
      escapeCSVField(task.sourceTask),
      escapeCSVField(task.description),
      escapeCSVField(task.cluster_id),
      escapeCSVField(task.probability),
      escapeCSVField(task.mhsMin),
      escapeCSVField(task.mhsMax),
      escapeCSVField(task.mhsAvg),
      escapeCSVField(task.mhsEst),
      escapeCSVField(task.partId),
      escapeCSVField(task.partDesc),
      escapeCSVField(task.qty),
      escapeCSVField(task.unit),
      escapeCSVField(task.price),
      escapeCSVField(task.prob),
    ]);

    // Convert array to CSV format
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        csvHeaders.map(escapeCSVField),
        ...csvData.map((row) => row.map(escapeCSVField)),
      ]
        .map((row) => row.join(","))
        .join("\n");

    // Create a download link and trigger click
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Findings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification({
      title: "Export Successful",
      message: `Exported ${flattenedData.length} records to CSV`,
      color: "green",
    });
  };

  // Add a new function for Excel export
  const downloadExcel = () => {
    if (!flattenedData || flattenedData.length === 0) {
      showNotification({
        title: "Export Failed",
        message: "No data available for export",
        color: "red",
      });
      return;
    }

    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();

      // Prepare data for Excel format
      const excelData = flattenedData.map((task: any) => ({
        "Source Task": task.sourceTask || "-",
        "Description": task.description || "-",
        "Cluster ID": task.cluster_id || "-",
        "Task Defect Probability": Number((task.taskDefectProbability || 0).toFixed(2)),
        "Defect Probability": task.probability || 0,
        "MHS Min": task.mhsMin || 0,
        "MHS Max": task.mhsMax || 0,
        // "MHS Avg": task.mhsAvg || 0,
        "MHS Est": task.mhsEst || 0,
        "Part Number": task.partId || "-",
        "Part Description": task.partDesc || "-",
        "Quantity": task.qty || 0,
        "Unit": task.unit || "-",
        "Price": task.price || 0,
        "Part Probability": task.prob || 0,
      }));

      // Convert to worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Findings");

      // Write and download
      XLSX.writeFile(wb, "Findings_Report.xlsx");

      showNotification({
        title: "Export Successful",
        message: `Exported ${flattenedData.length} records to Excel`,
        color: "green",
      });
    } catch (error) {
      console.error("Excel export failed:", error);
      showNotification({
        title: "Export Failed",
        message: "Failed to export to Excel. Falling back to CSV.",
        color: "orange",
      });

      // Fallback to CSV if Excel export fails
      // downloadCSV();
    }
  };

  const downloadExcelManhours = () => {
    const rows: any[] = [];

    findings?.forEach((task: any) => {
      task.details.forEach((detail: any) => {
        rows.push({
          TaskID: task.taskId,
          Description: detail.description.replace(/\\n/g, "\n"),
          ClusterID: detail.cluster,
          "MHS Min": Math.round(detail.mhs.min),
          "MHS Max": Math.round(detail.mhs.max),
          // "MHS Avg": Math.round(detail.mhs.avg),
          "MHS Est": Math.round(detail.mhs.est),
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

    XLSX.writeFile(workbook, "Findings_ManHours.xlsx");
  };

  // UPDATED: Function to handle task selection and auto-select highest probability cluster
  const handleTaskSelection = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  return (
    <>
      <Modal
        opened={tableOpened}
        onClose={() => {
          setTableOpened(false);
        }}
        size="100%"
        scrollAreaComponent={ScrollArea.Autosize}
        title={
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <Title order={4} c="white">
                Findings
              </Title>
              <Space w={50} />
              <Button color="green" size="xs" onClick={downloadExcel} ml="45vw">
                Download Report
              </Button>
              <Space w='xs' />
              <Button color="green" size="xs" onClick={downloadExcelManhours}>
                Download ManHours
              </Button>
            </div>
          </>
        }
        styles={{
          header: {
            backgroundColor: "#124076",
            padding: "12px",
          },
          close: {
            color: "white",
          },
        }}
      >
        <div
          className="ag-theme-alpine"
          style={{
            width: "100%",
            border: "none",
            height: "auto",
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
            rowData={flattenedData}
            columnDefs={columnDefs}
            pagination={true}
            paginationPageSize={10}
            domLayout="autoHeight"
          />
        </div>
      </Modal>

      <Card
        p={10}
        c="white"
        bg="#124076"
        onClick={() => {
          setTableOpened(true);
        }}
        style={{ cursor: "pointer" }}
      >
        <Title order={4}>Findings</Title>
      </Card>

      <Card withBorder p={0} h="80vh" bg="none">
        <Space h="xs" />
        <Grid h="100%">
          {/* Left Section: Grouped Task IDs List */}
          <Grid.Col span={3}>
            <Card h="100%" w="100%" p="md" bg="none">
              {/* Header Section */}
              <Group justify="space-between">
                <Text size="md" fw={500} c="dimmed">
                  Total Source Tasks
                </Text>
                <Text size="md" fw={500}>
                  {uniqueTaskIds.length}
                </Text>
              </Group>

              {/* Search Input */}
              <TextInput
                placeholder="Search tasks..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                mb="md"
                w="100%"
              />

              {/* Accordion Wrapper */}
              <Card bg="none" p={0} h="calc(80vh - 150px)" w="100%">
                <ScrollArea h="100%" scrollbarSize={4} w="100%">
                  <Accordion defaultValue={defaultOpenValues} multiple w="100%">
                    {Object.keys(filteredGroups).map((groupKey) => (
                      <Accordion.Item key={groupKey} value={groupKey} w="100%">
                        <Accordion.Control>
                          <Text fw={600} truncate>
                            {
                              groupKey === "ZL" ? "ZONAL TASK" : "ATA " + groupKey
                            }
                            {/* ATA {groupKey} */}
                          </Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Group gap="sm" w="100%" wrap="wrap">
                            {filteredGroups[groupKey].map((taskId, index) => (
                              <Badge
                                key={index}
                                variant={
                                  selectedTaskId === taskId ? "filled" : "light"
                                }
                                color="#4C7B8B"
                                h={35}
                                radius="md"
                                w="100%" // Ensure full width inside Accordion Panel
                                onClick={() => handleTaskSelection(taskId)}
                                style={{
                                  cursor: "pointer",
                                  textAlign: "center",
                                }}
                              >
                                <Text fw={500} truncate>
                                  {taskId}
                                </Text>
                              </Badge>
                            ))}
                          </Group>
                        </Accordion.Panel>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </ScrollArea>
              </Card>
            </Card>
          </Grid.Col>

          {/* Middle Section: All Unique Clusters for Selected Task - UPDATED WITH SORTING */}
          <Grid.Col span={3}>
            <Card h="100%" w="100%" p="md" bg="none">
              <Group>
                <Text size="md" fw={500} mb="xs" c="dimmed">
                  Defect Clusters for
                </Text>
                <Text size="md" fw={500} mb="xs">
                  {selectedTaskId || "Selected Task"}
                </Text>
              </Group>
              <TextInput
                placeholder="Search clusters..."
                value={clusterSearch}
                onChange={(e) => setClusterSearch(e.target.value)}
                mb="md"
              />

              {/* Scrollable Clusters List - Already sorted by prob in filteredClusters */}
              <Card
                bg="none"
                p={0}
                h="calc(80vh - 150px)"
                style={{
                  overflowY: "auto",
                  scrollbarWidth: "thin",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    overflowY: "auto",
                    scrollbarWidth: "thin",
                  }}
                >
                  {selectedTaskId ? (
                    filteredClusters.length > 0 ? (
                      filteredClusters.map((clusterItem, clusterIndex) => (
                        <Tooltip
                          key={clusterIndex}
                          label={clusterItem.cluster}
                        // label={`${clusterItem.cluster} (Probability: ${clusterItem.prob.toFixed(2)}%)`}
                        >
                          <Badge
                            fullWidth
                            variant={
                              selectedCluster === clusterItem.cluster
                                ? "filled"
                                : "light"
                            }
                            color="#4C7B8B"
                            size="lg"
                            mb="md"
                            h={35}
                            radius="md"
                            onClick={() =>
                              setSelectedCluster(clusterItem.cluster)
                            }
                            style={{ cursor: "pointer" }}
                          >
                            <Text fw={500}>{clusterItem.cluster}</Text>
                          </Badge>
                        </Tooltip>
                      ))
                    ) : (
                      <Text>No clusters found for this task.</Text>
                    )
                  ) : (
                    <Text>Select a task to view clusters.</Text>
                  )}
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
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Space h="lg" />
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  maxHeight: "calc(70vh - 50px)",
                }}
              >
                <Grid>
                  <Grid.Col span={3}>
                    <Text size="md" fw={500} c="dimmed">
                      Defect Cluster
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={7}>
                    <Text size="sm" fw={500}>
                      {selectedFindingDetail?.cluster || "-"}
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
                      {selectedFindingDetail?.description || "-"}
                    </Text>
                  </Grid.Col>
                </Grid>

                <Space h="lg" />
                {/* <Card shadow="0" bg="#f5f5f5">
                  <Grid grow justify="left" align="center">
                    <Grid.Col span={2}>
                      <Text size="md" fw={500} c="dimmed">
                        Probability
                      </Text>
                    </Grid.Col>
                    <Grid.Col span={8}>
                      <Progress
                        w="100%"
                        color="#E07B39"
                        radius="md"
                        size="lg"
                        value={selectedFindingDetail?.prob || 0}
                      />
                    </Grid.Col>
                    <Grid.Col span={2}>
                      <Text size="sm" fw={600} c="#E07B39">
                        {selectedFindingDetail?.prob || 0} %
                      </Text>
                    </Grid.Col>
                  </Grid>
                </Card> */}

                <Card key={selectedFindingDetail?.task_defect_probability} shadow="0" p="sm" radius='md' mt="xs" bg='#fcfafa'>
                  <Text size="sm" fw={500}>Probability</Text>

                  <Grid mt="xs">

                    <Grid.Col span={6}>
                      <Stack gap="xs">
                        <Group>
                          <Text fz="xs" fw={500}>
                            Task Defect Prob :
                          </Text>
                          <Text fz="xs" c="blue" fw={700}>
                            {selectedFindingDetail?.task_defect_probability?.toFixed(2)} %
                          </Text>
                        </Group>

                        <Progress
                          value={selectedFindingDetail?.task_defect_probability || 0}
                          color="blue"
                          radius="md"
                          size="lg"
                        />
                      </Stack>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Stack gap="xs">
                        <Group>
                          <Text fz="xs" fw={500}>
                            Defect Prob :
                          </Text>
                          <Text fz="xs" c="#E07B39" fw={700}>
                            {selectedFindingDetail?.prob?.toFixed(2) || 0} %
                          </Text>
                        </Group>


                        <Progress
                          value={selectedFindingDetail?.prob || 0}
                          color="#E07B39"
                          radius="md"
                          size="lg"
                        />
                      </Stack>
                    </Grid.Col>
                  </Grid>
                </Card>

                <Space h="lg" />

                <Text size="md" fw={500} c="dimmed">
                  Man Hours
                </Text>
                <SimpleGrid cols={3}>
                  <Card bg="#daf7de" shadow="0" radius="md">
                    <Group justify="space-between" align="start">
                      <Flex direction="column">
                        <Text fz="xs">Min</Text>
                        <Text fz="xl" fw={600}>
                          {selectedFindingDetail?.mhs?.min?.toFixed(0) || 0} Hr
                        </Text>
                      </Flex>
                      <IconClockDown color="green" size="25" />
                    </Group>
                  </Card>
                  <Card bg="#fcebeb" shadow="0" radius="md">
                    <Group justify="space-between" align="start">
                      <Flex direction="column">
                        <Text fz="xs">Max</Text>
                        <Text fz="xl" fw={600}>
                          {selectedFindingDetail?.mhs?.max?.toFixed(0) || 0} Hr
                        </Text>
                      </Flex>
                      <IconClockUp color="red" size="25" />
                    </Group>
                  </Card>
                  {/* <Card bg='#f3f7da' shadow="0" radius='md'>
                                        <Group justify="space-between" align="start">
                                            <Flex direction='column'>
                                                <Text fz='xs'>Avg</Text>
                                                <Text fz='xl' fw={600}>{selectedFindingDetail?.mhs?.avg?.toFixed(0) || 0} Hr</Text>
                                            </Flex>
                                            <IconClockCode color="orange" size='25' />
                                        </Group>
                                    </Card> */}
                  <Card bg="#dae8f7" shadow="0" radius="md">
                    <Group justify="space-between" align="start">
                      <Flex direction="column">
                        <Text fz="xs">Estimated</Text>
                        <Text fz="xl" fw={600}>
                          {selectedFindingDetail?.mhs?.avg?.toFixed(0) || 0} Hr
                        </Text>
                      </Flex>
                      <IconClockCheck color="indigo" size="25" />
                    </Group>
                  </Card>
                </SimpleGrid>

                <Space h="lg" />

                <Text size="md" fw={500} c="dimmed">
                  Skills
                </Text>

                <SimpleGrid cols={8}>
                  {(() => {
                    const skills = Array.isArray(selectedFindingDetail?.skill) ? selectedFindingDetail?.skill : [];

                    const validSkillsSet = new Set<string>();
                    let hasUnknownSkill = false;

                    for (const skl of skills) {
                      const trimmed = skl?.toString().trim();

                      if (
                        !trimmed || // handles empty, null, undefined
                        trimmed.toLowerCase() === "nan"
                      ) {
                        hasUnknownSkill = true;
                      } else {
                        validSkillsSet.add(trimmed);
                      }
                    }

                    const validSkills = Array.from(validSkillsSet);

                    return (
                      <>
                        {validSkills.map((skill, index) => (
                          <Badge key={index} fullWidth color="cyan" size="lg" radius="md">
                            {skill}
                          </Badge>
                        ))}
                        {hasUnknownSkill && (
                          <Badge fullWidth color="gray" size="lg" radius="md">
                            Unknown Skill
                          </Badge>
                        )}
                      </>
                    );
                  })()}
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
                    paginationPageSize={6}
                    domLayout="autoHeight" // Ensures height adjusts dynamically
                    rowData={formattedSpareParts}
                    columnDefs={[
                      {
                        field: "partId",
                        headerName: "Part Number",
                        sortable: true,
                        filter: true,
                        floatingFilter: true,
                        resizable: true,
                        flex: 1,
                        cellRenderer: (val: any) => {
                          return (
                            <Text>
                              {val?.data?.partId || 0}
                            </Text>
                          );
                        },
                      },
                      {
                        field: "desc",
                        headerName: "Description",
                        sortable: true,
                        filter: true,
                        // floatingFilter: true,
                        resizable: true,
                        flex: 1,
                        cellRenderer: (val: any) => {
                          return (
                            <Text>
                              {val?.data?.desc || 0}
                            </Text>
                          );
                        },
                      },
                      {
                        field: "qty",
                        headerName: "Qty",
                        sortable: true,
                        resizable: true,
                        flex: 1,
                        cellRenderer: (val: any) => {
                          return (
                            <>
                              <Text>{Math.round(val?.data?.qty) || "-"}</Text>
                            </>
                          );
                        },
                      },
                      {
                        field: "unit",
                        headerName: "Unit",
                        sortable: true,
                        resizable: true,
                        flex: 1,
                        cellRenderer: (val: any) => {
                          return (
                            <Text>
                              {val?.data?.unit === "nan" ? "Unknown" : val?.data?.unit}
                            </Text>
                          );
                        },
                      },
                      {
                        field: "price",
                        headerName: "Price($)",
                        sortable: true,
                        resizable: true,
                        flex: 1,
                        cellRenderer: (val: any) => {
                          return (
                            <>
                              <Text>{val?.data?.price?.toFixed(2) || 0}</Text>
                            </>
                          );
                        },
                      },
                      {
                        field: "prob",
                        headerName: "Prob(%)",
                        sortable: true,
                        resizable: true,
                        flex: 1,
                        cellRenderer: (val: any) => {
                          return (
                            <>
                              <Text>{val?.data?.prob ? val.data.prob : 0}</Text>
                            </>
                          );
                        },
                      },
                    ]}
                  />
                </div>
              </div>
            </Card>
          </Grid.Col>
        </Grid>
      </Card>
    </>
  );
};

const PreloadWiseSection: React.FC<{ tasks: any[] }> = ({ tasks }) => {
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskSearch, setTaskSearch] = useState<string>("");
  const [tableOpened, setTableOpened] = useState(false);
  const [flattenedData, setFlattenedData] = useState([]);
  // Filter tasks based on search query
  const filteredTasks = tasks?.filter((task) =>
    task.sourceTask.toLowerCase().includes(taskSearch.toLowerCase())
  );

  const groupedTasks = useMemo(() => {
    if (!tasks) return {};

    return tasks.reduce((groups, task) => {
      const taskId = task.sourceTask?.trim() || "";

      // Extract the first two non-space characters
      const firstTwo = taskId.slice(0, 2);

      let groupKey = "Unknown";

      if (/^[A-Za-z]{2}$/.test(firstTwo)) {
        // Group by first two alphabets
        groupKey = firstTwo.toUpperCase();
      } else if (/^\d{2}$/.test(firstTwo)) {
        // Group by first two digits
        groupKey = firstTwo;
      }

      // Initialize group if not already
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      // Add task to group
      groups[groupKey].push(task);

      return groups;
    }, {});
  }, [tasks]);

  //   const groupedTasks = useMemo(() => {
  //     if (!tasks) return {};

  //     return tasks.reduce((groups, task) => {
  //       // Extract the task ID
  //       const taskId = task.sourceTask;

  //       // Find the first hyphen, first slash, and first space
  //       const firstHyphenIndex = taskId.indexOf("-");
  //       const firstSlashIndex = taskId.indexOf("/");
  //       const firstSpaceIndex = taskId.indexOf(" ");
  //       const firstPlusIndex = taskId.indexOf("+");

  //       // Determine the end index for the group key
  //       const endIndex = Math.min(
  //         firstHyphenIndex !== -1 ? firstHyphenIndex : Infinity,
  //         firstSlashIndex !== -1 ? firstSlashIndex : Infinity,
  //         firstSpaceIndex !== -1 ? firstSpaceIndex : Infinity,
  //         firstPlusIndex !== -1 ? firstPlusIndex : Infinity
  //       );

  //       // If no delimiters are found, use the entire taskId
  //       const groupKey =
  //         endIndex !== Infinity ? taskId.substring(0, endIndex) : taskId;

  //       // Initialize the group if it doesn't exist
  //       if (!groups[groupKey]) {
  //         groups[groupKey] = [];
  //       }

  //       // Add the task to the appropriate group
  //       groups[groupKey].push(task);
  //       return groups;
  //     }, {});
  //   }, [tasks]);

  // Filter tasks based on search


  const filteredGroups = useMemo(() => {
    if (!taskSearch.trim()) return groupedTasks;

    const filtered: any = {};

    Object.keys(groupedTasks).forEach((groupKey) => {
      const filteredTasks = groupedTasks[groupKey]?.filter((task: any) =>
        task.sourceTask.toLowerCase().includes(taskSearch.toLowerCase())
      );

      if (filteredTasks.length > 0) {
        filtered[groupKey] = filteredTasks;
      }
    });

    return filtered;
  }, [groupedTasks, taskSearch]);

  // Get all group keys for default opened accordions
  const defaultOpenValues = useMemo(() => {
    return Object.keys(filteredGroups);
  }, [filteredGroups]);

  useEffect(() => {
    if (!selectedTask && Object.keys(filteredGroups).length > 0) {
      const firstGroupKey = Object.keys(filteredGroups)[0];
      const firstTask = filteredGroups[firstGroupKey]?.[0];

      if (firstTask) {
        setSelectedTask(firstTask);
      }
    }
  }, [filteredGroups, selectedTask]);

  // Flatten the data structure when tasks change
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    const flattened: any = [];

    tasks.forEach((task) => {
      // If task has spare parts, create a row for each spare part
      if (task.spare_parts && task.spare_parts.length > 0) {
        task.spare_parts.forEach((part: any) => {
          flattened.push({
            sourceTask: task.sourceTask,
            description: task.description,
            cluster_id: task.cluster_id,
            mhsMin: Math.round(task.mhs.min),
            mhsMax: Math.round(task.mhs.max),
            mhsAvg: Math.round(task.mhs.avg),
            mhsEst: Math.round(task.mhs.est),
            // skill: Array.isArray(task.skill)
            // ? task.skill.join(", ")
            // : task.skill,
            partId: part.partId,
            partDesc: part.desc,
            qty: part.qty,
            unit: part.unit,
            price: part.price,
          });
        });
      } else {
        // If task has no spare parts, create a single row with task data only
        flattened.push({
          sourceTask: task.sourceTask,
          description: task.description,
          cluster_id: task.cluster_id,
          mhsMin: Math.round(task.mhs.min),
          mhsMax: Math.round(task.mhs.max),
          mhsAvg: Math.round(task.mhs.avg),
          mhsEst: Math.round(task.mhs.est),
          // skill: Array.isArray(task.skill)
          //   ? task.skill.join(", ")
          //   : task.skill,
          partId: "-",
          partDesc: "-",
          qty: 0,
          unit: "-",
          price: 0,
        });
      }
    });

    setFlattenedData(flattened);
  }, [tasks]);

  // Column definitions for the table
  const columnDefs: ColDef[] = [
    {
      headerName: "Source Task",
      field: "sourceTask",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      width: 150,
      // flex: 2,
      pinned: "left",
    },
    {
      headerName: "Description",
      field: "description",
      filter: true,
      floatingFilter: true,
      resizable: true,
      width: 400,
      // flex: 4,
      // pinned: 'left'
    },
    // {
    //     headerName: 'Cluster ID',
    //     field: 'cluster_id',
    //     filter: true,
    //     sortable: true,
    //     floatingFilter: true,
    //     resizable: true,
    //     width: 100
    //     // flex: 1,
    //     // pinned:'left'
    // },

    {
      headerName: "Man Hours",
      field: "mhsMin",
      // filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      // flex: 4,
      width: 300,
      cellRenderer: (val: any) => {
        return (
          <Flex direction="row" justify="space-between">
            <Badge variant="light" color="teal" fullWidth>
              Min : {val?.data?.mhsMin || "-"}
            </Badge>
            {/* <Badge variant="light" color="blue" fullWidth>
              Avg : {Math.round(val?.data?.mhsAvg) || "-"}
            </Badge> */}
            <Badge variant="light" color="blue" fullWidth>
              Est : {val?.data?.mhsEst || "-"}
            </Badge>
            <Badge variant="light" color="violet" fullWidth>
              Max : {val?.data?.mhsMax || "-"}
            </Badge>
          </Flex>
        );
      },
    },
    // {
    //   headerName: "Skill",
    //   field: "skill",
    //   filter: true,
    //   sortable: true,
    //   floatingFilter: true,
    //   resizable: true,
    //   width: 150,
    //   // flex: 2,
    //   pinned: "left",
    // },
    {
      headerName: "Part Number",
      field: "partId",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      // flex: 1
    },
    {
      headerName: "Part Description",
      field: "partDesc",
      filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      // flex: 1
    },
    {
      headerName: "Quantity",
      field: "qty",
      // filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      // flex: 1
      width: 150,
      cellRenderer: (val: any) => {
        return <Text>{Math.round(val?.data?.qty) || "-"}</Text>;
      },
    },
    {
      headerName: "Unit",
      field: "unit",
      // filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      // flex: 1
      width: 150,
      cellRenderer: (val: any) => {
        return (
          <Text>
            {val?.data?.unit === "nan" ? "Unknown" : val?.data?.unit}
          </Text>
        );
      },
    },
    {
      headerName: "Price ($)",
      field: "price",
      // filter: true,
      sortable: true,
      floatingFilter: true,
      resizable: true,
      // flex: 1
      width: 150,
      cellRenderer: (val: any) => {
        return <Text>{val?.data?.price?.toFixed(2) || "-"}</Text>;
      },
    },
  ];

  const downloadCSV = () => {
    if (!flattenedData || flattenedData.length === 0) {
      console.warn("No data available for CSV export");
      return;
    }

    // Define CSV Headers (Column Titles)
    const csvHeaders = [
      "Source Task",
      "Description",
      // "Cluster ID",
      "MHS Min",
      "MHS Max",
      "MHS Avg",
      "MHS Est",
      "Part ID",
      "Part Description",
      "Quantity",
      "Unit",
      "Price",
    ];

    // Function to escape CSV fields
    const escapeCSVField = (field: any) => {
      if (field === null || field === undefined) return "-"; // Handle null or undefined
      const stringField = String(field);
      // If the field contains a comma, double quote, or newline, wrap it in double quotes
      if (
        stringField.includes(",") ||
        stringField.includes('"') ||
        stringField.includes("\n")
      ) {
        return `"${stringField.replace(/"/g, '""')}"`; // Escape double quotes by doubling them
      }
      return stringField;
    };

    // Map Flattened Data to CSV Format
    const csvData = flattenedData.map((task: any) => [
      escapeCSVField(task.sourceTask),
      escapeCSVField(task.description),
      // escapeCSVField(task.cluster_id),
      escapeCSVField(task.mhsMin),
      escapeCSVField(task.mhsMax),
      escapeCSVField(task.mhsAvg),
      escapeCSVField(task.mhsEst),
      escapeCSVField(task.partId),
      escapeCSVField(task.partDesc),
      escapeCSVField(task.qty),
      escapeCSVField(task.unit),
      escapeCSVField(task.price),
    ]);

    // Convert array to CSV format
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        csvHeaders.map(escapeCSVField),
        ...csvData.map((row) => row.map(escapeCSVField)),
      ]
        .map((row) => row.join(","))
        .join("\n");

    // Create a download link and trigger click
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MPD_Tasks.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcel = () => {
    if (!flattenedData || flattenedData.length === 0) {
      console.warn("No data available for Excel export");
      return;
    }

    // Define Excel Headers (Column Titles)
    const excelHeaders = [
      "Source Task",
      "Description",
      "MHS Min",
      "MHS Max",
      // "MHS Avg",
      "MHS Est",
      // "Skill",
      "Part ID",
      "Part Description",
      "Quantity",
      "Unit",
      "Price",
    ];

    // Function to process and clean data
    const processField = (field: any) =>
      field === null || field === undefined ? "-" : field;

    // Map Flattened Data to Excel Format
    const excelData = flattenedData.map((task: any) => ({
      "Source Task": processField(task.sourceTask),
      Description: processField(task.description),
      "MHS Min": processField(task.mhsMin),
      "MHS Max": processField(task.mhsMax),
      // "MHS Avg": processField(task.mhsAvg),
      "MHS Est": processField(task.mhsEst),
      // "Skill": Array.isArray(task.skill)
      // ? task.skill.join(", ")
      // : processField(task.skill),
      "Part ID": processField(task.partId),
      "Part Description": processField(task.partDesc),
      Quantity: processField(task.qty),
      Unit: processField(task.unit),
      Price: processField(task.price),
    }));

    // Create a new Workbook and Worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData, {
      header: excelHeaders,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MPD_Tasks");

    // Write the file and trigger download
    XLSX.writeFile(workbook, "MPD_Report.xlsx");
  };

  const downloadExcelManhours = () => {
    const rows: any[] = [];

    tasks?.forEach((detail: any) => {
      rows.push({
        TaskID: detail.sourceTask,
        Description: detail.description.replace(/\\n/g, "\n"),
        "MHS Min": Math.round(detail.mhs.min),
        "MHS Max": Math.round(detail.mhs.max),
        // "MHS Avg": Math.round(detail.mhs.avg),
        "MHS Est": Math.round(detail.mhs.est),
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

    XLSX.writeFile(workbook, "MPD_ManHours.xlsx");
  };

  return (
    <>
      <Modal
        opened={tableOpened}
        onClose={() => {
          setTableOpened(false);
          //   form.reset();
        }}
        size="100%"
        scrollAreaComponent={ScrollArea.Autosize}
        title={
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <Title order={4} c="white">
                MPD
              </Title>
              <Space w={30} />
              <Text c="white">Total Source Tasks - {tasks?.length}</Text>
              {/* <Space w={600}/> */}
              {/* Button aligned to the end */}
              <Button color="green" size="xs" onClick={downloadExcel} ml="40vw">
                Download Report
              </Button>
              <Space w='xs' />
              <Button color="green" size="xs" onClick={downloadExcelManhours} >
                Download Manhours
              </Button>
            </div>
          </>
        }
        styles={{
          header: {
            backgroundColor: "#124076", // Set header background color
            padding: "12px",
          },
          close: {
            color: "white",
          },
        }}
      >
        <div
          className="ag-theme-alpine"
          style={{
            width: "100%",
            border: "none",
            height: "auto",
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
            rowData={flattenedData}
            columnDefs={columnDefs}
            pagination={true}
            paginationPageSize={10}
            domLayout="autoHeight"
          // defaultColDef={{
          //   sortable: true,
          //   filter: true,
          //   resizable: true,
          //   minWidth: 100,
          //   flex: 1
          // }}
          />
        </div>
      </Modal>
      <Card withBorder p={0} h="90vh" bg="none">
        <Card
          p={10}
          c="white"
          bg="#124076"
          onClick={(values: any) => {
            setTableOpened(true);
          }}
          style={{ cursor: "pointer" }}
        >
          <Title order={4}>MPD</Title>
        </Card>
        <Card withBorder p={0} h="80vh" bg="none">
          <Space h="xs" />
          <Grid h="100%">
            {/* Left Section: Tasks List with Tree Structure */}
            <Grid.Col span={3}>
              <Card h="100%" w="100%" p="md" bg="none">
                {/* Header Section */}
                <Group justify="space-between">
                  <Text size="md" fw={500} c="dimmed">
                    Total Source Tasks
                  </Text>
                  <Text size="md" fw={500}>
                    {tasks?.length}
                  </Text>
                </Group>

                {/* Search Input */}
                <TextInput
                  placeholder="Search tasks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  mb="md"
                  w="100%"
                />

                {/* Accordion Wrapper */}
                <Card bg="none" p={0} h="calc(80vh - 150px)" w="100%">
                  <ScrollArea h="100%" scrollbarSize={4} w="100%">
                    <Accordion
                      defaultValue={defaultOpenValues}
                      multiple
                      w="100%"
                    >
                      {Object.keys(filteredGroups).map((groupKey) => (
                        <Accordion.Item
                          key={groupKey}
                          value={groupKey}
                          w="100%"
                        >
                          <Accordion.Control>
                            <Text fw={600} truncate>
                              {
                                groupKey === "ZL" ? "ZONAL TASK" : "ATA " + groupKey
                              }
                              {/* ATA {groupKey} */}
                            </Text>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Group gap="sm" w="100%" wrap="wrap">
                              {filteredGroups[groupKey]?.map(
                                (task: any, taskIndex: any) => (
                                  <Badge
                                    key={taskIndex}
                                    variant={
                                      selectedTask?.sourceTask ===
                                        task.sourceTask
                                        ? "filled"
                                        : "light"
                                    }
                                    color="#4C7B8B"
                                    h={35}
                                    radius="md"
                                    w="100%" // Ensure full width inside Accordion Panel
                                    onClick={() => setSelectedTask(task)}
                                    style={{
                                      cursor: "pointer",
                                      textAlign: "center",
                                    }}
                                  >
                                    <Text fw={500} truncate>
                                      {task?.sourceTask}
                                    </Text>
                                  </Badge>
                                )
                              )}
                            </Group>
                          </Accordion.Panel>
                        </Accordion.Item>
                      ))}
                    </Accordion>
                  </ScrollArea>
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
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    scrollbarWidth: "none",
                    maxHeight: "calc(70vh - 50px)",
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

                      {/* <Space h="sm" />
                                            <Grid>
                                                <Grid.Col span={2}>
                                                    <Text size="md" fw={500} c="dimmed">
                                                        Cluster Id
                                                    </Text>
                                                </Grid.Col>
                                                <Grid.Col span={10}>
                                                    <Text size="sm" fw={500}>
                                                        {selectedTask?.cluster_id || "-"}
                                                    </Text>
                                                </Grid.Col>
                                            </Grid> */}
                      <Space h="lg" />
                      <Text size="md" fw={500} c="dimmed">
                        Man Hours
                      </Text>
                      <SimpleGrid cols={3}>
                        <Card bg="#daf7de" shadow="0" radius="md">
                          <Group justify="space-between" align="start">
                            <Flex direction="column">
                              <Text fz="xs">Min</Text>
                              <Text fz="xl" fw={600}>
                                {selectedTask?.mhs?.min?.toFixed(0) || 0} Hr
                              </Text>
                            </Flex>
                            <IconClockDown color="green" size="25" />
                          </Group>
                        </Card>
                        <Card bg="#fcebeb" shadow="0" radius="md">
                          <Group justify="space-between" align="start">
                            <Flex direction="column">
                              <Text fz="xs">Max</Text>
                              <Text fz="xl" fw={600}>
                                {selectedTask?.mhs?.max?.toFixed(0) || 0} Hr
                              </Text>
                            </Flex>
                            <IconClockUp color="red" size="25" />
                          </Group>
                        </Card>
                        {/* <Card bg='#f3f7da' shadow="0" radius='md'>
                                                    <Group justify="space-between" align="start">
                                                        <Flex direction='column'>
                                                            <Text fz='xs'>Average</Text>
                                                            <Text fz='xl' fw={600}>{selectedTask?.mhs?.avg?.toFixed(0) || 0} Hr</Text>
                                                        </Flex>
                                                        <IconClockCode color="orange" size='25' />
                                                    </Group>
                                                </Card> */}
                        <Card bg="#dae8f7" shadow="0" radius="md">
                          <Group justify="space-between" align="start">
                            <Flex direction="column">
                              <Text fz="xs">Estimated</Text>
                              <Text fz="xl" fw={600}>
                                {selectedTask?.mhs?.avg?.toFixed(0) || 0} Hr
                              </Text>
                            </Flex>
                            <IconClockCheck color="indigo" size="25" />
                          </Group>
                        </Card>
                      </SimpleGrid>
                      <Space h="lg" />

                      <Text size="md" fw={500} c="dimmed">
                        Skills
                      </Text>

                      <SimpleGrid cols={8}>
                        {(() => {
                          const skills = Array.isArray(selectedTask?.skill) ? selectedTask.skill : [];

                          const validSkillsSet = new Set<string>();
                          let hasUnknownSkill = false;

                          for (const skl of skills) {
                            const trimmed = skl?.toString().trim();

                            if (
                              !trimmed || // handles empty, null, undefined
                              trimmed.toLowerCase() === "nan"
                            ) {
                              hasUnknownSkill = true;
                            } else {
                              validSkillsSet.add(trimmed);
                            }
                          }

                          const validSkills = Array.from(validSkillsSet);

                          return (
                            <>
                              {validSkills.map((skill, index) => (
                                <Badge key={index} fullWidth color="cyan" size="lg" radius="md">
                                  {skill}
                                </Badge>
                              ))}
                              {hasUnknownSkill && (
                                <Badge fullWidth color="gray" size="lg" radius="md">
                                  Unknown Skill
                                </Badge>
                              )}
                            </>
                          );
                        })()}
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
                          paginationPageSize={6}
                          domLayout="autoHeight" // Ensures height adjusts dynamically
                          rowData={selectedTask?.spare_parts?.sort((a: any, b: any) => b?.price - a?.price) || []}
                          columnDefs={[
                            {
                              field: "partId",
                              headerName: "Part Number",
                              sortable: true,
                              filter: true,
                              floatingFilter: true,
                              resizable: true,
                              flex: 1,
                              cellRenderer: (val: any) => {
                                return (
                                  <Text>
                                    {val?.data?.partId || 0}
                                  </Text>
                                );
                              },
                            },
                            {
                              field: "desc",
                              headerName:
                                "Description                                                            ",
                              sortable: true,
                              filter: true,
                              floatingFilter: true,
                              resizable: true,
                              flex: 1,
                              cellRenderer: (val: any) => {
                                return (
                                  <Text>
                                    {val?.data?.desc || 0}
                                  </Text>
                                );
                              },
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
                                  <Text>{val?.data?.qty?.toFixed(2) || 0}</Text>
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
                              flex: 1,
                              cellRenderer: (val: any) => {
                                return (
                                  <Text>
                                    {val?.data?.unit === "nan" ? "Unknown" : val?.data?.unit}
                                  </Text>
                                );
                              },
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
                                    {val?.data?.price?.toFixed(2) || 0}
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
    </>
  );
};

{/* <Group
                justify="space-between"
                onClick={() => setExpanded(!expanded)}
                style={{ cursor: "pointer" }}
              >
                <Text size="md" fw={500}>
                  Input Parameters
                </Text>
                <Group>
                  {expanded ? (
                    <IconChevronUp color="gray" />
                  ) : (
                    <IconChevronDown color="gray" />
                  )}
                </Group>
              </Group>

              {expanded && (
                <ScrollArea
                  scrollbarSize={0}
                  offsetScrollbars
                  scrollHideDelay={1}
                  style={{ height: "60vh" }}
                >
                  <SimpleGrid cols={1} spacing="xs">
                    {fields.map((field) => (
                      <Grid key={field.name} align="center">
                        <Grid.Col span={8}>
                          <Text>{field.label}</Text>
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <Checkbox
                            checked={selectedFields.includes(field.name)}
                            onChange={() => toggleFieldSelection(field.name)}
                          />
                        </Grid.Col>
                      </Grid>
                    ))}
                  </SimpleGrid>
                  <Group justify="center">
                    <Button
                      variant="light"
                      mt="sm"
                      onClick={() => {
                        setShowFields([...selectedFields]);
                        setExpanded(false); // Collapse the accordion after showing inputs
                      }}
                    >
                      Show Inputs
                    </Button>
                  </Group>
                </ScrollArea>
              )} */}

{/* <Card withBorder h='60vh' radius='md'>
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
                            // scrollbarSize={5}
                            >
                                <SimpleGrid cols={1} spacing='xs'>
                                    <SimpleGrid cols={2}>
                                        <NumberInput
                                            size="xs"
                                            leftSection={<IconPercentage66 size={20} />}
                                            placeholder="Ex: 0.5"
                                            label="Select Probability"
                                            defaultValue={50}
                                            min={10}
                                            max={100}
                                            step={10}
                                            //   precision={2}
                                            {...form.getInputProps("probability")}
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
                                            leftSection={<IconPlaneTilt size='20' />}
                                            placeholder="Indigo, AirIndia"
                                            label="Operator"
                                            {...form.getInputProps("operator")}
                                        />
                                        <TextInput
                                            ref={aircraftRegNoRef}
                                            size="xs"
                                            leftSection={<IconPlaneTilt size='20' />}
                                            placeholder="Ex:N734AB, SP-LR"
                                            label="Aircraft Reg No"
                                            {...form.getInputProps("aircraftRegNo")}
                                        />
                                        <Select
                                            size="xs"
                                            // width='12vw' 
                                            searchable
                                            label='Check Type'
                                            placeholder="Check Type"
                                            data={['EOL', 'C CHECK', 'NON C CHECK', '18Y CHECK', '12Y CHECK', '6Y CHECK']}
                                            // value={task.typeOfCheck}
                                            // onChange={(value) => handleTaskChange(index, 'typeOfCheck', value)}
                                            {...form.getInputProps("typeOfCheck")}
                                        />
                                        <TextInput
                                            size="xs"
                                            leftSection={<IconRecycle size={20} />}
                                            placeholder="Ex:50"
                                            label="Flight Cycles"
                                            {...form.getInputProps("aircraftFlightCycles")}
                                        />
                                        <TextInput
                                            size="xs"
                                            leftSection={<IconHourglass size={20} />}
                                            placeholder="Ex:50"
                                            label="Flight Hours"
                                            {...form.getInputProps("aircraftFlightHours")}
                                        />

                                        <TextInput
                                            size="xs"
                                            leftSection={<IconShadow size={20} />}
                                            placeholder="Ex: Area"
                                            label="Area of Operations"
                                            {...form.getInputProps("areaOfOperations")}
                                        />
                                        <MultiSelect
                                            size="xs"
                                            label="Expert Insights"
                                            placeholder="Select from Insights"
                                            data={expertInsightsTasks?.map(task => ({ value: task.taskID, label: task.taskID }))}
                                            value={selectedExpertInsightsTaskIDs}
                                            onChange={handleExpertInsightsChange}
                                            style={(theme) => ({
                                                // Customize the selected badge styles
                                                selected: {
                                                    backgroundColor: theme.colors.green[6], // Change this to your desired color
                                                    color: theme.white, // Change text color if needed
                                                },
                                            })}
                                        />

                                    </SimpleGrid>


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
                                                {...form.getInputProps("cappingDetails.cappingTypeManhrs")}
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={5}>
                                            <TextInput
                                                size="xs"
                                                leftSection={<IconClockHour4 size={20} />}
                                                placeholder="Ex: 40"
                                                label="Man Hours"
                                                {...form.getInputProps("cappingDetails.cappingManhrs")}
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
                                                {...form.getInputProps("cappingDetails.cappingTypeSpareCost")}
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={5}>
                                            <TextInput
                                                size="xs"
                                                leftSection={<IconSettingsDollar size={20} />}
                                                placeholder="Ex: 600$"
                                                label="Cost($)"
                                                {...form.getInputProps("cappingDetails.cappingSpareCost")}
                                            />
                                        </Grid.Col>
                                    </Grid>
                                </SimpleGrid>

                            </ScrollArea>
                        </Card> */}