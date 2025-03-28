import React, { useEffect, useState } from 'react';
import { Card, List, Table, Text, Flex, Title, SimpleGrid, Group, Select, Space, Button, Container, Stack, Tooltip, ActionIcon, ThemeIcon } from '@mantine/core';
import { AgGridReact } from 'ag-grid-react';
import DropZoneExcel from '../components/fileDropZone';
import { IconAlertTriangle, IconArrowMoveRight, IconClock, IconClockCheck, IconCube, IconCurrencyDollar, IconError404, IconSettingsSearch, IconSettingsStar, IconUsers } from '@tabler/icons-react';
import ReactApexChart from 'react-apexcharts';
import { useApi } from '../api/services/estimateSrvice';
import UploadDropZoneExcel from '../components/uploadExcelFile';
import { showNotification } from '@mantine/notifications';
import { showAppNotification } from '../components/showNotificationGlobally';
import compareData from '../assets/compareData.json';
import AggregatedStatistics from '../components/statsCardCompareEst';
import StatsCard from '../components/statsCardCompareEst';
import TaskListCompareScreen from '../components/statsTasksAcordComapre';
import CompareUploadDropZoneExcel from '../components/compareUploadFiles';

export default function CompareEstimateNew() {
  const { getAllEstimates, compareUploadFile } = useApi();


  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEstID, setSelectedEstID] = useState<string | null>(null);
  const [selectedUniqueID, setSelectedUniqueID] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>();
  const [compareEstimatedData, setCompareEstimatedData] = useState<any>();

  useEffect(() => {
    const fetchEstimates = async () => {
      setLoading(true);
      const data = await getAllEstimates();
      if (data) {
        setEstimates(data);
        setSelectedEstID(data[0]?.estID);
      }
      setLoading(false);
    };

    fetchEstimates();
  }, []);

  console.log("all estimates>>>", estimates);

  // // Handle file selection from DropZoneExcel
  // const handleFileChange = (files: any) => {
  //   // DropZoneExcel component already provides the files array
  //   if (files && files.length > 0) {
  //     setSelectedFile(files[0]);
  //     console.log("✅ File Selected:", files[0].name);
  //   } else {
  //     setSelectedFile(null);
  //     console.log("❌ No file selected");
  //   }
  // };

  // // Handle upload
  // const handleUpload = async () => {
  //   if (!selectedFile) {
  //     console.log("Current file state:", selectedFile);
  //     alert("Please select a file first!");
  //     return;
  //   }

  //   if (!selectedEstID) {
  //     alert("Please select an Estimate ID first!");
  //     return;
  //   }

  //   try {
  //     console.log("Uploading file:", selectedFile.name);
  //     console.log("Selected Estimate ID:", selectedEstID);

  //     // Create FormData and append file
  //     const formData = new FormData();
  //     formData.append('file', selectedFile);

  //     // Call the upload API
  //     const response = await uploadFile(selectedFile, selectedEstID);

  //     if (response) {
  //       console.log("Upload successful:", response);
  //       setCompareEstimatedData(response?.data);
  //       // Reset the form
  //       setSelectedFile(null);
  //       setSelectedEstID('');
  //     }
  //   } catch (error) {
  //     console.error("Upload failed:", error);
  //     alert("Failed to upload file. Please try again.");
  //   }
  // };
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (files: File[]) => {
    console.log("Files selected:", files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }

    if (!selectedEstID) {
      alert("Please select an Estimate ID first!");
      return;
    }

    try {
      console.log("Uploading file:", selectedFile.name);
      console.log("Selected Estimate ID:", selectedEstID);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await compareUploadFile(selectedFile, selectedEstID);

      if (response) {
        console.log("Upload successful:", response);
        // Reset file and ID after successful upload
        setCompareEstimatedData(response?.data);

      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload file. Please try again.");
    }
  };


  console.log("comapre ui rsp>>>>", compareEstimatedData);


  const [manHours, setManHours] = useState<any | null>(null);
  const [spareCost, setSpareCost] = useState<any | null>(null);
  const [tatTime, setTatTime] = useState<any | null>(null);

  // Process API data into individual metrics
  useEffect(() => {
    if (compareEstimatedData?.comparisonResults) {
      setManHours(
        compareEstimatedData?.comparisonResults.find(
          (result: any) => result.metric === "Man-Hours"
        ) || null
      );
      setSpareCost(
        compareEstimatedData?.comparisonResults.find(
          (result: any) => result.metric === "Spare Cost"
        ) || null
      );
      setTatTime(
        compareEstimatedData?.comparisonResults.find(
          (result: any) => result.metric === "TAT Time"
        ) || null
      );
    }
  }, [compareEstimatedData]);

  // Calculate difference between estimated and actual values
  const calculateDifference = (data: any | null) => {
    if (!data) return 0;
    return (data.actual - data.estimated).toFixed(2);
  };

  // Prepare data for bar chart
  const categories = compareEstimatedData?.comparisonResults.map(
    (result: any) => result.metric
  ) || [];

  const estimatedData = compareEstimatedData?.comparisonResults.map(
    (result: any) => result.estimated?.toFixed(0)
  ) || [];

  const actualData = compareEstimatedData?.comparisonResults.map(
    (result: any) => result.actual?.toFixed(0)
  ) || [];

  // Prepare data for radial chart
  const series = compareEstimatedData?.comparisonResults.map(
    (result: any) => (((result.actual - result.estimated) / result.actual) * 100 || 0).toFixed(1)
  ) || [];

  const labels = compareEstimatedData?.comparisonResults.map(
    (result: any) => result.metric
  ) || [];


  const [tasks, setTasks] = useState<string[]>([]);
  // Handle extracted tasks
  const handleTasks = (extractedTasks: string[]) => {
    setTasks(extractedTasks);
    console.log("tasks :", extractedTasks);
  };

    // Sample data
    const flightData = [
    { value: 123, percent: 82 },
    { value: 60, percent: 23 },
    { value: 95, percent: 67 },
    { value: 75, percent: 59 },
    { value: 60, percent: 48 }
    ];

    const CustomHeader = ({ defaultName, tooltipName }: any) => {
        return (
            <Tooltip label={tooltipName} withArrow>
                <span style={{ cursor: 'pointer' }}>{defaultName}</span>
            </Tooltip>
        );
    };

  return (
    <>
      <div style={{ paddingLeft: 70, paddingRight: 70, paddingTop: 20, paddingBottom: 20 }}>
        <SimpleGrid cols={2}>
          <Card >
            <Group justify='space-between'>
              <Text>
                Select Estimate
              </Text>
              <Select
                size="xs"
                w="18vw"
                label="Select Estimate ID"
                searchable
                placeholder="Select Estimate ID"
                data={estimates?.map((estimate, index) => ({
                  value: `${estimate.estID}_${index}`, // Unique value
                  label: estimate.estID, // Displayed text
                }))}
                value={selectedUniqueID} // Bind to unique ID
                onChange={(value) => {
                  if (value) {
                    const [estID] = value.split("_"); // Extract the original estID
                    setSelectedEstID(estID);
                    setSelectedUniqueID(value); // Ensure UI updates even if duplicate
                  } else {
                    setSelectedEstID(null);
                    setSelectedUniqueID(null);
                  }
                }}
                allowDeselect
              />
            </Group>

          </Card>
          <Card >
            <Flex direction='column'>
              <Text>
                Select Actual Data
              </Text>
              <CompareUploadDropZoneExcel name="Excel File" changeHandler={handleFileChange} color="green" />
            </Flex>
          </Card>
        </SimpleGrid>
        <Group justify='center'>
          <Button
            onClick={handleUpload}
            // disabled={!selectedFile || !selectedEstID}
            mt='md'
            mb='sm'
            radius='md'
            variant='light'
            // rightSection={<IconArrowMoveRight />}
            color='#000087'
          >
            Compare
          </Button>
        </Group>
        <Space h='sm'/>
        <SimpleGrid cols={4} spacing="md">
        <StatsCard
          title="Tasks - MH"
          icon={IconClock}
          actual={compareData.aggregatedTasklevel.avg_mh_actual}
          predicted={compareData.aggregatedTasklevel.avg_mh_pred}
          difference={compareData.aggregatedTasklevel.diff_avg_mh}
          accuracy={compareData.aggregatedTasklevel.accuracy_mh}
          color="#6d8aed"
        />

        <StatsCard
          title="Tasks - Billable Value"
          icon={IconCurrencyDollar}
          actual={compareData.aggregatedTasklevel.total_billable_value_usd_tasks_actual}
          predicted={compareData.aggregatedTasklevel.total_billable_value_usd_tasks_Pred}
          difference={compareData.aggregatedTasklevel.diff_total_billable_value_usd_tasks}
          accuracy={compareData.aggregatedTasklevel.accuracy_total_billable_value_usd_tasks}
          color="#70cc60"
        />

        <StatsCard
          title="Findings - MH"
          icon={IconAlertTriangle}
          actual={compareData.aggregatedFindingslevel.avg_mh_findings_actual}
          predicted={compareData.aggregatedFindingslevel.avg_mh_findings_pred}
          difference={compareData.aggregatedFindingslevel.diff_avg_mh}
          accuracy={compareData.aggregatedFindingslevel.accuracy_mh}
          color="#9e64d9"
        />

        <StatsCard
          title="Findings - Billable Value"
          icon={IconCurrencyDollar}
          actual={compareData.aggregatedFindingslevel.total_billable_value_usd_findings_actual}
          predicted={compareData.aggregatedFindingslevel.total_billable_value_usd_findings_Pred}
          difference={compareData.aggregatedFindingslevel.diff_total_billable_value_usd_findings}
          accuracy={compareData.aggregatedFindingslevel.accuracy_total_billable_value_usd_findings}
          color="orange"
        />
        </SimpleGrid>
        <Space h='sm'/>
        <TaskListCompareScreen tasks={compareData.tasks}/>
        <Space h='sm'/>
        
      </div>
    </>
  )
}
