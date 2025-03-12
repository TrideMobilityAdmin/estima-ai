import { ActionIcon, Flex, Paper, Text, Group, Center, Space, Select, Stack } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useEffect, useState } from "react";
import { MdClose, MdFilePresent, MdUploadFile } from "react-icons/md";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface UploadDropZoneExcelProps {
  name: string;
  changeHandler: (
    file: File | null, 
    tasks: string[], 
    sheetInfo?: { 
      sheetName: string, 
      columnName: string 
    }
  ) => void;
  color?: string;
  selectedFile?: File | null;
  setSelectedFile?: (file: File | null) => void;
}

interface SheetInfo {
  name: string;
  columns: string[];
}

const RFQUploadDropZoneExcel = ({
  name,
  changeHandler,
  selectedFile,
  setSelectedFile,
  color,
}: UploadDropZoneExcelProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [tasks, setTasks] = useState<string[]>([]);
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [taskColumns, setTaskColumns] = useState<string[]>([]);
  const [selectedTaskColumn, setSelectedTaskColumn] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  useEffect(() => {
    // Only update local file state from props if it's different
    if (selectedFile !== file) {
      setFile(selectedFile || null);
      
      // If a file is passed from props and we haven't analyzed it yet, do so
      if (selectedFile && availableSheets.length === 0 && !isAnalyzing) {
        analyzeFile(selectedFile);
      }
    }
  }, [selectedFile]);

  // List of possible task column names for auto-detection
  const possibleTaskColumns = [
    "Task",
    "task",
    "TASK",
    "task-#",
    "Task-#",
    "TASK-#",
    "task#",
    "Task#",
    "TASK#",
    "taskno",
    "TaskNo",
    "TASKNO",
    "task_no",
    "Task_No",
    "TASK_NO",
    "MPD REF"
  ];

  const handleDrop = async (newFiles: File[]) => {
    if (newFiles.length > 0) {
      const droppedFile = newFiles[0];
      
      // Set local state
      setFile(droppedFile);
      
      // Update parent component's state if callback provided
      if (setSelectedFile) {
        setSelectedFile(droppedFile);
      }
      
      // Reset states
      setTasks([]);
      setSelectedSheet(null);
      setSelectedTaskColumn(null);
      setAvailableSheets([]);
      
      // Initial notification to parent with empty tasks array
      // This ensures any button dependent on file selection will be enabled
      changeHandler(droppedFile, [], undefined);
      
      console.log("✅ File Selected:", droppedFile.name);
      
      // Analyze the file for sheet and column data
      await analyzeFile(droppedFile);
    }
  };

  const analyzeFile = async (fileToAnalyze: File) => {
    if (!fileToAnalyze) return;
    
    setIsAnalyzing(true);
    const fileType = fileToAnalyze.name.split(".").pop()?.toLowerCase();
    
    try {
      if (fileType === "csv") {
        // For CSV files
        const text = await fileToAnalyze.text();
        
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results : any) => {
            console.log("📊 CSV Parse Results:", results);
            
            if (results.data.length === 0) {
              console.log("❌ No data found in CSV");
              setIsAnalyzing(false);
              return;
            }

            const columns = Object.keys(results.data[0]);
            
            // Create a pseudo-sheet for CSV
            const sheetInfo: SheetInfo = {
              name: "CSV Data",
              columns: columns
            };
            
            setAvailableSheets([sheetInfo]);
            setSelectedSheet(sheetInfo.name);
            setTaskColumns(columns);
            
            // Auto-select task column if possible
            const taskColumn = findTaskColumn(results.data[0]);
            if (taskColumn) {
              setSelectedTaskColumn(taskColumn);
              extractTasksFromCSV(text, taskColumn, fileToAnalyze);
            }
            
            setIsAnalyzing(false);
          },
          error: (error: any) => {
            console.error("❌ CSV Parse Error:", error);
            setIsAnalyzing(false);
          }
        });
      } else {
        // Handle Excel files with multiple sheets
        const buffer = await fileToAnalyze.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        
        const sheets: SheetInfo[] = [];
        
        // Analyze each sheet
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          
          // Get data with first row as header
          const jsonData : any = XLSX.utils.sheet_to_json(worksheet);
          
          let columns: string[] = [];
          
          if (jsonData.length > 0) {
            columns = Object.keys(jsonData[0]);
          }
          
          if (columns.length > 0) {
            sheets.push({
              name: sheetName,
              columns: columns
            });
          }
        });
        
        console.log("📑 Available Sheets:", sheets);
        setAvailableSheets(sheets);
        
        // Auto-select first sheet if available
        if (sheets.length > 0) {
          const firstSheet = sheets[0];
          setSelectedSheet(firstSheet.name);
          setTaskColumns(firstSheet.columns);
          
          // Try to auto-select task column
          const worksheet = workbook.Sheets[firstSheet.name];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length > 0) {
            const firstRow = jsonData[0];
            const taskColumn = findTaskColumn(firstRow);
            
            if (taskColumn) {
              setSelectedTaskColumn(taskColumn);
              extractTasksFromSheet(workbook, firstSheet.name, taskColumn, fileToAnalyze);
            }
          }
        }
        
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error("❌ File Analysis Error:", error);
      setIsAnalyzing(false);
    }
  };

  const findTaskColumn = (row: any): string | undefined => {
    // Find the first matching column that exists in the row
    const columnName = Object.keys(row).find(key => 
      possibleTaskColumns.includes(key) || 
      key.toLowerCase().includes('task')
    );

    console.log("🔍 Found Task Column:", columnName);
    return columnName;
  };

  const processTaskCell = (taskCell: any): string[] => {
    if (!taskCell) return [];
    
    const taskString = taskCell.toString().trim();
    if (!taskString) return [];

    // Split by comma or newline
    const tasks = taskString
      .split(/[,\n]/)
      .map((task: string) => task.trim())
      .filter((task: string) => task.length > 0)
      .map((task: string) => task.replace(/[^\w\s-/#]/g, "")); // Allow hyphen, forward slash, and hash

    console.log("📌 Processed Tasks:", tasks);
    return tasks;
  };

  const extractTasksFromSheet = async (
    workbook: XLSX.WorkBook, 
    sheetName: string, 
    columnName: string,
    currentFile: File
  ) => {
    console.log(`📊 Extracting Tasks from Sheet: ${sheetName}, Column: ${columnName}`);
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    const extractedTasks = new Set<string>();
    
    jsonData.forEach((row: any) => {
      const taskCell = row[columnName];
      const tasks = processTaskCell(taskCell);
      tasks.forEach(task => extractedTasks.add(task));
    });
    
    const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
    console.log("📌 Final Extracted Tasks:", uniqueTasks);
    
    setTasks(uniqueTasks);
    
    // Make sure we're using the current file reference, not the potentially stale closure value
    changeHandler(currentFile, uniqueTasks, { 
      sheetName, 
      columnName
    });
  };

  const extractTasksFromCSV = async (
    csvText: string, 
    columnName: string,
    currentFile: File
  ) => {
    console.log(`📊 Extracting Tasks from CSV, Column: ${columnName}`);
    
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const extractedTasks = new Set<string>();
        
        results.data.forEach((row: any) => {
          const taskCell = row[columnName];
          const tasks = processTaskCell(taskCell);
          tasks.forEach(task => extractedTasks.add(task));
        });
        
        const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
        console.log("📌 Final Extracted Tasks from CSV:", uniqueTasks);
        
        setTasks(uniqueTasks);
        
        // Make sure we're using the current file reference, not the potentially stale closure value
        changeHandler(currentFile, uniqueTasks, { 
          sheetName: "CSV Data", 
          columnName
        });
      }
    });
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!file || !sheetName) return;
    
    setSelectedSheet(sheetName);
    setSelectedTaskColumn(null);
    setTasks([]);
    
    // Update columns based on selected sheet
    const sheet = availableSheets.find(s => s.name === sheetName);
    if (sheet) {
      setTaskColumns(sheet.columns);
    }
    
    // Clear tasks in parent component
    changeHandler(file, [], undefined);
  };

  const handleColumnChange = async (columnName: string) => {
    if (!file || !selectedSheet || !columnName) return;
    
    setSelectedTaskColumn(columnName);
    
    const fileType = file.name.split(".").pop()?.toLowerCase();
    
    if (fileType === "csv") {
      const text = await file.text();
      extractTasksFromCSV(text, columnName, file);
    } else {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      extractTasksFromSheet(workbook, selectedSheet, columnName, file);
    }
  };

  const removeFile = () => {
    setFile(null);
    setTasks([]);
    setSelectedSheet(null);
    setSelectedTaskColumn(null);
    setAvailableSheets([]);
    setTaskColumns([]);
    
    if (setSelectedFile) {
      setSelectedFile(null);
    }
    
    changeHandler(null, []);
  };

  return (
    <div className="w-full">
      {!file ? (
        <Dropzone
          accept={[
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel.sheet.macroEnabled.12",
            "application/csv",
            ".csv",
            ".xls",
            ".xlsx",
            ".xlsm",
          ]}
          styles={{
            root: {
              height: "12vh",
              width: "100%",
              borderColor: color || "#ced4da",
              borderStyle: "dashed",
              borderWidth: 2,
              borderRadius: 10,
              backgroundColor: "#F4F4F4",
              textAlign: "center",
              padding: "1.5em",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            },
          }}
          onDrop={handleDrop}
          multiple={false}
        >
          <Flex direction='row' align='center' gap="xl">
            <MdUploadFile size={50} color={color || "#1a73e8"} />
            <Text c="dimmed" size="sm">
              Drag and drop your {name} here, or click to select a file
            </Text>
          </Flex>
        </Dropzone>
      ) : (
        <div>
          <Space h='sm'/>
          <Flex gap="md" justify="center" align="center" direction="column">
            <Paper
              withBorder
              shadow="xs"
              radius="md"
              p="sm"
              style={{ display: "flex", gap: "0.5em", minWidth: "200px" }}
            >
              <MdFilePresent size={24} color="#1a73e8" />
              <Text size="sm" lineClamp={1}>
                {file.name}
              </Text>
              <ActionIcon onClick={removeFile} color="red" variant="transparent">
                <MdClose size={16} />
              </ActionIcon>
            </Paper>
            
            {isAnalyzing ? (
              <Text size="xs" color="dimmed">Analyzing file...</Text>
            ) : (
              <>
                {availableSheets.length > 0 && (
                  <Stack w="100%" gap="xs">
                    <Select
                      label="Select Sheet"
                      placeholder="Choose a sheet"
                      data={availableSheets.map(sheet => ({ value: sheet.name, label: sheet.name }))}
                      value={selectedSheet}
                      onChange={(value) => value && handleSheetChange(value)}
                      searchable
                      clearable={false}
                      size="xs"
                    />
                    
                    {selectedSheet && (
                      <Select
                        label="Select Task Column"
                        placeholder="Choose a column containing tasks"
                        data={taskColumns.map(col => ({ value: col, label: col }))}
                        value={selectedTaskColumn}
                        onChange={(value) => value && handleColumnChange(value)}
                        searchable
                        clearable={false}
                        size="xs"
                        disabled={taskColumns.length === 0}
                      />
                    )}
                    
                    {tasks.length > 0 && (
                      <Paper withBorder p="xs" radius="md">
                        <Text size="xs" fw={500}>
                          Extracted {tasks.length} task(s)
                        </Text>
                        <Text size="xs" color="dimmed" lineClamp={2}>
                          {tasks.slice(0, 5).join(", ")}
                          {tasks.length > 5 ? ` and ${tasks.length - 5} more...` : ""}
                        </Text>
                      </Paper>
                    )}
                  </Stack>
                )}
              </>
            )}
          </Flex>
        </div>
      )}
    </div>
  );
};

