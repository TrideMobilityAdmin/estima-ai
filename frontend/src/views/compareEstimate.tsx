import React, { useEffect, useState } from 'react';
import { Card, List, Table, Text, Flex, Title, SimpleGrid, Group, Select, Space, Button } from '@mantine/core';
import { AgGridReact } from 'ag-grid-react';
import DropZoneExcel from '../components/fileDropZone';
import { IconArrowMoveRight, IconClockCheck, IconCube, IconSettingsStar, IconUsers } from '@tabler/icons-react';
import ReactApexChart from 'react-apexcharts';
import { useApi } from '../api/services/estimateSrvice';
import UploadDropZoneExcel from '../components/uploadExcelFile';

export default function CompareEstimate() {
  const { getAllEstimates,uploadFile } = useApi();

  
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEstID, setSelectedEstID] = useState<string | null>(null);
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

  console.log("all estimates>>>",estimates);

  // Handle file selection from DropZoneExcel
  const handleFileChange = (files :any) => {
    // DropZoneExcel component already provides the files array
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      console.log("✅ File Selected:", files[0].name);
    } else {
      setSelectedFile(null);
      console.log("❌ No file selected");
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      console.log("Current file state:", selectedFile);
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
      
      // Create FormData and append file
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Call the upload API
      const response = await uploadFile(selectedFile, selectedEstID);
      
      if (response) {
        console.log("Upload successful:", response);
        setCompareEstimatedData(response?.data);
        // Reset the form
        setSelectedFile(null);
        setSelectedEstID('');
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload file. Please try again.");
    }
  };
  
  console.log("comapre ui rsp>>>>",compareEstimatedData);

  
  const [manHours, setManHours] = useState<any | null>(null);
  const [spareCost, setSpareCost] = useState<any | null>(null);
  const [tatTime, setTatTime] = useState<any | null>(null);

  // Process API data into individual metrics
  useEffect(() => {
    if (compareEstimatedData?.comparisonResults) {
      setManHours(
        compareEstimatedData?.comparisonResults.find(
          (result : any) => result.metric === "Man-Hours"
        ) || null
      );
      setSpareCost(
        compareEstimatedData?.comparisonResults.find(
          (result : any) => result.metric === "Spare Cost"
        ) || null
      );
      setTatTime(
        compareEstimatedData?.comparisonResults.find(
          (result : any) => result.metric === "TAT Time"
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
    (result : any) => result.metric
  ) || [];
  
  const estimatedData = compareEstimatedData?.comparisonResults.map(
    (result : any) => result.estimated
  ) || [];
  
  const actualData = compareEstimatedData?.comparisonResults.map(
    (result : any) => result.actual
  ) || [];

  // Prepare data for radial chart
  const series = compareEstimatedData?.comparisonResults.map(
    (result : any) => (((result.actual - result.estimated) / result.actual) * 100 || 0).toFixed(1)
  ) || [];

  const labels = compareEstimatedData?.comparisonResults.map(
    (result : any) => result.metric
  ) || [];




  const [tasks, setTasks] = useState<string[]>([]);
  // Handle extracted tasks
  const handleTasks = (extractedTasks: string[]) => {
    setTasks(extractedTasks);
    console.log("tasks :", extractedTasks);
  };

  // const jsonData = {
  //   estimateID: "Estimate-01",
  //   comparisionResult: [
  //     {
  //       metric: "TAT Time",
  //       estimated: 10,
  //       actual: 12
  //     },
  //     {
  //       metric: "Man Hours",
  //       estimated: 500,
  //       actual: 540
  //     },
  //     {
  //       metric: "Spare Cost",
  //       estimated: 3000,
  //       actual: 3500
  //     }
  //   ]
  // };
  // Define icons and background colors based on metric name
  // const metricConfig: Record<string, { icon: JSX.Element; bg: string; unit?: string }> = {
  //   "Man Hours": { icon: <IconUsers color="#4E66DE" size="39" />, bg: "#e1e6f7", unit: " Hrs" },
  //   "Spare Cost": { icon: <IconSettingsStar color="#088A45" size="39" />, bg: "#e3fae8", unit: " ₹" },
  //   "TAT Time": { icon: <IconClockCheck color="orange" size="39" />, bg: "#fcfbe3", unit: " Days" },
  // };

   // Extract data for the bar graph
  // const categories = jsonData.comparisionResult.map((item) => item.metric);
  // const estimatedData = jsonData.comparisionResult.map((item) => item.estimated);
  // const actualData = jsonData.comparisionResult.map((item) => item.actual);
  // const differenceData = jsonData.comparisionResult.map((item) => item.actual - item.estimated);

  // Extract data for the radial bar  
// const labels = jsonData.comparisionResult.map(item => item.metric);
// const series = jsonData.comparisionResult.map(item => Math.round(((item.actual-item.estimated) / item.actual) * 100));
// const series = jsonData.comparisionResult.map((item) => {
//   const percentage = (item.actual / item.estimated) * 100;
//   return percentage > 100 ? 100 : Math.round(percentage); // Cap at 100%
// });

  return (
    <>
      <div style={{ paddingLeft: 150, paddingRight: 150, paddingTop: 20, paddingBottom: 20 }}>
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
      placeholder="Select Estimate ID"
      data={estimates?.map((estimate) => ({
        value: estimate.estID,
        label: estimate.estID,
      }))} // Populate dropdown dynamically
      value={selectedEstID}
      onChange={(value) => setSelectedEstID(value)}
      allowDeselect
    />
            </Group>

          </Card>
          <Card  >
            <Group>
              <Text>
                Select Actual Data
              </Text>
              <UploadDropZoneExcel name="Excel File" changeHandler={handleFileChange} color="green" />
            </Group>
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
            rightSection={<IconArrowMoveRight />}
            color='#000087'
          >
            Compare
          </Button>
        </Group>
        {/* <SimpleGrid cols={3}> */}
          {/* {jsonData.comparisionResult.map(({ metric, estimated, actual }) => {
            const difference = actual - estimated;
            const isPositive = difference >= 0;
            const { icon, bg, unit = "" } = metricConfig[metric] || {};

            return (
              <Card key={metric} withBorder radius="md" bg={bg} shadow="md">
                <Group>
                  {icon}
                  <Text fw={500} fz="md">{metric}</Text>
                </Group>
                <Space h="md" />
                <Group justify="space-between">
                  <Flex direction="column" justify="center" align="center">
                    <Text fw={400} fz="sm" c='gray'>Estimated</Text>
                    <Text fw={600} fz="lg">{estimated}{unit}</Text>
                  </Flex>
                  <Flex direction="column" justify="center" align="center">
                    <Text fw={400} fz="sm" c='gray'>Actual</Text>
                    <Text fw={600} fz="lg">{actual}{unit}</Text>
                  </Flex>
                  <Flex direction="column" justify="center" align="center">
                    <Text fw={400} fz="sm" c='gray'>Difference</Text>
                    <Text fw={600} fz="lg" c={isPositive ? "#F20000" : "green"}>
                      {difference > 0 ? `+${difference}${unit}` : `${difference}${unit}`}
                    </Text>
                  </Flex>
                </Group>
              </Card>
            );
          })} */}
          {/* {compareEstimatedData?.comparisionResults.map(({ metric, estimated, actual } : any) => {
        const difference = actual - estimated;
        return (
          <Card key={metric} withBorder radius='md' bg={bgMap[metric]} shadow='md'>
            <Group>
              {iconMap[metric]}
              <Text fw={600} fz='md'>{metric}</Text>
            </Group>
            <Space h='md'/>
            <Group justify='space-between'>
              <Flex direction='column' justify='center' align='center'>
                <Text fw={400} fz='sm'>Estimated</Text>
                <Text fw={600} fz='lg'>{estimated}</Text>
              </Flex>
              <Flex direction='column' justify='center' align='center'>
                <Text fw={400} fz='sm'>Actual</Text>
                <Text fw={600} fz='lg'>{actual}</Text>
              </Flex>
              <Flex direction='column' justify='center' align='center'>
                <Text fw={400} fz='sm'>Difference</Text>
                <Text fw={600} fz='lg' c={difference >= 0 ? '#F20000' : '#088A45'}>
                  {difference >= 0 ? `+${difference} ${unitMap[metric]}` : `${difference} ${unitMap[metric]}`}
                </Text>
              </Flex>
            </Group>
          </Card>
        );
      })} */}
        {/* </SimpleGrid> */}
        <SimpleGrid cols={3}>
        <Card withBorder radius="md" bg="#e1e6f7" shadow="md">
          <Group>
            <IconUsers color="#4E66DE" size={39} />
            <Text fw={600} fz="md">Man Hours</Text>
          </Group>
          <Space h="md" />
          <Group justify="space-between">
            <Flex direction="column" justify="center" align="center">
              <Text fw={400} fz="sm">Estimated</Text>
              <Text fw={600} fz="lg">{manHours?.estimated || 0}</Text>
            </Flex>
            <Flex direction="column" justify="center" align="center">
              <Text fw={400} fz="sm">Actual</Text>
              <Text fw={600} fz="lg">{manHours?.actual || 0}</Text>
            </Flex>
            <Flex direction="column" justify="center" align="center">
              <Text fw={400} fz="sm">Difference</Text>
              <Text 
                fw={600} 
                fz="lg" 
                c={Number(calculateDifference(manHours)) >= 0 ? '#F20000' : '#088A45'}
              >
                {calculateDifference(manHours)} Hrs
              </Text>
            </Flex>
          </Group>
        </Card>

        <Card withBorder radius="md" bg="#e3fae8" shadow="md">
          <Group>
            <IconSettingsStar color="#088A45" size={39} />
            <Text fw={600} fz="md">Spare Parts</Text>
          </Group>
          <Space h="md" />
          <Group justify="space-between">
            <Flex direction="column" justify="center" align="center">
              <Text fw={400} fz="sm">Estimated</Text>
              <Text fw={600} fz="lg">{spareCost?.estimated || 0}</Text>
            </Flex>
            <Flex direction="column" justify="center" align="center">
              <Text fw={400} fz="sm">Actual</Text>
              <Text fw={600} fz="lg">{spareCost?.actual || 0}</Text>
            </Flex>
            <Flex direction="column" justify="center" align="center">
              <Text fw={400} fz="sm">Difference</Text>
              <Text 
                fw={600} 
                fz="lg" 
                c={Number(calculateDifference(spareCost)) >= 0 ? '#F20000' : '#088A45'}
              >
                {calculateDifference(spareCost)} $
              </Text>
            </Flex>
          </Group>
        </Card>

        <Card withBorder radius="md" bg="#fcfbe3" shadow="md">
          <Group>
            <IconClockCheck color="orange" size={39} />
            <Text fw={600} fz="md">TAT Time</Text>
          </Group>
          <Space h="md" />
          <Group justify="space-between">
            <Flex direction="column" justify="center" align="center">
              <Text fw={400} fz="sm">Estimated</Text>
              <Text fw={600} fz="lg">{tatTime?.estimated || 0}</Text>
            </Flex>
            <Flex direction="column" justify="center" align="center">
              <Text fw={400} fz="sm">Actual</Text>
              <Text fw={600} fz="lg">{tatTime?.actual || 0}</Text>
            </Flex>
            <Flex direction="column" justify="center" align="center">
              <Text fw={400} fz="sm">Difference</Text>
              <Text 
                fw={600} 
                fz="lg" 
                c={Number(calculateDifference(tatTime)) >= 0 ? '#F20000' : '#088A45'}
              >
                {calculateDifference(tatTime)} Hrs
              </Text>
            </Flex>
          </Group>
        </Card>
      </SimpleGrid>
        <Space h='md' />
        <SimpleGrid cols={2}>
        <Card>
          <Title order={5}>Estimated vs Actual Comparison</Title>
          <ReactApexChart
            type="bar"
            height={300}
            options={{
              chart: { type: "bar", toolbar: { show: true } },
              plotOptions: {
                bar: {
                  horizontal: false,
                  columnWidth: "50%",
                  borderRadius: 5,
                  borderRadiusApplication: "end",
                },
              },
              dataLabels: { enabled: true },
              xaxis: { categories },
              yaxis: { title: { text: "Values" } },
              fill: { opacity: 1 },
              tooltip: { y: { formatter: (val: number) => `${val}` } },
              grid: { padding: { right: 20 } },
              legend: { position: "bottom" },
              responsive: [
                {
                  breakpoint: 600,
                  options: { plotOptions: { bar: { columnWidth: "70%" } } },
                },
              ],
            }}
            series={[
              { name: "Estimated", data: estimatedData },
              { name: "Actual", data: actualData },
            ]}
          />
        </Card>

        <Card>
          <Title order={5}>Comparison Analysis</Title>
          <ReactApexChart
            type="radialBar"
            height={300}
            options={{
              chart: {
                height: 390,
                type: 'radialBar',
              },
              plotOptions: {
                radialBar: {
                  offsetY: 0,
                  startAngle: 0,
                  endAngle: 270,
                  hollow: {
                    margin: 5,
                    size: '30%',
                    background: 'transparent',
                    image: undefined,
                  },
                  dataLabels: {
                    name: { show: false },
                    value: { show: false }
                  },
                  barLabels: {
                    enabled: true,
                    useSeriesColors: true,
                    offsetX: -8,
                    fontSize: '16px',
                    formatter: function(seriesName, opts) {
                      return seriesName + ":  " + opts.w.globals.series[opts.seriesIndex]
                    },
                  },
                }
              },
              colors: ['#1ab7ea', '#0084ff', '#39539E'],
              labels: labels,
              responsive: [{
                breakpoint: 480,
                options: {
                  legend: { show: false }
                }
              }]
            }}
            series={series}
          />
        </Card>
      </SimpleGrid>
        {/* <SimpleGrid cols={2}>
          <Card>
            <Title order={5}>
              Estimated vs Actual Comparison
            </Title>
            <ReactApexChart
              type="bar"
              height={300}
              // width={Math.max(categories.length * 80, 400)} // Dynamic width for scrolling
              options={{
                chart: { type: "bar", toolbar: { show: true } },
                plotOptions: {
                  bar: {
                    horizontal: false,
                    columnWidth: "50%",
                    borderRadius: 5,
                    borderRadiusApplication: "end",
                  },
                },
                // colors: ["#4E66DE", "#F39C12"], // Blue for Estimated, Orange for Actual
                dataLabels: { enabled: true },
                xaxis: { categories },
                yaxis: { title: { text: "Values" } },
                fill: { opacity: 1 },
                tooltip: { y: { formatter: (val: number) => `${val}` } },
                grid: { padding: { right: 20 } },
                legend: { position: "bottom" },
                responsive: [
                  {
                    breakpoint: 600,
                    options: { plotOptions: { bar: { columnWidth: "70%" } } },
                  },
                ],
              }}
              series={[
                { name: "Estimated", data: estimatedData },
                { name: "Actual", data: actualData },
                // { name: "Difference", data: differenceData },
              ]}
            />
          </Card>
          <Card>
          <Title order={5}>
              Comparison Analysis
            </Title>
            <ReactApexChart
              type="radialBar"
              height={300}
              options={{
                chart: {
                  height: 390,
                  type: 'radialBar',
                },
                plotOptions: {
                  radialBar: {
                    offsetY: 0,
                    startAngle: 0,
                    endAngle: 270,
                    
                    hollow: {
                      margin: 5,
                      size: '30%',
                      background: 'transparent',
                      image: undefined,
                    },
                    dataLabels: {
                      name: {
                        show: false,
                      },
                      value: {
                        show: false,
                      }
                    },
                    barLabels: {
                      enabled: true,
                      useSeriesColors: true,
                      offsetX: -8,
                      fontSize: '16px',
                      formatter: function(seriesName, opts) {
                        return seriesName + ":  " + opts.w.globals.series[opts.seriesIndex]
                      },
                    },
                  }
                },
                colors: ['#1ab7ea', '#0084ff', '#39539E', '#0077B5'],
                labels: labels,
                responsive: [{
                  breakpoint: 480,
                  options: {
                    legend: {
                        show: false
                    }
                  }
                }]
              }}
              series= {series}
            />
          </Card>
        </SimpleGrid> */}


      </div>
    </>
  )
}


function uploadFile(selectedFile: File, selectedEstimateID: any) {
  throw new Error('Function not implemented.');
}
// export default CompareEstimate;