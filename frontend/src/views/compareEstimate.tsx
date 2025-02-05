import React, { useState } from 'react';
import { Card, List, Table, Text, Flex } from '@mantine/core';
import { AgGridReact } from 'ag-grid-react';

// Define types for the JSON data
interface SparePart {
  partId: string;
  desc: string;
  qty: number;
  unit: string;
  price: number;
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
  spareParts: SparePart[];
}

interface FindingDetail {
  logItem: string;
  desciption: string;
  mhs: ManHours;
  spareParts: SparePart[];
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

  // Get findings for the selected task
  const getFindingsForTask = (taskId: string) => {
    return findings.find((finding) => finding.taskId === taskId)?.details || [];
  };

  return (
    <Flex gap="md" p="md">
      {/* Left Section: Tasks List */}
      <Card withBorder shadow="sm" style={{ width: '25%' }}>
        <Text size="lg" fw={700} mb="md">Tasks List</Text>
        {/* <List> */}
          {tasks.map((task, taskIndex) => (
            <Card
              key={taskIndex}
              onClick={() => {
                setSelectedTask(task);
                setSelectedFinding(null); // Reset selected finding when task changes
              }}
              style={{ cursor: 'pointer', padding: '8px', backgroundColor: selectedTask?.sourceTask === task.sourceTask ? '#f0f0f0' : 'transparent' }}
            >
              {task.sourceTask}
            </Card>
          ))}
        {/* </List> */}
      </Card>

      {/* Middle Section: Task-wise Findings */}
      <Card withBorder shadow="sm" style={{ width: '35%' }}>
        <Text size="lg" fw={700} mb="md">Findings for {selectedTask?.sourceTask || 'Selected Task'}</Text>
        {selectedTask ? (
          <List>
            {getFindingsForTask(selectedTask.sourceTask).map((finding, findingIndex) => (
              <List.Item
                key={findingIndex}
                onClick={() => setSelectedFinding(finding)}
                style={{ cursor: 'pointer', padding: '8px', backgroundColor: selectedFinding?.logItem === finding.logItem ? '#f0f0f0' : 'transparent' }}
              >
                <Text fw={500}>Finding {findingIndex + 1}</Text>
                <Text size="sm">Log Item: {finding.logItem}</Text>
                <Text size="sm">Description: {finding.desciption}</Text>
              </List.Item>
            ))}
          </List>
        ) : (
          <Text>Select a task to view findings.</Text>
        )}
      </Card>

      {/* Right Section: Selected Finding Details */}
      <Card withBorder shadow="sm" style={{ width: '40%' }}>
        <Text size="lg" fw={700} mb="md">Finding Details</Text>
        {selectedFinding ? (
          <>
            <Text>Log Item: {selectedFinding.logItem}</Text>
            <Text>Description: {selectedFinding.desciption}</Text>
            <Text>Man Hours:</Text>
            <Table>
              <thead>
                <tr>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Avg</th>
                  <th>Est</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{selectedFinding.mhs.min}</td>
                  <td>{selectedFinding.mhs.max}</td>
                  <td>{selectedFinding.mhs.avg}</td>
                  <td>{selectedFinding.mhs.est}</td>
                </tr>
              </tbody>
            </Table>
            <Text>Spare Parts:</Text>
            <Table>
              <thead>
                <tr>
                  <th>Part ID</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {selectedFinding.spareParts.map((part, partIndex) => (
                  <tr key={partIndex}>
                    <td>{part.partId}</td>
                    <td>{part.desc}</td>
                    <td>{part.qty}</td>
                    <td>{part.unit}</td>
                    <td>{part.price}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        ) : (
          <Text>Select a finding to view details.</Text>
        )}
      </Card>
    </Flex>
  );
};

// Sample JSON data
const jsonData = {
  tasks: [
    {
      sourceTask: "255000-16-1",
      desciption: "CARGO COMPARTMENTS\n\nDETAILED INSPECTION OF DIVIDER NETS, DOOR NETS AND\nNET ATTACHMENT POINTS\n\nNOTE:\nTHE NUMBER OF AFFECTED ZONES MAY VARY ACCORDING TO",
      mhs: { max: 2, min: 2, avg: 2, est: 1.38 },
      spareParts: [],
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
          desciption: "WHILE CARRYING OUT MPD # 200435-01-1 (LH) ,FAN COMPARTMENT DETAILED INSPECTION OF EWIS IN THE FAN AND ACCESSORY GEAR BOX (EWIS ) FOUND CLAMP QTY # 2 CUSHION DAMAGED.",
          mhs: { max: 2, min: 2, avg: 2, est: 4 },
          spareParts: [],
        },
      ],
    },
  ],
};

const CompareEstimate = () => (
  <div style={{ padding: '20px' }}>
    <Text size="xl" fw={700} mb="md">Findings Wise</Text>
    <FindingsWiseSection tasks={jsonData.tasks} findings={jsonData.findings} />
    <div
className="ag-theme-alpine"
style={{
    width: "100%",
    height: "300px", // Set fixed height for AgGrid
    overflow: "hidden",
}}
>
<AgGridReact
    pagination
    paginationPageSize={10}
    // domLayout="autoHeight" // Ensures height adjusts dynamically
    rowData={[]}
    columnDefs={[
        
    ]}
/>
</div> 
  </div>
);

export default CompareEstimate;