export default RFQUploadDropZoneExcel;

// // RFQUploadDropZoneExcel.tsx
// import { ActionIcon, Flex, Paper, Text, Group, Center, Space } from "@mantine/core";
// import { Dropzone } from "@mantine/dropzone";
// import { useEffect, useState } from "react";
// import { MdClose, MdFilePresent, MdUploadFile } from "react-icons/md";
// import * as XLSX from "xlsx";
// import Papa from "papaparse";

// interface UploadDropZoneExcelProps {
//   name: string;
//   changeHandler: (file: File | null, tasks: string[]) => void;
//   color?: string;
//   selectedFile?: File | null;
//   setSelectedFile?: (file: File | null) => void;
// }

// const RFQUploadDropZoneExcel = ({
//   name,
//   changeHandler,
//   selectedFile,
//   setSelectedFile,
//   color,
// }: UploadDropZoneExcelProps) => {
//   const [file, setFile] = useState<File | null>(null);
//   const [tasks, setTasks] = useState<string[]>([]);

//   useEffect(() => {
//     setFile(selectedFile || null);
//   }, [selectedFile]);

//   const handleDrop = async (newFiles: File[]) => {
//     if (newFiles.length > 0) {
//       const selectedFile = newFiles[0];
//       setFile(selectedFile);
//       console.log("✅ File Selected:", selectedFile.name);
//       await extractTasks(selectedFile);
//     }
//   };

