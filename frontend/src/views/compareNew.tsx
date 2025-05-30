import React, { useEffect, useState } from 'react';
import { Card, Text, Flex, SimpleGrid, Group, Select, Space, Button, ThemeIcon, Divider, Grid, Tooltip, Modal, Badge, ScrollArea, Box, Loader } from '@mantine/core';
import { IconAlertTriangle, IconClock, IconCurrencyDollar, IconDownload, IconListCheck, IconSettingsDollar } from '@tabler/icons-react';
import { useApi } from '../api/services/estimateSrvice';
import StatsCard from '../components/statsCardCompareEst';
import TaskListCompareScreen from '../components/compareTasksAccordionList';
import CompareUploadDropZoneExcel from '../components/compareUploadFiles';
import FindingsListCompareScreen from '../components/compareFindingsAccordionList';
import { showAppNotification } from '../components/showNotificationGlobally';
import StatsCardUnbillable from '../components/statsCardCompareUnbillable';
import StatsCardOverall from '../components/statsCardCompareOverall';
import { XLSX } from '../constants/GlobalImports';

export default function CompareNew() {
  const { getAllEstimates, compareUploadFile } = useApi();

  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEstID, setSelectedEstID] = useState<string | null>(null);
  const [selectedUniqueID, setSelectedUniqueID] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>();
  const [compareEstimatedData, setCompareEstimatedData] = useState<any>();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEstimates = async () => {
    setLoading(true);
    const data = await getAllEstimates();
    if (data) {
      setEstimates(data);
      setSelectedEstID(data[0]?.estID);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEstimates();
  }, []);

  console.log("all estimates>>>", estimates);


  const handleFileChange = (files: File[]) => {
    console.log("Files selected:", files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      showAppNotification("error", "Failed", "Please select Actual Files.");
      return;
    }

    if (!selectedEstID || selectedEstID === null) {
      showAppNotification("error", "Failed", "Please select an Estimate ID.");
      return;
    }

    try {
      setIsLoading(true);

      console.log("Uploading files:", selectedFiles.map((file) => file.name));
      console.log("Selected Estimate ID:", selectedEstID);

      const response = await compareUploadFile(selectedFiles, selectedEstID);

      if (response) {
        console.log("Upload successful:", response);
        setCompareEstimatedData(response?.data);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      // No need to show notification here — already handled inside compareUploadFile
    } finally {
      setIsLoading(false);
    }
  };


  console.log("Compare UI response:", compareEstimatedData);


  // Helper function to format column headers and handle null/empty values
const formatColumnHeaders = (data: any) => {
  if (!data || data.length === 0) return [];

  return data.map((row: any) => {
    const formattedRow: any = {};
    Object.keys(row).forEach(key => {
      // Remove underscores and capitalize first letter of each word
      const formattedKey = key
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize first letter of each word

      // Handle null, NaN, undefined, and empty string values
      const value = row[key];
      if (value === null || 
          value === undefined || 
          value === '' || 
          (typeof value === 'number' && isNaN(value)) ||
          (typeof value === 'string' && value.toLowerCase() === 'nan')) {
        formattedRow[formattedKey] = '-';
      } else {
        formattedRow[formattedKey] = value;
      }
    });
    return formattedRow;
  });
};

// Function to download Findings Data Excel
const downloadFindingsData = () => {
  try {
    const findingsData = compareEstimatedData?.new_findings_summary?.new_findings_data || [];

    if (findingsData.length === 0) {
      alert('No findings data available to download');
      return;
    }

    // Format column headers and handle null/empty values
    const formattedData = formatColumnHeaders(findingsData);

    // Create worksheet from formatted JSON data
    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Findings Data');

    // Generate current date for filename
    const currentDate = new Date().toISOString().split('T')[0];
    // const filename = `Findings_Data_Comparision${currentDate}.xlsx`;
    const filename = `Findings_Data_Comparision.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Error downloading findings data:', error);
    alert('Error occurred while downloading findings data');
  }
};

// Function to download Findings Parts Data Excel
const downloadFindingsPartsData = () => {
  try {
    const partsData = compareEstimatedData?.new_findings_summary?.new_findings_parts_data || [];

    if (partsData.length === 0) {
      alert('No findings parts data available to download');
      return;
    }

    // Format column headers and handle null/empty values
    const formattedData = formatColumnHeaders(partsData);

    // Create worksheet from formatted JSON data
    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Findings Parts Data');

    // Generate current date for filename
    const currentDate = new Date().toISOString().split('T')[0];
    // const filename = `Findings_Parts_Data_${currentDate}.xlsx`;
    const filename = `Findings_Parts_Data_Comparision.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Error downloading findings parts data:', error);
    alert('Error occurred while downloading findings parts data');
  }
};

  const [selectedFileTasksOpened, setSelectedFileTasksOpened] = useState(false);

   // Function to download Excel file
   const downloadExcel = (tasks:any, fileName:any, sheetName = 'MPD') => {
    if (!tasks || tasks.length === 0) {
      alert('No tasks available to download');
      return;
    }

    // Create worksheet data with "TASK NUMBER" column
    const worksheetData = [
      ['TASK NUMBER'], // Header row
      ...tasks.map((task:any) => [task]) // Data rows
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Download the file
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  // Handle available tasks download
  const handleAvailableTasksDownload = () => {
    const availableTasks = compareEstimatedData?.task_avialability_summary?.available_tasks || [];
    downloadExcel(availableTasks, 'Available_Tasks', 'MPD');
  };

  // Handle not available tasks download
  const handleNotAvailableTasksDownload = () => {
    const notAvailableTasks = compareEstimatedData?.task_avialability_summary?.not_available_tasks || [];
    downloadExcel(notAvailableTasks, 'Not_Available_Tasks', 'MPD');
  };

  return (
    <>
    <Modal
  opened={selectedFileTasksOpened}
  onClose={() => {
    setSelectedFileTasksOpened(false);
  }}
  size={800}
  title={
    <>
      <Group justify="space-between">
      <Text c="gray" fw={600}>
            Tasks :
          </Text>
        <Group>
        <Tooltip label="Total Tasks">
          <Badge variant="filled" color="teal" radius="sm" size="lg">
            {
             compareEstimatedData?.task_avialability_summary?.available_tasks?.length 
             + 
             compareEstimatedData?.task_avialability_summary?.not_available_tasks
             ?.length || 0
            }
          </Badge>
          </Tooltip>
          <Tooltip label="Available Tasks">
            <Badge
              radius="sm" 
              size="lg"
              color="green"
              variant="light"
              rightSection={<IconDownload size="18" />}
              style={{ cursor: 'pointer' }}
              onClick={handleAvailableTasksDownload}
            >
              {
                compareEstimatedData?.task_avialability_summary?.available_tasks?.length || 0
              }
            </Badge>
          </Tooltip>
          <Tooltip label="Not Available Tasks">
            <Badge
               radius="sm" 
               size="lg"
              color="blue"
              variant="light"
              rightSection={<IconDownload size="18" />}
              style={{ cursor: 'pointer' }}
              onClick={handleNotAvailableTasksDownload}
            >
              {
                compareEstimatedData?.task_avialability_summary?.not_available_tasks
                ?.length || 0
              }
            </Badge>
          </Tooltip>
        </Group>

      </Group>
      <Space h="sm" />
     
      <Group justify="space-between">
        <Group mb="xs" align="center">
          <Text c="gray" fw={600}>
            Tasks Matching :
          </Text>
          {<Badge variant="dot" color="pink" size="lg" radius="md">
              { Math.round(compareEstimatedData?.task_avialability_summary?.task_matching_percentage
                || 0)}{" "} %
            </Badge>
          }
        </Group>

      </Group>
    </>
  }
  scrollAreaComponent={ScrollArea.Autosize}
>
  { 
    ((compareEstimatedData?.task_avialability_summary?.available_tasks?.length || 0) + 
     (compareEstimatedData?.task_avialability_summary?.not_available_tasks?.length || 0)) > 0 ? (
    <>
      <Box mb="md">
        <SimpleGrid cols={5}>
          {(() => {
            // Get available tasks with their status
            const availableTasks = (compareEstimatedData?.task_avialability_summary?.available_tasks || [])
              ?.map((task : any) => ({ task, isAvailable: true }));
            
            // Get not available tasks with their status
            const notAvailableTasks = (compareEstimatedData?.task_avialability_summary?.not_available_tasks || [])
              ?.map((task : any) => ({ task, isAvailable: false }));
            
            // Combine both arrays
            const combinedTasks = [...availableTasks, ...notAvailableTasks];
            
            // Sort alphabetically by task name
            const sortedTasks = combinedTasks
              .slice() // to avoid mutating the original array
              .sort((a, b) => (a.task || '').localeCompare(b.task || ''));
            
            // Map to Badge components
            return sortedTasks.map((taskObj, index) => (
              <Badge
                fullWidth
                key={`task-${index}`}
                color={taskObj.isAvailable ? "green" : "blue"}
                variant="light"
                radius="sm"
                style={{ margin: "0.25em" }}
              >
                {taskObj.task}
              </Badge>
            ));
          })()}
        </SimpleGrid>
      </Box>
    </>
  ) : (
    <Text ta="center" size="sm" c="dimmed">
      No tasks found. Please select a file or add additional tasks.
    </Text>
  )}
</Modal>
      <div style={{ paddingLeft: 70, paddingRight: 70, paddingTop: 20, paddingBottom: 20 }}>
        <Space h='sm' />
        <SimpleGrid cols={{ base: 1, sm: 1, lg: 2 }}>
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
                disabled={loading} // Disable dropdown while loading
                rightSection={loading ? <Loader size="xs" /> : null} // Show loader icon
                nothingFoundMessage={loading ? "Loading..." : "No estimates found"}
              />
            </Group>

          </Card>
          <Card >
            <Text>
              Select Actual Data
            </Text>
            <Grid>
              <Grid.Col span={1}>
                <Text c='gray' size='xs'>
                  Note:
                </Text>
              </Grid.Col>
              <Grid.Col span={10}>
                <Text c='gray' size='xs'>
                  Please select the following actual data files :
                </Text>
                <Text c='gray' size='xs'>
                  {/* (Material consumption pricing, Mldpmlsec1,Mltaskmlsec1) */}
                  (Material consumption pricing, Mlttable, Mldpmlsec1,Mltaskmlsec1)
                </Text>
              </Grid.Col>
            </Grid>
            <Flex direction='column'>

              {/* <Text c='gray' size='xs'>
              Note: Please select the following files of Actual Data :
              </Text>
              <Text c='gray' size='xs'>
              (Material consumption pricing, Mlttable, Mldpmlsec1,Mltaskmlsec1)
              </Text> */}
              <Space h='md' />
              <CompareUploadDropZoneExcel name="Excel File" changeHandler={handleFileChange} color="green" />
            </Flex>
          </Card>
        </SimpleGrid>
        {/* Alternative: If you want exactly 3 or 4 files */}
        <Group justify='center'>
          {((selectedFiles.length !== 3 && selectedFiles.length !== 4) || !selectedEstID) ? (
            <Tooltip label="Please Select EstimateId & Actual Files">
              <Button
                onClick={handleUpload}
                mt="md"
                mb="sm"
                radius="md"
                variant="light"
                loading={isLoading}
                disabled
                color="#000087"
              >
                Compare
              </Button>
            </Tooltip>
          ) : (
            <Button
              onClick={handleUpload}
              mt="md"
              mb="sm"
              radius="md"
              variant="light"
              loading={isLoading}
              color="#000087"
            >
              Compare
            </Button>
          )}
        </Group>

        <Group justify='end'>
          <Button
                                size="xs"
                                // color="#000480"
                                radius="sm"
                                variant="light"
                                disabled={!compareEstimatedData}
                                // onClick={handleShowTasks}
                                onClick={() => {
                                  // setSelectedEstimateId(selectedFile?.name);
                                  setSelectedFileTasksOpened(true);
                                }}
                                rightSection={<IconListCheck size={20} />}
                              >
                                Show Tasks
                              </Button>
          <Button
            size="xs"
            variant="gradient"
            gradient={{
              from: "rgba(67, 143, 230, 1)",
              to: "rgba(0, 50, 107, 1)",
              deg: 184,
            }}
            disabled={!compareEstimatedData}
            rightSection={<IconDownload size={20} />}
            onClick={downloadFindingsData}
          >
            New Findings
          </Button>
          <Button
            size="xs"
            variant="gradient"
            gradient={{
              from: "rgba(67, 143, 230, 1)",
              to: "rgba(0, 50, 107, 1)",
              deg: 184,
            }}
            disabled={!compareEstimatedData}
            rightSection={<IconDownload size={20} />}
            onClick={downloadFindingsPartsData}
          >
            New Findings Parts
          </Button>


          {/* <Button
            size="xs"
            color="#15727a"
            radius="md"
            variant="light"
            disabled={!compareEstimatedData}
            rightSection={<IconDownload size={20} />}
            onClick={downloadFindingsData}
          >
            Download Findings Data
          </Button>
          <Button
            size="xs"
            color="#15727a"
            radius="md"
            variant="light"
            disabled={!compareEstimatedData}
            rightSection={<IconDownload size={20} />}
            onClick={downloadFindingsPartsData}
          >
            Download Findings Parts Data
          </Button> */}
        </Group>
        <Space h='sm' />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} spacing="md">
          <StatsCardOverall
            title="Overall - MH"
            icon={IconClock}
            actual={
              (Math.round(compareEstimatedData?.tasks?.summary_tasks?.total_actual_manhours) || 0)
              + (Math.round(compareEstimatedData?.findings?.summary_findings?.total_actual_manhours) || 0)
            }
            predicted={
              (Math.round(compareEstimatedData?.tasks?.summary_tasks?.total_predict_manhours) || 0)
              + (Math.round(compareEstimatedData?.findings?.summary_findings?.total_predict_manhours) || 0)
            }
            // difference={Math.round(compareEstimatedData?.aggregatedTasklevel?.diff_avg_mh) || 0}
            // accuracy={Math.round(compareEstimatedData?.aggregatedTasklevel?.accuracy_mh) || 0}
            // not_eligible={Math.round(compareEstimatedData?.aggregatedTasklevel?.not_eligible_mh) || 0}
            color="#6d8aed"
            unit="h"
          />
          <StatsCardOverall
            title="Overall - Spares"
            icon={IconCurrencyDollar}
            actual={
              ((compareEstimatedData?.findings?.summary_findings?.total_actual_spares_cost || 0)
                + (compareEstimatedData?.tasks?.summary_tasks?.total_actual_spares_cost || 0))?.toFixed(2)
            }
            predicted={
              ((compareEstimatedData?.findings?.summary_findings?.total_predict_spares_cost || 0)
                + (compareEstimatedData?.tasks?.summary_tasks?.total_predict_spares_cost || 0))?.toFixed(2)
            }
            // difference={compareEstimatedData?.aggregatedFindingslevel?.diff_total_billable_value_usd_findings?.toFixed(2) || 0}
            // accuracy={compareEstimatedData?.aggregatedFindingslevel?.accuracy_total_billable_value_usd_findings?.toFixed(2) || 0}
            // not_eligible={Math.round(compareEstimatedData?.aggregatedFindingslevel?.not_eligible_total_billable_value_usd_findings) || 0}
            color="#9e64d9"
            unit="$"
          />
        </SimpleGrid>
        <Space h='sm' />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <StatsCard
            title="Tasks - MH"
            icon={IconClock}
            actual={Math.round(compareEstimatedData?.tasks?.summary_tasks?.total_actual_manhours) || 0}
            predicted={Math.round(compareEstimatedData?.tasks?.summary_tasks?.total_predict_manhours) || 0}
            // difference={Math.round(compareEstimatedData?.aggregatedTasklevel?.diff_avg_mh) || 0}
            // accuracy={Math.round(compareEstimatedData?.aggregatedTasklevel?.accuracy_mh) || 0}
            // not_eligible={Math.round(compareEstimatedData?.aggregatedTasklevel?.not_eligible_mh) || 0}
            color="#6d8aed"
            unit="h"
          />

          <StatsCard
            title="Tasks - Spares"
            icon={IconCurrencyDollar}
            actual={compareEstimatedData?.tasks?.summary_tasks?.total_actual_spares_cost?.toFixed(2) || 0}
            predicted={compareEstimatedData?.tasks?.summary_tasks?.total_predict_spares_cost?.toFixed(2) || 0}
            // difference={compareEstimatedData?.aggregatedTasklevel?.diff_total_billable_value_usd_tasks?.toFixed(2) || 0}
            // accuracy={compareEstimatedData?.aggregatedTasklevel?.accuracy_total_billable_value_usd_tasks?.toFixed(2) || 0}
            // not_eligible={Math.round(compareEstimatedData?.aggregatedTasklevel?.not_eligible_total_billable_value_usd_tasks) || 0}
            color="#70cc60"
            unit="$"
          />

          <StatsCard
            title="Findings - MH"
            icon={IconAlertTriangle}
            actual={Math.round(compareEstimatedData?.findings?.summary_findings?.total_actual_manhours) || 0}
            predicted={Math.round(compareEstimatedData?.findings?.summary_findings?.total_predict_manhours) || 0}
            // difference={Math.round(compareEstimatedData?.findings?.summary_findings?.total_actual_manhours) || 0}
            // accuracy={Math.round(compareEstimatedData?.aggregatedFindingslevel?.accuracy_mh) || 0}
            // not_eligible={Math.round(compareEstimatedData?.aggregatedFindingslevel?.not_eligible_mh) || 0}
            color="#9e64d9"
            unit="h"
          />

          <StatsCard
            title="Findings - Spares"
            icon={IconCurrencyDollar}
            actual={compareEstimatedData?.findings?.summary_findings?.total_actual_spares_cost?.toFixed(2) || 0}
            predicted={compareEstimatedData?.findings?.summary_findings?.total_predict_spares_cost?.toFixed(2) || 0}
            // difference={compareEstimatedData?.aggregatedFindingslevel?.diff_total_billable_value_usd_findings?.toFixed(2) || 0}
            // accuracy={compareEstimatedData?.aggregatedFindingslevel?.accuracy_total_billable_value_usd_findings?.toFixed(2) || 0}
            // not_eligible={Math.round(compareEstimatedData?.aggregatedFindingslevel?.not_eligible_total_billable_value_usd_findings) || 0}
            color="orange"
            unit="$"
          />
        </SimpleGrid>
        <Space h='xs' />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <Card withBorder radius="md" p="5" mb="sm" >
            <Text fw={600} fz="md" c='#69696b' p={5}>
              Unbillable MH - Actual
            </Text>
            {/* <Text size="sm" fw={500} c="#69696b" m={5}>
              Unbillable MH - Actual
            </Text> */}
            <Divider variant="dashed" mt={5} mb={10} />
            <Group gap="md">

              <ThemeIcon variant="light" radius="md" size={50} color="#6d8aed">
                <IconClock size={24} />
              </ThemeIcon>
              <Flex direction="column">

                <Text size="xs" >
                  {
                    (compareEstimatedData?.cappingDetails?.actual_capping?.cappingTypeManhrs || "Capping Type")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char: any) => char.toUpperCase()
                      )
                  } (
                  {
                    compareEstimatedData?.cappingDetails?.actual_capping?.cappingManhrs || 0
                  } mh)
                </Text>
                <Text size="lg" fw={600} c="#6d8aed">
                  {Math.round(compareEstimatedData?.cappingDetails?.actual_capping?.unbillableManhrs) || 0} hr
                </Text>
              </Flex>
            </Group>
          </Card>

          <Card withBorder radius="md" p="5" mb="sm" >
            <Text fw={600} fz="md" c='#69696b' p={5}>
              Unbillable MH - Predicted
            </Text>
            <Divider variant="dashed" mt={5} mb={10} />
            <Group gap="md">
              <ThemeIcon variant="light" radius="md" size={50} color="#70cc60">
                <IconClock size={24} />
              </ThemeIcon>
              <Flex direction="column">

                <Text size="xs" >
                  {
                    (compareEstimatedData?.cappingDetails?.predicted_capping?.cappingTypeManhrs || "Capping Type")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char: any) => char.toUpperCase()
                      )
                  } (
                  {
                    compareEstimatedData?.cappingDetails?.predicted_capping?.cappingManhrs || 0
                  } mh)
                </Text>
                <Text size="lg" fw={600} c="#70cc60">
                  {Math.round(compareEstimatedData?.cappingDetails?.predicted_capping?.unbillableManhrs) || 0} hr
                </Text>
              </Flex>
            </Group>
          </Card>

          <Card withBorder radius="md" p="5" mb="sm" >
            <Text fw={600} fz="md" c='#69696b' p={5}>
              Unbillable Spares - Actual
            </Text>
            <Divider variant="dashed" mt={5} mb={10} />
            <Group gap="md">
              <ThemeIcon variant="light" radius="md" size={50} color="#9e64d9">
                <IconCurrencyDollar size={24} />
              </ThemeIcon>
              <Flex direction="column">

                <Text size="xs" >
                  {
                    (compareEstimatedData?.cappingDetails?.actual_capping?.cappingTypeSpareCost || "Capping Type")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char: any) => char.toUpperCase()
                      )
                  } (
                  {
                    compareEstimatedData?.cappingDetails?.actual_capping?.cappingSpareCost || 0
                  } $
                  )
                </Text>
                <Text size="lg" fw={600} c="#9e64d9">
                  {compareEstimatedData?.cappingDetails?.actual_capping?.unbillableSpareCost?.toFixed(2) || 0} $
                </Text>
              </Flex>
            </Group>
          </Card>



          <Card withBorder radius="md" p="5" mb="sm" >
            <Text fw={600} fz="md" c='#69696b' p={5}>
              Unbillable Spares - Predicted
            </Text>
            <Divider variant="dashed" mt={5} mb={10} />
            <Group gap="md">
              <ThemeIcon variant="light" radius="md" size={50} color="orange">
                <IconCurrencyDollar size={24} />
              </ThemeIcon>
              <Flex direction="column">

                <Text size="xs" >
                  {
                    (compareEstimatedData?.cappingDetails?.predicted_capping?.cappingTypeSpareCost || "Capping Type")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char: any) => char.toUpperCase()
                      )
                  } (
                  {
                    compareEstimatedData?.cappingDetails?.predicted_capping?.cappingSpareCost || 0
                  } $
                  )
                </Text>
                <Text size="lg" fw={600} c="orange">
                  {compareEstimatedData?.cappingDetails?.predicted_capping?.unbillableSpareCost?.toFixed(2) || 0} $
                </Text>
              </Flex>
            </Group>
          </Card>
        </SimpleGrid>
        <Space h='sm' />
        {/* <SimpleGrid cols={1} spacing="md">
          <TaskListCompareScreen tasksEligible={compareEstimatedData?.tasks?.eligible_tasks} tasksNotEligible={compareEstimatedData?.tasks?.not_eligible} />
          <FindingsListCompareScreen findingsEligible={compareEstimatedData?.findings?.eligible_tasks} findingsNotEligible={compareEstimatedData?.findings?.not_eligible} />
        </SimpleGrid> */}


        <Space h='sm' />
      </div>
    </>
  )
}

