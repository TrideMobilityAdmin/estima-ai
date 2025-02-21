import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Switch,
  TextInput,
  Table,
  Group,
  Stack,
  ActionIcon,
  NumberInput,
  ScrollArea,
  Modal,
  Center,
} from '@mantine/core';
import { IconSettingsPlus, IconTrash } from '@tabler/icons-react';
import { useApi } from '../api/services/estimateSrvice';

interface SparePart {
  partID: string;
  quantity: number;
}

interface TaskRow {
  taskID: string;
  taskDescription: string;
  skill: string;
  manHours: number;
  spareParts: SparePart[];
}

interface Thresholds {
  tatThreshold: number;
  manHoursThreshold: number;
}

interface ApiData {
  defaultProbability: number;
  thresholds: Thresholds;
  miscLaborTasks: TaskRow[];
}

export default function ExpertInsights() {
  const { getAllDataExpertInsights, updateProbabilityWiseDetails } = useApi();
  const [isEditMode, setIsEditMode] = useState(false);
  const [probability, setProbability] = useState<any>(50);
  const [id, setId] = useState<string>('');
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds>({
    tatThreshold: 12.0,
    manHoursThreshold: 5.0
  });
  const [partsModalOpen, setPartsModalOpen] = useState(false);
  const [selectedTaskParts, setSelectedTaskParts] = useState<SparePart[]>([]);
  const [newPart, setNewPart] = useState<any>({ partID: '', quantity: 0 });
  const [currentTaskID, setCurrentTaskID] = useState<string | null>(null);

  useEffect(() => {
    fetchExpertInsights();
  }, []);

  const fetchExpertInsights = async () => {
    try {
      const data = await getAllDataExpertInsights();
      if (data && data.length > 0) {
        const insightData = data[0];
        setId(insightData._id);
        setProbability(insightData.defaultProbability);
        setThresholds(insightData.thresholds || {
          tatThreshold: 12.0,
          manHoursThreshold: 5.0
        });
        setTasks(insightData.miscLaborTasks);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddTask = () => {
    const newTask: TaskRow = {
      taskID: '',
      taskDescription: '',
      skill: '',
      manHours: 0,
      spareParts: [],
    };
    setTasks(prevTasks => [...prevTasks, newTask]);
  };

  const handleUpdateTask = (index: number, field: keyof TaskRow, value: any) => {
    setTasks(prevTasks => {
      const updatedTasks = [...prevTasks];
      updatedTasks[index] = {
        ...updatedTasks[index],
        [field]: value
      };
      return updatedTasks;
    });
  };

  const handleDeleteTask = (index: number) => {
    setTasks(prevTasks => prevTasks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      // Validate if all taskIDs are filled
      const emptyTaskIDs = tasks.some(task => !task.taskID.trim());
      if (emptyTaskIDs) {
        alert('Please fill in all Task IDs before saving');
        return;
      }

      // Prepare data in the exact required format
      const apiData: ApiData = {
        defaultProbability: Number(probability),
        thresholds: {
          tatThreshold: thresholds.tatThreshold,
          manHoursThreshold: thresholds.manHoursThreshold
        },
        miscLaborTasks: tasks.map(task => ({
          taskID: task.taskID,
          taskDescription: task.taskDescription,
          skill: task.skill,
          manHours: Number(task.manHours),
          spareParts: task.spareParts.map(part => ({
            partID: part.partID,
            quantity: Number(part.quantity)
          }))
        }))
      };

      // Call the update service with the exact data structure
      await updateProbabilityWiseDetails(id, apiData);
      setIsEditMode(false);
      
      // Refresh the data
      await fetchExpertInsights();
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const openPartsModal = (task: TaskRow, index: number) => {
    setSelectedTaskParts([...task.spareParts]);
    setCurrentTaskID(String(index));
    setPartsModalOpen(true);
    setNewPart({ partID: '', quantity: 0 });
  };

  const handleAddPart = () => {
    if (newPart.partID.trim() && newPart.quantity > 0) {
      setSelectedTaskParts(prevParts => [...prevParts, { ...newPart }]);
      setNewPart({ partID: '', quantity: 0 });
    }
  };

  const handleDeletePart = (index: number) => {
    setSelectedTaskParts(prevParts => prevParts.filter((_, i) => i !== index));
  };

  const handleSaveParts = () => {
    if (currentTaskID !== null) {
      const taskIndex = parseInt(currentTaskID);
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks];
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          spareParts: [...selectedTaskParts]
        };
        return updatedTasks;
      });
      setPartsModalOpen(false);
    }
  };

  return (
    <div style={{ padding: '20px 80px' }}>
      <Stack gap="md">
        <Group justify="right" gap="md">
          <Switch
            label="Enable Edit Mode"
            checked={isEditMode}
            onChange={(event) => setIsEditMode(event.currentTarget.checked)}
          />
          <Button color="green" onClick={handleSave} disabled={!isEditMode}>
            Save
          </Button>
        </Group>

        <Card shadow="sm" p="lg">
          <NumberInput
            w="20vw"
            label="Probability"
            value={probability}
            onChange={(value) => setProbability(value || 0)}
            disabled={!isEditMode}
            suffix="%"
            min={0}
            max={100}
          />
        </Card>

        <Card shadow="sm" p="lg">
          <Group justify="right" mb="md">
            <Button
              color="#00065e"
              onClick={handleAddTask}
              disabled={!isEditMode}
            >
              Add Task
            </Button>
          </Group>

          <ScrollArea>
            <Table highlightOnHover withTableBorder withColumnBorders>
              <thead>
                <tr>
                  <th style={{ minWidth: '180px' }}>Task ID</th>
                  <th style={{ minWidth: '220px' }}>Task Description</th>
                  <th style={{ minWidth: '100px' }}>Skill</th>
                  <th style={{ minWidth: '120px' }}>Man Hours</th>
                  <th style={{ minWidth: '120px' }}>Parts</th>
                  <th style={{ minWidth: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr key={index}>
                    <td>
                      <TextInput
                        value={task.taskID}
                        onChange={(e) =>
                          handleUpdateTask(index, 'taskID', e.target.value)
                        }
                        disabled={!isEditMode}
                        placeholder="Enter Task ID"
                      />
                    </td>
                    <td>
                      <TextInput
                        value={task.taskDescription}
                        onChange={(e) =>
                          handleUpdateTask(index, 'taskDescription', e.target.value)
                        }
                        disabled={!isEditMode}
                        placeholder="Enter Description"
                      />
                    </td>
                    <td>
                      <TextInput
                        value={task.skill}
                        onChange={(e) =>
                          handleUpdateTask(index, 'skill', e.target.value)
                        }
                        disabled={!isEditMode}
                        placeholder="Enter Skill"
                      />
                    </td>
                    <td>
                      <NumberInput
                        value={task.manHours}
                        onChange={(value) =>
                          handleUpdateTask(index, 'manHours', value || 0)
                        }
                        disabled={!isEditMode}
                        min={0}
                        placeholder="Enter Hours"
                      />
                    </td>
                    <td>
                      <Center>
                        <ActionIcon
                          variant="light"
                          color="cyan"
                          onClick={() => openPartsModal(task, index)}
                          disabled={!isEditMode}
                        >
                          <IconSettingsPlus />
                        </ActionIcon>
                      </Center>
                    </td>
                    <td>
                      <ActionIcon
                        variant="light"
                        color="red"
                        disabled={!isEditMode}
                        onClick={() => handleDeleteTask(index)}
                      >
                        <IconTrash size="1.125rem" />
                      </ActionIcon>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </ScrollArea>
        </Card>

        <Modal
          opened={partsModalOpen}
          onClose={() => setPartsModalOpen(false)}
          title="Spare Parts"
        >
          <Stack gap="md">
            <Group justify="right">
              <Button
                leftSection={<IconSettingsPlus size={20} />}
                size="xs"
                variant="light"
                onClick={handleAddPart}
              >
                Add Part
              </Button>
            </Group>

            <Table>
              <thead>
                <tr>
                  <th>Part ID</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedTaskParts.map((part, index) => (
                  <tr key={index}>
                    <td>{part.partID}</td>
                    <td>{part.quantity}</td>
                    <td>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDeletePart(index)}
                      >
                        <IconTrash size="1.125rem" />
                      </ActionIcon>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <TextInput
                      placeholder="Part ID"
                      value={newPart.partID}
                      onChange={(e) =>
                        setNewPart({ ...newPart, partID: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <NumberInput
                      placeholder="Quantity"
                      value={newPart.quantity}
                      onChange={(value) =>
                        setNewPart({ ...newPart, quantity: value || 0 })
                      }
                      min={0}
                    />
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </Table>

            <Group justify="right">
              <Button
                size="xs"
                variant="filled"
                color="green"
                onClick={handleSaveParts}
              >
                Save Parts
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </div>
  );
}
// import { useState, useEffect } from 'react';
// import {
//   Button,
//   Card,
//   Switch,
//   TextInput,
//   Table,
//   Select,
//   Group,
//   Stack,
//   ActionIcon,
//   NumberInput,
//   ScrollArea
// } from '@mantine/core';
// import { IconTrash, IconEdit, IconCheck } from '@tabler/icons-react';

// interface TaskRow {
//   id: string;
//   taskName: string;
//   flightName: string;
//   flightAge: number;
//   parameter: string;
//   description: string;
//   criteria: string;
//   qty: number;
// }

// interface InsightData {
//   probability: number;
//   tasks: TaskRow[];
// }

// const criteriaOptions = [
//   { value: 'manHrs', label: 'Man Hours' },
//   { value: 'spares', label: 'Spares' },
//   { value: 'tool', label: 'Tool' },
// ];

// export default function ExpertInsights() {
//   const [isEditMode, setIsEditMode] = useState(false);
//   const [probability, setProbability] = useState<any>(50);
//   const [tasks, setTasks] = useState<TaskRow[]>([]);
//   const [editingRowId, setEditingRowId] = useState<string | null>(null); // Track the row being edited

//   const createEmptyTask = (): TaskRow => ({
//     id: Date.now().toString(),
//     taskName: '',
//     flightName: '',
//     flightAge: 0,
//     parameter: '',
//     description: '',
//     criteria: '',
//     qty: 0,
//   });

//   useEffect(() => {
//     if (tasks.length === 0) {
//       setTasks([createEmptyTask()]);
//     }
//   }, [tasks]);

//   const handleAddTask = () => {
//     setTasks([...tasks, createEmptyTask()]);
//   };

//   const handleUpdateTask = (id: string, field: keyof TaskRow, value: any) => {
//     setTasks(tasks.map(task => 
//       task.id === id ? { ...task, [field]: value } : task
//     ));
//   };

//   const handleDeleteTask = (id: string) => {
//     setTasks(tasks.filter(task => task.id !== id));
//   };

//   const handleSave = async () => {
//     const data: InsightData = {
//       probability,
//       tasks,
//     };

//     try {
//       const response = await fetch('/api/expert-insights', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(data),
//       });

//       if (response.ok) {
//         setIsEditMode(false);
//         setEditingRowId(null);
//       }
//     } catch (error) {
//       console.error('Error saving data:', error);
//     }
//   };

//   return (
//     <div style={{ paddingLeft: 80, paddingRight: 80, paddingTop: 20, paddingBottom: 20 }}>
//       <Stack gap="md" p="md">
//         <Group justify="right" gap="md">
//           <Switch 
//             label="Enable Edit Mode" 
//             checked={isEditMode} 
//             onChange={(event) => {
//               setIsEditMode(event.currentTarget.checked);
//               setEditingRowId(null);
//             }} 
//           />
//           <Button color='green' onClick={handleSave} disabled={!isEditMode}>Save</Button>
//         </Group>

//         <Card shadow="sm" p="lg">
//           <NumberInput
//           w='20vw'
//             label="Probability"
//             value={probability}
//             onChange={(value) => setProbability(value || 0)}
//             // min={0}
//             // max={100}
//             disabled={!isEditMode}
//             suffix='%'
//             // rightSection="%"
//           />
//         </Card>

//         <Card shadow="sm" p="lg">
//           <Group justify="right" mb="md">
//             <Button color='#00065e' onClick={handleAddTask} disabled={!isEditMode}>Add Task</Button>
//           </Group>

//           <ScrollArea scrollHideDelay={0} w="100%" style={{ maxWidth: '100%', overflowX: 'auto' }}>
//             <Card>
//               <Table highlightOnHover withTableBorder withColumnBorders>
//                 <thead>
//                   <tr>
//                     <th style={{ minWidth: '180px' }}>Task Name</th>
//                     <th style={{ minWidth: '160px' }}>Flight Name</th>
//                     <th style={{ minWidth: '120px' }}>Flight Age</th>
//                     <th style={{ minWidth: '180px' }}>Parameter</th>
//                     <th style={{ minWidth: '220px' }}>Description</th>
//                     <th style={{ minWidth: '140px' }}>Criteria</th>
//                     <th style={{ minWidth: '100px' }}>Qty</th>
//                     <th style={{ minWidth: '120px' }}>Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {tasks.map((task) => {
//                     const isRowEditable = isEditMode && editingRowId === task.id;
//                     return (
//                       <tr key={task.id}>
//                         <td>
//                           <TextInput
//                             value={task.taskName}
//                             onChange={(e) => handleUpdateTask(task.id, 'taskName', e.target.value)}
//                             disabled={!isRowEditable}
//                           />
//                         </td>
//                         <td>
//                           <TextInput
//                             value={task.flightName}
//                             onChange={(e) => handleUpdateTask(task.id, 'flightName', e.target.value)}
//                             disabled={!isRowEditable}
//                           />
//                         </td>
//                         <td>
//                           <NumberInput
//                             value={task.flightAge}
//                             onChange={(value) => handleUpdateTask(task.id, 'flightAge', value)}
//                             disabled={!isRowEditable}
//                           />
//                         </td>
//                         <td>
//                           <TextInput
//                             value={task.parameter}
//                             onChange={(e) => handleUpdateTask(task.id, 'parameter', e.target.value)}
//                             disabled={!isRowEditable}
//                           />
//                         </td>
//                         <td>
//                           <TextInput
//                             value={task.description}
//                             onChange={(e) => handleUpdateTask(task.id, 'description', e.target.value)}
//                             disabled={!isRowEditable}
//                           />
//                         </td>
//                         <td>
//                           <Select
//                             value={task.criteria}
//                             onChange={(value) => handleUpdateTask(task.id, 'criteria', value)}
//                             data={criteriaOptions}
//                             disabled={!isRowEditable}
//                           />
//                         </td>
//                         <td>
//                           <NumberInput
//                             value={task.qty}
//                             onChange={(value) => handleUpdateTask(task.id, 'qty', value)}
//                             disabled={!isRowEditable}
//                           />
//                         </td>
//                         <td>
//                           <Group gap="xs">
//                             {isRowEditable ? (
//                               <ActionIcon
//                                 variant='light'
//                                 color="green"
//                                 onClick={() => setEditingRowId(null)} // Save changes & disable edit mode
//                               >
//                                 <IconCheck size="1.125rem" />
//                               </ActionIcon>
//                             ) : (
//                               <ActionIcon
//                                 variant='light'
//                                 color="blue"
//                                 disabled={!isEditMode}
//                                 onClick={() => setEditingRowId(task.id)} // Enable edit mode for this row
//                               >
//                                 <IconEdit size="1.125rem" />
//                               </ActionIcon>
//                             )}
//                             <ActionIcon
//                               variant='light'
//                               color="red"
//                               disabled={!isEditMode}
//                               onClick={() => handleDeleteTask(task.id)}
//                             >
//                               <IconTrash size="1.125rem" />
//                             </ActionIcon>
//                           </Group>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </Table>
//             </Card>
//           </ScrollArea>
          
//         </Card>
//       </Stack>
//     </div>
//   );
// }


// import { useState } from 'react';
// import {
//   Button,
//   Card,
//   Switch,
//   Group,
//   Stack,
//   ActionIcon,
//   NumberInput,
//   Box,
// } from '@mantine/core';
// import { IconTrash, IconEdit } from '@tabler/icons-react';
// import { AgGridReact } from 'ag-grid-react';
// import { 
//   ColDef,
//   ICellRendererParams,
//   GridReadyEvent,
//   CellValueChangedEvent,
// } from 'ag-grid-community';
// import 'ag-grid-community/styles/ag-grid.css';
// import 'ag-grid-community/styles/ag-theme-alpine.css';

// interface TaskRow {
//   id: string;
//   taskName: string;
//   flightName: string;
//   flightAge: number;
//   parameter: string;
//   description: string;
//   criteria: string;
//   qty: number;
//   cost: number;
// }

// interface InsightData {
//   probability: number;
//   tasks: TaskRow[];
// }

// // Context interface for the cell renderer
// interface GridContext {
//   isEditMode: boolean;
//   onEdit: (id: string) => void;
//   onDelete: (id: string) => void;
// }

// // Custom cell renderer component with proper typing
// const ActionsCellRenderer = (props: ICellRendererParams<TaskRow, any> & { context: GridContext }) => {
//   const { data, context } = props;
//   if (!data) return null;

//   return (
//     <Group gap="xs">
//       <ActionIcon
//         color="blue"
//         disabled={!context.isEditMode}
//         onClick={() => context.onEdit(data.id)}
//       >
//         <IconEdit size="1.125rem" />
//       </ActionIcon>
//       <ActionIcon
//         color="red"
//         disabled={!context.isEditMode}
//         onClick={() => context.onDelete(data.id)}
//       >
//         <IconTrash size="1.125rem" />
//       </ActionIcon>
//     </Group>
//   );
// };

// const criteriaOptions = [
//   { value: 'critical', label: 'Critical' },
//   { value: 'major', label: 'Major' },
//   { value: 'minor', label: 'Minor' },
// ];

// export default function ExpertInsightsScreen() {
//   const [isEditMode, setIsEditMode] = useState(false);
//   const [probability, setProbability] = useState<any>(0);
//   const [tasks, setTasks] = useState<TaskRow[]>([]);
//   const [gridApi, setGridApi] = useState<any>(null);

//   const createEmptyTask = (): TaskRow => ({
//     id: Date.now().toString(),
//     taskName: '',
//     flightName: '',
//     flightAge: 0,
//     parameter: '',
//     description: '',
//     criteria: '',
//     qty: 0,
//     cost: 0,
//   });

//   // Properly typed column definitions
//   const columnDefs: ColDef<TaskRow>[] = [
//     {
//       field: 'taskName',
//       headerName: 'Task Name',
//       editable: true,
//       minWidth: 150,
//     },
//     {
//       field: 'flightName',
//       headerName: 'Flight Name',
//       editable: true,
//       minWidth: 150,
//     },
//     {
//       field: 'flightAge',
//       headerName: 'Flight Age',
//       editable: true,
//       type: 'numericColumn',
//       minWidth: 120,
//     },
//     {
//       field: 'parameter',
//       headerName: 'Parameter',
//       editable: true,
//       minWidth: 150,
//     },
//     {
//       field: 'description',
//       headerName: 'Description',
//       editable: true,
//       minWidth: 200,
//     },
//     {
//       field: 'criteria',
//       headerName: 'Criteria',
//       editable: true,
//       cellEditor: 'agSelectCellEditor',
//       cellEditorParams: {
//         values: criteriaOptions.map(option => option.value),
//       },
//       minWidth: 120,
//     },
//     {
//       field: 'qty',
//       headerName: 'Qty',
//       editable: true,
//       type: 'numericColumn',
//       minWidth: 100,
//     },
//     {
//       field: 'cost',
//       headerName: 'Cost',
//       editable: true,
//       type: 'numericColumn',
//       valueFormatter: (params) => {
//         return params.value ? `$${params.value.toFixed(2)}` : '$0.00';
//       },
//       minWidth: 120,
//     },
//     {
//       headerName: 'Actions',
//       minWidth: 120,
//       cellRenderer: ActionsCellRenderer,
//       editable: false,
//       sortable: false,
//       filter: false,
//     },
//   ];

//   const defaultColDef: ColDef<TaskRow> = {
//     sortable: true,
//     filter: true,
//     resizable: true,
//     flex: 1,
//   };

//   const handleAddTask = () => {
//     setTasks([...tasks, createEmptyTask()]);
//   };

//   const handleEdit = (id: string) => {
//     const rowNode = gridApi.getRowNode(id);
//     if (rowNode) {
//       gridApi.startEditingCell({
//         rowIndex: rowNode.rowIndex,
//         colKey: 'taskName',
//       });
//     }
//   };

//   const handleDeleteTask = (id: string) => {
//     setTasks(tasks.filter(task => task.id !== id));
//   };

//   const handleGridReady = (params: GridReadyEvent<TaskRow>) => {
//     setGridApi(params.api);
//   };

//   // Properly typed cell value changed handler
//   const handleCellValueChanged = (params: CellValueChangedEvent<TaskRow>) => {
//     if (!params.data || !params.column || !params.column.getColId()) return;
    
//     const fieldName = params.column.getColId() as keyof TaskRow;
//     const newValue = params.newValue;
    
//     setTasks(prevTasks => 
//       prevTasks.map(task => 
//         task.id === params.data!.id 
//           ? { ...task, [fieldName]: newValue }
//           : task
//       )
//     );
//   };

//   const handleSave = async () => {
//     const data: InsightData = {
//       probability,
//       tasks,
//     };

//     try {
//       const response = await fetch('/api/expert-insights', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(data),
//       });

//       if (response.ok) {
//         setIsEditMode(false);
//       }
//     } catch (error) {
//       console.error('Error saving data:', error);
//     }
//   };

//   return (
//     <Stack gap="md" p="md">
//       <Group justify="right" gap="md">
//         <Switch
//           label="Edit Mode"
//           checked={isEditMode}
//           onChange={(event) => setIsEditMode(event.currentTarget.checked)}
//         />
//         <Button onClick={handleSave} disabled={!isEditMode}>
//           Save
//         </Button>
//       </Group>

//       <Card shadow="sm" p="lg">
//         <NumberInput
//           label="Probability"
//           value={probability}
//           onChange={(value) => setProbability(value || 0)}
//         //   precision={2}
//           min={0}
//           max={100}
//           disabled={!isEditMode}
//           rightSection="%"
//         />
//       </Card>

//       <Card shadow="sm" p="lg">
//         <Group justify="right" mb="md">
//           <Button onClick={handleAddTask} disabled={!isEditMode}>
//             Add Task
//           </Button>
//         </Group>

//         <Box className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
//           <AgGridReact<TaskRow>
//             rowData={tasks}
//             columnDefs={columnDefs}
//             defaultColDef={defaultColDef}
//             onCellValueChanged={handleCellValueChanged}
//             onGridReady={handleGridReady}
//             context={{
//               isEditMode,
//               onEdit: handleEdit,
//               onDelete: handleDeleteTask,
//             }}
//             suppressRowClickSelection={true}
//             enableRangeSelection={true}
//             readOnlyEdit={!isEditMode}
//             getRowId={(params) => params.data.id}
//           />
//         </Box>
//       </Card>
//     </Stack>
//   );
// }