//   const findTaskColumn = (row: any): string | undefined => {
//     // List of possible task column names
//     const possibleColumns = [
//       "Task",
//       "task",
//       "TASK",
//       "task-#",
//       "Task-#",
//       "TASK-#",
//       "task#",
//       "Task#",
//       "TASK#",
//       "taskno",
//       "TaskNo",
//       "TASKNO",
//       "task_no",
//       "Task_No",
//       "TASK_NO",
//       "MPD REF"
//     ];

//     // Find the first matching column that exists in the row
//     const columnName = Object.keys(row).find(key => 
//       possibleColumns.includes(key) || 
//       key.toLowerCase().includes('task')
//     );

//     console.log("🔍 Found Task Column:", columnName);
//     return columnName;
//   };

//   const processTaskCell = (taskCell: any): string[] => {
//     if (!taskCell) return [];
    
//     const taskString = taskCell.toString().trim();
//     if (!taskString) return [];

//     // Split by comma or newline
//     const tasks = taskString
//       .split(/[,\n]/)
//       .map((task: string) => task.trim())
//       .filter((task: string) => task.length > 0)
//       .map((task: string) => task.replace(/[^\w\s-/#]/g, "")); // Allow hyphen, forward slash, and hash

//     console.log("📌 Processed Tasks:", tasks);
//     return tasks;
//   };

