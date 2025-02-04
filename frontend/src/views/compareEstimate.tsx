import React, { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Title,
  TextInput,
  Button,
  Table,
  Group,
  Text,
  Space,
  Card,
  SimpleGrid,
  Box,
  useMantineTheme,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title as ChartTitle, Tooltip, Legend } from 'chart.js';
import { IconUpload, IconX, IconFileSpreadsheet } from '@tabler/icons-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const CompareEstimate = () => {
  const theme = useMantineTheme();
  const [tasks, setTasks] = useState<any[]>([]);
  const [inputFields, setInputFields] = useState<string[]>(Array(10).fill(''));
  const [report, setReport] = useState<any>(null);

  const handleFileUpload = (files: File[]) => {
    const file = files[0];
    if (file) {
      // Process the Excel file and extract tasks
      // setTasks(extractedTasks);
    }
  };

  const handleGenerateReport = () => {
    // Generate report logic
    // setReport(generatedReport);
  };

  const handleInputChange = (index: number, value: string) => {
    const newInputFields = [...inputFields];
    newInputFields[index] = value;
    setInputFields(newInputFields);
  };

  const sparePartsCostData = {
    labels: ['Min', 'Max'],
    datasets: [
      {
        label: 'Spare Parts Cost',
        data: [report?.sparePartsCost.min || 0, report?.sparePartsCost.max || 0],
        backgroundColor: [theme.colors.blue[6], theme.colors.pink[6]],
        borderColor: [theme.colors.blue[6], theme.colors.pink[6]],
        borderWidth: 1,
      },
    ],
  };

  return (
    <Container size="xl" py="md">
      <Title order={1} mb="md">Excel Upload and Report Generation</Title>

      <Grid>
        {/* Excel Upload Section with Drag-and-Drop */}
        <Grid.Col span={4}>
          <Paper p="md" shadow="sm">
            <Title order={2} mb="md">Upload Excel</Title>
            <Dropzone
              onDrop={handleFileUpload}
              accept={[MIME_TYPES.xlsx, MIME_TYPES.xls]}
              maxSize={5 * 1024 ** 2} // 5 MB
            >
              <Group justify="center" gap="xl" style={{ minHeight: 120, pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload size={50} color={theme.colors.blue[6]} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={50} color={theme.colors.red[6]} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconFileSpreadsheet size={50} color={theme.colors.gray[6]} />
                </Dropzone.Idle>
                <div>
                  <Text size="xl" inline>Drag and drop an Excel file here</Text>
                  <Text size="sm" color="dimmed" inline mt={7}>File should not exceed 5 MB</Text>
                </div>
              </Group>
            </Dropzone>
          </Paper>
        </Grid.Col>

        {/* Task List */}
        <Grid.Col span={8}>
          <Paper p="md" shadow="sm">
            <Title order={2} mb="md">Task List</Title>
            <Table>
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr key={index}>
                    <td>{task.name}</td>
                    <td>{task.description}</td>
                    <td>{task.status}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Input Fields */}
      <Grid mt="md">
        {inputFields.map((value, index) => (
          <Grid.Col key={index} span={2}>
            <TextInput
              label={`Input ${index + 1}`}
              value={value}
              onChange={(e) => handleInputChange(index, e.target.value)}
            />
          </Grid.Col>
        ))}
      </Grid>

      {/* Generate Button */}
      <Group justify="center" mt="md">
        <Button onClick={handleGenerateReport}>Generate Report</Button>
      </Group>

      {/* Overall Report */}
      {report && (
        <Box mt="md">
          <Title order={2} mb="md">Overall Report</Title>
          <SimpleGrid cols={2} spacing="md">
            <Card shadow="sm">
              <Title order={3}>Total TAT and Value</Title>
              <Text>Total TAT: {report.totalTat}</Text>
              <Text>Total Value: {report.totalValue}</Text>
            </Card>
            <Card shadow="sm">
              <Title order={3}>Man Hours</Title>
              <Text>Min: {report.manHours.min}</Text>
              <Text>Max: {report.manHours.max}</Text>
              <Text>Avg: {report.manHours.avg}</Text>
            </Card>
          </SimpleGrid>

          <Space h="md" />

          <Card shadow="sm">
            <Title order={3}>Total Spares Used</Title>
            <Table>
              <thead>
                <tr>
                  <th>Part Name</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {report.sparesUsed.map((spare: any, index: number) => (
                  <tr key={index}>
                    <td>{spare.partName}</td>
                    <td>{spare.description}</td>
                    <td>{spare.quantity}</td>
                    <td>{spare.cost}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Space h="md" />

          <Grid>
            <Grid.Col span={6}>
              <Card shadow="sm">
                <Title order={3}>Spare Parts Cost (Min, Max)</Title>
                <Box>
                  <Chart type="bar" data={sparePartsCostData} />
                </Box>
              </Card>
            </Grid.Col>
            <Grid.Col span={6}>
              <Card shadow="sm">
                <Title order={3}>Capping Values</Title>
                <Text>Capping Man Hours: {report.cappingManHours}</Text>
                <Text>Capping Unbilled Cost: {report.cappingUnbilledCost}</Text>
              </Card>
            </Grid.Col>
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default CompareEstimate;