// const compareEstimateData = {
//   "new_findings_summary": {
//     "new_findings_data": [
//       {
//         "rt_mode_flag": "S",
//         "delete_flag": "No",
//         "task_type": "MIREP",
//         "log_item_number": "HMV09/000239/0220/1",
//         "ata_number": "53",
//         "task_description": "DURING INTERNAL INSPECTION OF FWD CARGO INTERNAL STRUCTURE FOUND CORROSION ON RIVETS HEAD BETWEEN FRAME  FR24 TO FR 34 AND STR 40 LH AND STR 40RH. FURTHER ASSESSMENT TO BE CARRIED OUT",
//         "corrective_action": "CARRIED OUT FURTHER ACCESSMENT AND REPAIR OF CORROSION INSIDE FWD CARGO COMPRTMENT, \nFOR DETAILS OF EACH CORRODED PART AND REPAIRS REFER SDIRC # \nHMV09/000239/0220/105\nHMV09/000239/0220/2\nHMV09/000239/0220/105\nHMV09/000239/0220/115\nHMV09/000239/0220/171\nHMV09/000239/0220/172\nHMV09/000239/0220/173\n\nFOR PAINT STRIPPING REFER IRC \n# HMV09/000239/0220/19.\n\nFINAL INSPCTION AFTER COMPLETION OF REPAIR CARRIED OUT\nFOUND SATISFACTORY.",
//         "discrepancy_number": "HMV09/000239/0220/1",
//         "action_taken": "Close",
//         "task_status": "Closed",
//         "source_task_discrepancy_number": "532180-01-2",
//         "source_task_discrepancy_number_updated": "532180-01-2",
//         "source_tracking_number": 398,
//         "work_center_number": "LINE 2A",
//         "sign_off_status": "Signed Off",
//         "contract_classification": "DISC- MPD",
//         "task_category": "IRC",
//         "execution_phase": "Regular",
//         "execution_category": "REGULAR",
//         "part_required": "Yes",
//         "corrosion_related": "Yes",
//         "major_item": "Yes",
//         "is_repeat": "No",
//         "part_number": null,
//         "serial_number": null,
//         "position_code": null,
//         "part_description": null,
//         "radio_communication": null,
//         "reported_by": "MR0001",
//         "reported_date": "2020-02-29T14:44:55",
//         "mechanical_required": "Yes",
//         "mechanical_sign_off": "MR0016",
//         "mechanical_skill_number": null,
//         "inspection_required": "Yes",
//         "inspection_sign_off": "MR0016",
//         "inspection_skill_number": null,
//         "rii_required": "No",
//         "rii_sign_off": null,
//         "rii_skill_number": null,
//         "additional_sign_off": null,
//         "new_sign_off_comments": null,
//         "previous_sign_off_comments": null,
//         "planned_start_date": "2020-02-23T19:46:40",
//         "planned_end_date": "2020-06-08T16:37:47",
//         "estimated_man_hours": 1,
//         "actual_start_date": "2020-09-15T17:06:42",
//         "actual_end_date": "2020-06-09T10:07:13",
//         "actual_man_hours": 42.35,
//         "sequence_number": 840,
//         "tracking_number": 840,
//         "source_tracking_number_with_space": null,
//         "hold_status": "Not in hold",
//         "estimation_status": "Pending Estimates",
//         "file_name": null,
//         "skill_number": null,
//         "zone_number": "100",
//         "work_area_number": null,
//         "deferral_fh": null,
//         "deferral_fc": null,
//         "deferral_parameter": null,
//         "deferral_value": null,
//         "deferral_calendar_value": null,
//         "deferral_calendar": "Hours",
//         "deferral_item_number": null,
//         "deferral_type": " ",
//         "reason_for_deferral": null,
//         "authorization_reference_number": null,
//         "message_center": null,
//         "package_number": null
//       },
//       {
//         "rt_mode_flag": "S",
//         "delete_flag": "No",
//         "task_type": "MIREP",
//         "log_item_number": "HMV09/000239/0220/2",
//         "ata_number": "53",
//         "task_description": "DURING INTERNAL INSPECTION OF FWD CARGO INTERNAL STRUCTURE FOUND CORROSION ON RIVETS HEAD BETWEEN FRAME  FR24 TO FR 34 AND STR 40 LH AND STR 40RH. FURTHER ASSESSMENT TO BE CARRIED OUT",
//         "corrective_action": "CORRODED CLEAT AREA ASSESSED AS PER SRM TASK 53-21-12, REV 132 DTD 01 FEB 2020 . FOUND NO ALLOWABLE DAMAGE OR REPAIR.OPTED FOR REPLACEMENT.\n\nCORRODED FASTENER REMOVED AS PER SRM 51-42-11 REV 132 DTD 01 FEB 2020 .\n\nAFTER CORRODED CLEAT REMOVAL, DVI PERFORMED IN THE CLEAT ATTACHEMENT AREAS-NO DAMAGE.\n\nHFEC PERFORMED AT ALL OPEN HOLES OF STR42LH BETWEEN FR31-FR33.NIL FINDINGS.REF NDT REPORT HMV09/000239/0220/188.\n\nCARRIED OUT CLEAT REPLACEMENT AS PER SRM 53-21-12-03-A AND SRM 51-72-11-911-001 REV 132 DTD 01 FEB 2020.\n\n1) FRAME 28, STGR 43LH TO STGR 43RH (CTR) D5323053420000\n\n 2) FRAME 34, STGR 43 TO STGR 42 (LH) D5323039820000\n\n3) FRAME 33, STGR 43 TO STGR 42 (LH) D5323039820001\n\n4) FRAME 34, STGR 43LH TO STGR 43RH (CTR) D5323039920000(ALT TO D5323039920000)\n\nSTGR 43 TO STGR 42 (RH) D5323039820001\n\n5) FRAME 33, STGR 42 TO STGR 41 (RH) D5323051420002\n\n STGR 41 TO STGR 46 (RH) D5323051320002\n\n6) FRAME 32, STGR 43 TO STGR 42 (RH) D5323039820101\n\nSTGR 41 TO STGR 40 (RH) D5323051320000\n\nSTGR 43LH TO STGR 43RH (CTR) D5323071920007 (ALT TO D5323039920000)\n\n 7) FRAME 31, STGR 43RH TO STGR 43RH (CTR) D5323071920007 (ALT TO D5323039920000)\n\nSTGR 43 TO STGR 42 (RH) D5323039820101\n\nSTGR 41 TO STGR 40 (RH) D5323051320000",
//         "discrepancy_number": "HMV09/000239/0220/2",
//         "action_taken": "Close",
//         "task_status": "Closed",
//         "source_task_discrepancy_number": "HMV09/000239/0220/1",
//         "source_task_discrepancy_number_updated": "532180-01-2",
//         "source_tracking_number": 840,
//         "work_center_number": "LINE 2A",
//         "sign_off_status": "Signed Off",
//         "contract_classification": "DISC- MPD",
//         "task_category": "SDIRC",
//         "execution_phase": "Regular",
//         "execution_category": "REGULAR",
//         "part_required": "Yes",
//         "corrosion_related": "Yes",
//         "major_item": "Yes",
//         "is_repeat": "No",
//         "part_number": null,
//         "serial_number": null,
//         "position_code": null,
//         "part_description": null,
//         "radio_communication": null,
//         "reported_by": "MR0001",
//         "reported_date": "2020-02-29T14:45:57",
//         "mechanical_required": "Yes",
//         "mechanical_sign_off": "MR0001",
//         "mechanical_skill_number": null,
//         "inspection_required": "Yes",
//         "inspection_sign_off": "MR0001",
//         "inspection_skill_number": null,
//         "rii_required": "No",
//         "rii_sign_off": null,
//         "rii_skill_number": null,
//         "additional_sign_off": null,
//         "new_sign_off_comments": null,
//         "previous_sign_off_comments": null,
//         "planned_start_date": "2020-02-23T19:46:40",
//         "planned_end_date": "2020-06-16T12:12:54",
//         "estimated_man_hours": 1,
//         "actual_start_date": "2020-09-15T17:06:42",
//         "actual_end_date": "2020-06-16T11:33:51",
//         "actual_man_hours": 117,
//         "sequence_number": 841,
//         "tracking_number": 841,
//         "source_tracking_number_with_space": null,
//         "hold_status": "Not in hold",
//         "estimation_status": "Pending Estimates",
//         "file_name": null,
//         "skill_number": null,
//         "zone_number": "100",
//         "work_area_number": null,
//         "deferral_fh": null,
//         "deferral_fc": null,
//         "deferral_parameter": null,
//         "deferral_value": null,
//         "deferral_calendar_value": null,
//         "deferral_calendar": "Hours",
//         "deferral_item_number": null,
//         "deferral_type": " ",
//         "reason_for_deferral": null,
//         "authorization_reference_number": null,
//         "message_center": null,
//         "package_number": null
//       }
//     ],
//     "new_findings_parts_data": [
//       {
//         "registration_number": "ES-SAW",
//         "package_number": "HMV09/000239/0220",
//         "task_number": "HMV09/000239/0220/46",
//         "task_description": "DURING INSPECTION  FOUND PLAY IN BEARINGS OF RUDDER HINGE ARM ATTACH FITTING S #1,#2,#3,#4,#5 AND #7 AS PER AMM TASK 27-21-41-200-001 DIMENSIONS CHECK",
//         "issued_part_number": "HL412VF8-8",
//         "part_description": "HILOK",
//         "issued_unit_of_measurement": "EA",
//         "stock_status": "Owned",
//         "used_quantity": 2,
//         "base_currency": "USD",
//         "base_price_usd": 9.04,
//         "freight_cost": 1.3559999999999999,
//         "admin_charges": 0.5197999999999999,
//         "total_billable_price": 10.915799999999999,
//         "billable_value_usd": 21.831599999999998,
//         "soi_transaction": "SOI07/001494/0717"
//       },
//       {
//         "registration_number": "ES-SAW",
//         "package_number": "HMV09/000239/0220",
//         "task_number": "HMV09/000239/0220/109",
//         "task_description": "CORROSION AT FLOOR BEAM TOP SURFACE STA Y1292 NEAR FR66. SRM IDENTIFICATION REF- 53-41-14-19-A FIG. 19 SHT3. CARRY OUT REPLACEMENT.",
//         "issued_part_number": "AERODUR HS PRIMER 37092",
//         "part_description": "PrimerEpoxyPaint",
//         "issued_unit_of_measurement": "EA",
//         "stock_status": "Owned",
//         "used_quantity": 1,
//         "base_currency": "USD",
//         "base_price_usd": 88.133,
//         "freight_cost": 13.219949999999999,
//         "admin_charges": 5.0676475,
//         "total_billable_price": 106.42059749999999,
//         "billable_value_usd": 106.42059749999999,
//         "soi_transaction": "SOI08/004809/0319"
//       }
//     ]
//   }
// }

