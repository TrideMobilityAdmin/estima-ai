import React, { useState } from 'react';
import { Card, List, Table, Text, Flex, Title, SimpleGrid, Group, Select, Space, Button } from '@mantine/core';
import { AgGridReact } from 'ag-grid-react';
import DropZoneExcel from '../components/fileDropZone';
import { IconArrowMoveRight, IconClockCheck, IconCube, IconSettingsStar, IconUsers } from '@tabler/icons-react';
import ReactApexChart from 'react-apexcharts';

export default function CompareEstimate() {
  const [tasks, setTasks] = useState<string[]>([]);
  // Handle extracted tasks
  const handleTasks = (extractedTasks: string[]) => {
    setTasks(extractedTasks);
    console.log("tasks :", extractedTasks);
  };

  const jsonData = {
    estimateID: "Estimate-01",
    comparisionResult: [
      {
        metric: "TAT Time",
        estimated: 10,
        actual: 12
      },
      {
        metric: "Man Hours",
        estimated: 500,
        actual: 540
      },
      {
        metric: "Spare Cost",
        estimated: 3000,
        actual: 3500
      }
    ]
  };
  // Define icons and background colors based on metric name
  const metricConfig: Record<string, { icon: JSX.Element; bg: string; unit?: string }> = {
    "Man Hours": { icon: <IconUsers color="#4E66DE" size="39" />, bg: "#e1e6f7", unit: " Hrs" },
    "Spare Cost": { icon: <IconSettingsStar color="#088A45" size="39" />, bg: "#e3fae8", unit: " ₹" },
    "TAT Time": { icon: <IconClockCheck color="orange" size="39" />, bg: "#fcfbe3", unit: " Days" },
  };

   // Extract data for the bar graph
  const categories = jsonData.comparisionResult.map((item) => item.metric);
  const estimatedData = jsonData.comparisionResult.map((item) => item.estimated);
  const actualData = jsonData.comparisionResult.map((item) => item.actual);
  const differenceData = jsonData.comparisionResult.map((item) => item.actual - item.estimated);

  // Extract data for the radial bar  
const labels = jsonData.comparisionResult.map(item => item.metric);
const series = jsonData.comparisionResult.map(item => Math.round(((item.actual-item.estimated) / item.actual) * 100));
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
                w='18vw'
                // label=" Select Estimate Id"
                // placeholder="Select Estimate Type"
                data={['Estimate - 1', 'Estimate - 2', 'Estimate - 3', 'Estimate - 4']}
                defaultValue="Estimate - 1"
                allowDeselect
              />
            </Group>

          </Card>
          <Card  >
            <Group>
              <Text>
                Select Actual Data
              </Text>
              <DropZoneExcel
                name="Excel Files"
                changeHandler={handleTasks}
                color="green"
              />
            </Group>
          </Card>
        </SimpleGrid>
        <Group justify='center'>
          <Button
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
        <SimpleGrid cols={3}>
          {jsonData.comparisionResult.map(({ metric, estimated, actual }) => {
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
          })}
        </SimpleGrid>
        {/* <SimpleGrid cols={3}>
          <Card withBorder radius='md' bg='#e1e6f7' shadow='md'>
            <Group>
              <IconUsers color="#4E66DE" size='39' />
              <Text fw={600} fz='md' >
                Man Hours
              </Text>
            </Group>
            <Space h='md'/>
            <Group justify='space-between'>
              <Flex direction='column' justify='center' align='center'>
              <Text fw={400} fz='sm' >
                Estimated
              </Text>
              <Text fw={600} fz='lg' >
                500
              </Text>
              </Flex>
              <Flex direction='column' justify='center' align='center'>
              <Text fw={400} fz='sm' >
                Actual
              </Text>
              <Text fw={600} fz='lg' >
                540
              </Text>
              </Flex>
              <Flex direction='column' justify='center' align='center'>
              <Text fw={400} fz='sm' >
                Difference
              </Text>
              <Text fw={600} fz='lg' c='#F20000'>
                +40 Hrs
              </Text>
              </Flex>
            </Group>
          </Card>

          <Card withBorder radius='md' bg='#e3fae8' shadow='md'>
            <Group>
              <IconSettingsStar color="#088A45" size='39' />
              <Text fw={600} fz='md' >
                Spare Parts
              </Text>
            </Group>
            <Space h='md'/>
            <Group justify='space-between'>
              <Flex direction='column' justify='center' align='center'>
              <Text fw={400} fz='sm' >
                Estimated
              </Text>
              <Text fw={600} fz='lg' >
                500
              </Text>
              </Flex>
              <Flex direction='column' justify='center' align='center'>
              <Text fw={400} fz='sm' >
                Actual
              </Text>
              <Text fw={600} fz='lg' >
                540
              </Text>
              </Flex>
              <Flex direction='column' justify='center' align='center'>
              <Text fw={400} fz='sm' >
                Difference
              </Text>
              <Text fw={600} fz='lg' c='#F20000'>
                +40 Hrs
              </Text>
              </Flex>
            </Group>
          </Card>

          <Card withBorder radius='md' bg='#fcfbe3' shadow='md'>
            <Group>
              <IconClockCheck color="orange" size='39' />
              <Text fw={600} fz='md' >
                TAT Time
              </Text>
            </Group>
            <Space h='md'/>
            <Group justify='space-between'>
              <Flex direction='column' justify='center' align='center'>
              <Text fw={400} fz='sm' >
                Estimated
              </Text>
              <Text fw={600} fz='lg' >
                500
              </Text>
              </Flex>
              <Flex direction='column' justify='center' align='center'>
              <Text fw={400} fz='sm' >
                Actual
              </Text>
              <Text fw={600} fz='lg' >
                540
              </Text>
              </Flex>
              <Flex direction='column' justify='center' align='center'>
              <Text fw={400} fz='sm' >
                Difference
              </Text>
              <Text fw={600} fz='lg' c='#F20000'>
                +40 Hrs
              </Text>
              </Flex>
            </Group>
          </Card>
        </SimpleGrid> */}
        <Space h='md' />
        <SimpleGrid cols={2}>
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
        </SimpleGrid>


      </div>
    </>
  )
}

// export default CompareEstimate;