//   const extractTasks = async (file: File) => {
//     const fileType = file.name.split(".").pop()?.toLowerCase();
    
//     try {
//       if (fileType === "csv") {
//         // Handle CSV files
//         const text = await file.text();
//         Papa.parse(text, {
//           header: true,
//           skipEmptyLines: true,
//           complete: (results) => {
//             console.log("📊 CSV Parse Results:", results);
            
//             if (results.data.length === 0) {
//               console.log("❌ No data found in CSV");
//               return;
//             }

//             const extractedTasks = new Set<string>();
//             const firstRow = results.data[0];
//             const taskColumnName = findTaskColumn(firstRow);

//             if (!taskColumnName) {
//               console.log("❌ No task column found in CSV");
//               return;
//             }

//             results.data.forEach((row: any) => {
//               console.log("🔍 Processing Row:", row);
//               const taskCell = row[taskColumnName];
//               console.log("📌 Task Cell Value:", taskCell);
              
//               const tasks = processTaskCell(taskCell);
//               tasks.forEach(task => extractedTasks.add(task));
//             });

//             const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
//             console.log("📌 Final Extracted Tasks:", uniqueTasks);
//             setTasks(uniqueTasks);
//             changeHandler(file, uniqueTasks);
//           },
//           error: (error :any) => {
//             console.error("❌ CSV Parse Error:", error);
//           }
//         });
//       } else {
//         // Handle Excel files
//         const buffer = await file.arrayBuffer();
//         const workbook = XLSX.read(buffer, { type: "array" });
//         const sheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[sheetName];
//         const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
//         console.log("📊 Excel Parse Results:", jsonData);
        
