import React, { useEffect, useState } from 'react';
import { Card, Text, Flex, SimpleGrid, Group, Select, Space, Button } from '@mantine/core';
import { IconAlertTriangle, IconClock, IconCurrencyDollar} from '@tabler/icons-react';
import { useApi } from '../api/services/estimateSrvice';
import StatsCard from '../components/statsCardCompareEst';
import TaskListCompareScreen from '../components/compareTasksAccordionList';
import CompareUploadDropZoneExcel from '../components/compareUploadFiles';
import FindingsListCompareScreen from '../components/compareFindingsAccordionList';

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


  const handleFileChange = (files: File[]) => {
    console.log("Files selected:", files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      alert("Please select files first!");
      return;
    }

    if (!selectedEstID) {
      alert("Please select an Estimate ID first!");
      return;
    }

    try {
      setIsLoading(true); // Set loading to true
      console.log("Uploading files:", selectedFiles.map((file) => file.name));
      console.log("Selected Estimate ID:", selectedEstID);

      const response = await compareUploadFile(selectedFiles, selectedEstID);

      if (response) {
        console.log("Upload successful:", response);
        setCompareEstimatedData(response?.data);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload files. Please try again.");
    } finally {
      setIsLoading(false); // Set loading to false after request completes
    }
  };

  console.log("Compare UI response:", compareEstimatedData);

  return (
    <>
      <div style={{ paddingLeft: 70, paddingRight: 70, paddingTop: 20, paddingBottom: 20 }}>
        <Space h='sm' />
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
            loading={isLoading}
            // rightSection={<IconArrowMoveRight />}
            color='#000087'
          >
            Compare
          </Button>
        </Group>
        <Space h='sm' />
        <SimpleGrid cols={4} spacing="md">
          <StatsCard
            title="Tasks - MH"
            icon={IconClock}
            actual={Math.round(compareEstimatedData?.tasks?.summary_tasks?.total_actual_manhours) || 0}
            predicted={Math.round(compareEstimatedData?.tasks?.summary_tasks?.total_predict_manhours) || 0}
            // difference={Math.round(compareEstimatedData?.aggregatedTasklevel?.diff_avg_mh) || 0}
            // accuracy={Math.round(compareEstimatedData?.aggregatedTasklevel?.accuracy_mh) || 0}
            not_eligible={Math.round(compareEstimatedData?.aggregatedTasklevel?.not_eligible_mh) || 0}
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
            not_eligible={Math.round(compareEstimatedData?.aggregatedTasklevel?.not_eligible_total_billable_value_usd_tasks) || 0}
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
            not_eligible={Math.round(compareEstimatedData?.aggregatedFindingslevel?.not_eligible_mh) || 0}
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
            not_eligible={Math.round(compareEstimatedData?.aggregatedFindingslevel?.not_eligible_total_billable_value_usd_findings) || 0}
            color="orange"
            unit="$"
          />
        </SimpleGrid>
        <Space h='sm' />
        <SimpleGrid cols={1} spacing="md">
        <TaskListCompareScreen tasksEligible={compareEstimatedData?.tasks?.eligible_tasks} tasksNotEligible={compareEstimatedData?.tasks?.not_eligible} />
        <FindingsListCompareScreen findingsEligible={compareEstimatedData?.findings?.eligible_tasks} findingsNotEligible={compareEstimatedData?.findings?.not_eligible} />
        </SimpleGrid>

        
        <Space h='sm' />
      </div>
    </>
  )
}