//         if (jsonData.length === 0) {
//           console.log("❌ No data found in Excel");
//           return;
//         }

//         const extractedTasks = new Set<string>();
//         const firstRow = jsonData[0];
//         const taskColumnName = findTaskColumn(firstRow);

//         if (!taskColumnName) {
//           console.log("❌ No task column found in Excel");
//           return;
//         }

//         jsonData.forEach((row: any) => {
//           console.log("🔍 Processing Row:", row);
//           const taskCell = row[taskColumnName];
//           console.log("📌 Task Cell Value:", taskCell);
          
//           const tasks = processTaskCell(taskCell);
//           tasks.forEach(task => extractedTasks.add(task));
//         });

//         const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
//         console.log("📌 Final Extracted Tasks:", uniqueTasks);
//         setTasks(uniqueTasks);
//         changeHandler(file, uniqueTasks);
//       }
//     } catch (error) {
//       console.error("❌ File Processing Error:", error);
//     }
//   };

//   const removeFile = () => {
//     setFile(null);
//     setTasks([]);
//     setSelectedFile?.(null);
//     changeHandler(null, []);
//   };

//   return (
//     <div className="w-full">
//       <Dropzone
//         accept={[
//           "text/csv",
//           "application/vnd.ms-excel",
//           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//           "application/vnd.ms-excel.sheet.macroEnabled.12",
//           "application/csv",
//           ".csv",
//           ".xls",
//           ".xlsx",
//           ".xlsm",
//         ]}
//         styles={{
//           root: {
//             height: "12vh",
//             width: "100%",
//             borderColor: color || "#ced4da",
//             borderStyle: "dashed",
//             borderWidth: 2,
//             borderRadius: 10,
//             backgroundColor: "#F4F4F4",
//             textAlign: "center",
//             padding: "1.5em",
//             cursor: "pointer",
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             flexDirection: "column",
//           },
//         }}
//         onDrop={handleDrop}
//         multiple={false}
//       >
//         <Flex direction='row'  align='center' gap="xl">
//           <MdUploadFile size={50} color={color || "#1a73e8"} />
//           <Text c="dimmed" size="sm">
//             Drag and drop your {name} here, or click to select a file
//           </Text>
//         </Flex>
//       </Dropzone>

//       {file && (
//         <div className="mt-4">
//           <Space h='sm'/>
//           <Flex gap="md" justify="center" align="center" direction="row">
//             <Paper
//               withBorder
//               // w={200}
//               shadow="xs"
//               radius="md"
//               p="sm"
//               style={{ display: "flex", gap: "0.5em", minWidth: "200px" }}
//             >
//               <MdFilePresent size={24} color="#1a73e8" />
//               <Text size="sm" lineClamp={1}>
//                 {file.name}
//               </Text>
//               <ActionIcon onClick={removeFile} color="red" variant="transparent">
//                 <MdClose size={16} />
//               </ActionIcon>
//             </Paper>
//           </Flex>
//         </div>
//       )}
//     </div>
//   );
// };

// export default RFQUploadDropZoneExcel;