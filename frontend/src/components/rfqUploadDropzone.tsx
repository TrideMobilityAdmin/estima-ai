// import { ActionIcon, Flex, Paper, Text, Group, Center, Space, Select, Stack, Switch } from "@mantine/core";
// import { Dropzone } from "@mantine/dropzone";
// import { useEffect, useState } from "react";
// import { MdClose, MdFilePresent, MdUploadFile } from "react-icons/md";
// import * as XLSX from "xlsx";
// import Papa from "papaparse";

// interface UploadDropZoneExcelProps {
//   name: string;
//   changeHandler: (
//     file: File | null, 
//     tasks: string[], 
//     sheetInfo?: { 
//       sheetName: string, 
//       columnName: string, 
//       headerRowIndex: number 
//     }
//   ) => void;
//   color?: string;
//   selectedFile?: File | null;
//   setSelectedFile?: (file: File | null) => void;
// }

// interface SheetInfo {
//   name: string;
//   columns: { first: string[], second: string[] };
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
//   const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
//   const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
//   const [taskColumns, setTaskColumns] = useState<string[]>([]);
//   const [selectedTaskColumn, setSelectedTaskColumn] = useState<string | null>(null);
//   const [useSecondRowAsHeader, setUseSecondRowAsHeader] = useState<boolean>(false);

//   useEffect(() => {
//     setFile(selectedFile || null);
//   }, [selectedFile]);

//   // List of possible task column names for auto-detection
//   const possibleTaskColumns = [
//     "Task",
//     "task",
//     "TASK",
//     "task-#",
//     "Task-#",
//     "TASK-#",
//     "task#",
//     "Task#",
//     "TASK#",
//     "taskno",
//     "TaskNo",
//     "TASKNO",
//     "task_no",
//     "Task_No",
//     "TASK_NO",
//     "MPD REF"
//   ];

//   const handleDrop = async (newFiles: File[]) => {
//     if (newFiles.length > 0) {
//       const selectedFile = newFiles[0];
//       setFile(selectedFile);
//       console.log("✅ File Selected:", selectedFile.name);
      
//       // Reset states
//       setTasks([]);
//       setSelectedSheet(null);
//       setSelectedTaskColumn(null);
//       setUseSecondRowAsHeader(false);
      
//       await analyzeFile(selectedFile);
//     }
//   };

//   const analyzeFile = async (file: File) => {
//     const fileType = file.name.split(".").pop()?.toLowerCase();
    
//     try {
//       if (fileType === "csv") {
//         // For CSV, analyze both first and second rows
//         const text = await file.text();
        
//         // First, parse with first row as header
//         Papa.parse(text, {
//           header: true,
//           skipEmptyLines: true,
//           complete: (results : any) => {
//             console.log("📊 CSV Parse Results (First row as header):", results);
            
//             if (results.data.length === 0) {
//               console.log("❌ No data found in CSV");
//               return;
//             }

//             const firstRowColumns = Object.keys(results.data[0]);
            
//             // Now try to parse with second row as header
//             let secondRowColumns: string[] = [];
            
//             // Create a new parser to read raw data without headers
//             Papa.parse(text, {
//               header: false,
//               skipEmptyLines: true,
//               complete: (rawResults) => {
//                 if (rawResults.data.length >= 2) {
//                   // Use the second row as potential headers
//                   const secondRow = rawResults.data[1] as string[];
//                   secondRowColumns = secondRow.map(col => col?.toString() || '');
                  
//                   // Create a pseudo-sheet for CSV with both header options
//                   const sheetInfo: SheetInfo = {
//                     name: "CSV Data",
//                     columns: {
//                       first: firstRowColumns,
//                       second: secondRowColumns
//                     }
//                   };
                  
//                   setAvailableSheets([sheetInfo]);
//                   setSelectedSheet(sheetInfo.name);
//                   setTaskColumns(firstRowColumns); // Default to first row headers
                  
//                   // Auto-select task column if possible
//                   const taskColumn = findTaskColumn(results.data[0]);
//                   if (taskColumn) {
//                     setSelectedTaskColumn(taskColumn);
//                     extractTasksFromCSV(text, taskColumn, false);
//                   }
//                 }
//               }
//             });
//           },
//           error: (error: any) => {
//             console.error("❌ CSV Parse Error:", error);
//           }
//         });
//       } else {
//         // Handle Excel files with multiple sheets
//         const buffer = await file.arrayBuffer();
//         const workbook = XLSX.read(buffer, { type: "array" });
        
//         const sheets: SheetInfo[] = [];
        
//         // Analyze each sheet - check both first and second rows
//         workbook.SheetNames.forEach(sheetName => {
//           const worksheet = workbook.Sheets[sheetName];
          
//           // Get data with first row as header
//           const jsonDataFirstRow : any= XLSX.utils.sheet_to_json(worksheet);
          
//           // Get raw data to analyze second row
//           const jsonDataRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
//           let firstRowColumns: string[] = [];
//           let secondRowColumns: string[] = [];
          
//           if (jsonDataFirstRow.length > 0) {
//             firstRowColumns = Object.keys(jsonDataFirstRow[0]);
//           }
          
//           if (jsonDataRaw.length >= 2) {
//             // Check if second row has potential header values
//             const secondRow = jsonDataRaw[1] as any[];
//             secondRowColumns = secondRow.map(cell => cell?.toString() || '');
//           }
          
//           if (firstRowColumns.length > 0 || secondRowColumns.length > 0) {
//             sheets.push({
//               name: sheetName,
//               columns: {
//                 first: firstRowColumns,
//                 second: secondRowColumns
//               }
//             });
//           }
//         });
        
//         console.log("📑 Available Sheets:", sheets);
//         setAvailableSheets(sheets);
        
//         // Auto-select first sheet if available
//         if (sheets.length > 0) {
//           const firstSheet = sheets[0];
//           setSelectedSheet(firstSheet.name);
//           setTaskColumns(firstSheet.columns.first); // Default to first row headers
          
//           // Try to auto-select task column
//           const worksheet = workbook.Sheets[firstSheet.name];
//           const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
//           if (jsonData.length > 0) {
//             const firstRow = jsonData[0];
//             const taskColumn = findTaskColumn(firstRow);
            
//             if (taskColumn) {
//               setSelectedTaskColumn(taskColumn);
//               extractTasksFromSheet(workbook, firstSheet.name, taskColumn, false);
//             }
//           }
//         }
//       }
//     } catch (error) {
//       console.error("❌ File Analysis Error:", error);
//     }
//   };

//   const findTaskColumn = (row: any): string | undefined => {
//     // Find the first matching column that exists in the row
//     const columnName = Object.keys(row).find(key => 
//       possibleTaskColumns.includes(key) || 
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

//   const extractTasksFromSheet = async (
//     workbook: XLSX.WorkBook, 
//     sheetName: string, 
//     columnName: string,
//     useSecondRow: boolean
//   ) => {
//     console.log(`📊 Extracting Tasks from Sheet: ${sheetName}, Column: ${columnName}, Using Second Row: ${useSecondRow}`);
    
//     const worksheet = workbook.Sheets[sheetName];
    
//     let jsonData;
    
//     if (useSecondRow) {
//       // Get raw data
//       const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
//       if (rawData.length < 2) {
//         console.log("❌ Not enough rows for second row as header");
//         return;
//       }
      
//       // Extract header row (second row)
//       const headers = rawData[1] as any[];
      
//       // Extract data rows (third row and beyond)
//       const dataRows = rawData.slice(2);
      
//       // Convert raw data to objects using second row as headers
//       jsonData = dataRows?.map((row:any) => {
//         const obj: Record<string, any> = {};
//         headers.forEach((header, index) => {
//           if (header) {
//             obj[header.toString()] = row[index];
//           }
//         });
//         return obj;
//       });
//     } else {
//       // Normal case - first row as header
//       jsonData = XLSX.utils.sheet_to_json(worksheet);
//     }
    
//     const extractedTasks = new Set<string>();
    
//     jsonData.forEach((row: any) => {
//       const taskCell = row[columnName];
//       const tasks = processTaskCell(taskCell);
//       tasks.forEach(task => extractedTasks.add(task));
//     });
    
//     const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
//     console.log("📌 Final Extracted Tasks:", uniqueTasks);
    
//     setTasks(uniqueTasks);
//     changeHandler(file, uniqueTasks, { 
//       sheetName, 
//       columnName, 
//       headerRowIndex: useSecondRow ? 1 : 0 
//     });
//   };

//   const extractTasksFromCSV = async (
//     csvText: string, 
//     columnName: string,
//     useSecondRow: boolean
//   ) => {
//     console.log(`📊 Extracting Tasks from CSV, Column: ${columnName}, Using Second Row: ${useSecondRow}`);
    
//     if (useSecondRow) {
//       // Parse raw data first
//       Papa.parse(csvText, {
//         header: false,
//         skipEmptyLines: true,
//         complete: (rawResults) => {
//           if (rawResults.data.length < 2) {
//             console.log("❌ Not enough rows for second row as header");
//             return;
//           }
          
//           // Get headers from second row
//           const headers = rawResults.data[1] as string[];
          
//           // Get data starting from third row
//           const dataRows = rawResults.data.slice(2);
          
//           // Convert to objects using second row as headers
//           const jsonData = dataRows.map((row: any) => {
//             const obj: Record<string, any> = {};
//             headers.forEach((header, index) => {
//               if (header) {
//                 obj[header.toString()] = row[index];
//               }
//             });
//             return obj;
//           });
          
//           // Extract tasks
//           const extractedTasks = new Set<string>();
          
//           jsonData.forEach((row: any) => {
//             const taskCell = row[columnName];
//             const tasks = processTaskCell(taskCell);
//             tasks.forEach(task => extractedTasks.add(task));
//           });
          
//           const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
//           console.log("📌 Final Extracted Tasks from CSV (second row header):", uniqueTasks);
          
//           setTasks(uniqueTasks);
//           changeHandler(file, uniqueTasks, { 
//             sheetName: "CSV Data", 
//             columnName, 
//             headerRowIndex: 1 
//           });
//         }
//       });
//     } else {
//       // Normal case - first row as header
//       Papa.parse(csvText, {
//         header: true,
//         skipEmptyLines: true,
//         complete: (results) => {
//           const extractedTasks = new Set<string>();
          
//           results.data.forEach((row: any) => {
//             const taskCell = row[columnName];
//             const tasks = processTaskCell(taskCell);
//             tasks.forEach(task => extractedTasks.add(task));
//           });
          
//           const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
//           console.log("📌 Final Extracted Tasks from CSV:", uniqueTasks);
          
//           setTasks(uniqueTasks);
//           changeHandler(file, uniqueTasks, { 
//             sheetName: "CSV Data", 
//             columnName, 
//             headerRowIndex: 0 
//           });
//         }
//       });
//     }
//   };

//   const handleSheetChange = async (sheetName: string) => {
//     if (!file || !sheetName) return;
    
//     setSelectedSheet(sheetName);
//     setSelectedTaskColumn(null);
//     setTasks([]);
    
//     // Reset to first row headers by default when changing sheets
//     const sheet = availableSheets.find(s => s.name === sheetName);
//     if (sheet) {
//       setTaskColumns(useSecondRowAsHeader ? sheet.columns.second : sheet.columns.first);
//     }
//   };

//   const handleHeaderRowChange = (useSecond: boolean) => {
//     setUseSecondRowAsHeader(useSecond);
//     setSelectedTaskColumn(null);
//     setTasks([]);
    
//     if (selectedSheet) {
//       const sheet = availableSheets.find(s => s.name === selectedSheet);
//       if (sheet) {
//         setTaskColumns(useSecond ? sheet.columns.second : sheet.columns.first);
//       }
//     }
//   };

//   const handleColumnChange = async (columnName: string) => {
//     if (!file || !selectedSheet || !columnName) return;
    
//     setSelectedTaskColumn(columnName);
    
//     const fileType = file.name.split(".").pop()?.toLowerCase();
    
//     if (fileType === "csv") {
//       const text = await file.text();
//       extractTasksFromCSV(text, columnName, useSecondRowAsHeader);
//     } else {
//       const buffer = await file.arrayBuffer();
//       const workbook = XLSX.read(buffer, { type: "array" });
//       extractTasksFromSheet(workbook, selectedSheet, columnName, useSecondRowAsHeader);
//     }
//   };

//   const removeFile = () => {
//     setFile(null);
//     setTasks([]);
//     setSelectedSheet(null);
//     setSelectedTaskColumn(null);
//     setAvailableSheets([]);
//     setTaskColumns([]);
//     setUseSecondRowAsHeader(false);
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
//         <Flex direction='row' align='center' gap="xl">
//           <MdUploadFile size={50} color={color || "#1a73e8"} />
//           <Text c="dimmed" size="sm">
//             Drag and drop your {name} here, or click to select a file
//           </Text>
//         </Flex>
//       </Dropzone>

//       {file && (
//         <div className="mt-4">
//           <Space h='sm'/>
//           <Flex gap="md" justify="center" align="center" direction="column">
//             <Paper
//               withBorder
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
            
//             {availableSheets.length > 0 && (
//               <Stack w="100%" gap="xs">
//                 <Select
//                   label="Select Sheet"
//                   placeholder="Choose a sheet"
//                   data={availableSheets.map(sheet => ({ value: sheet.name, label: sheet.name }))}
//                   value={selectedSheet}
//                   onChange={(value) => value && handleSheetChange(value)}
//                   searchable
//                   clearable={false}
//                   size="xs"
//                 />
                
//                 {selectedSheet && (
//                   <>
//                     <Flex align="center" gap="xs">
//                       <Switch
//                         label="Use second row as header"
//                         checked={useSecondRowAsHeader}
//                         onChange={(event) => handleHeaderRowChange(event.currentTarget.checked)}
//                         size="xs"
//                       />
//                     </Flex>
                    
//                     <Select
//                       label="Select Task Column"
//                       placeholder="Choose a column containing tasks"
//                       data={taskColumns.map(col => ({ value: col, label: col }))}
//                       value={selectedTaskColumn}
//                       onChange={(value) => value && handleColumnChange(value)}
//                       searchable
//                       clearable={false}
//                       size="xs"
//                       disabled={taskColumns.length === 0}
//                     />
//                   </>
//                 )}
                
//                 {tasks.length > 0 && (
//                   <Paper withBorder p="xs" radius="md">
//                     <Text size="xs" fw={500}>
//                       Extracted {tasks.length} task(s)
//                     </Text>
//                     <Text size="xs" color="dimmed" lineClamp={2}>
//                       {tasks.slice(0, 5).join(", ")}
//                       {tasks.length > 5 ? ` and ${tasks.length - 5} more...` : ""}
//                     </Text>
//                   </Paper>
//                 )}
//               </Stack>
//             )}
//           </Flex>
//         </div>
//       )}
//     </div>
//   );
// };

// export default RFQUploadDropZoneExcel;


// RFQUploadDropZoneExcel.tsx
import { ActionIcon, Flex, Paper, Text, Group, Center, Space } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useEffect, useState } from "react";
import { MdClose, MdFilePresent, MdUploadFile } from "react-icons/md";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface UploadDropZoneExcelProps {
  name: string;
  changeHandler: (file: File | null, tasks: string[]) => void;
  color?: string;
  selectedFile?: File | null;
  setSelectedFile?: (file: File | null) => void;
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

  useEffect(() => {
    setFile(selectedFile || null);
  }, [selectedFile]);

  const handleDrop = async (newFiles: File[]) => {
    if (newFiles.length > 0) {
      const selectedFile = newFiles[0];
      setFile(selectedFile);
      console.log("✅ File Selected:", selectedFile.name);
      await extractTasks(selectedFile);
    }
  };

  const findTaskColumn = (row: any): string | undefined => {
    // List of possible task column names
    const possibleColumns = [
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

    // Find the first matching column that exists in the row
    const columnName = Object.keys(row).find(key => 
      possibleColumns.includes(key) || 
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

  const extractTasks = async (file: File) => {
    const fileType = file.name.split(".").pop()?.toLowerCase();
    
    try {
      if (fileType === "csv") {
        // Handle CSV files
        const text = await file.text();
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log("📊 CSV Parse Results:", results);
            
            if (results.data.length === 0) {
              console.log("❌ No data found in CSV");
              return;
            }

            const extractedTasks = new Set<string>();
            const firstRow = results.data[0];
            const taskColumnName = findTaskColumn(firstRow);

            if (!taskColumnName) {
              console.log("❌ No task column found in CSV");
              return;
            }

            results.data.forEach((row: any) => {
              console.log("🔍 Processing Row:", row);
              const taskCell = row[taskColumnName];
              console.log("📌 Task Cell Value:", taskCell);
              
              const tasks = processTaskCell(taskCell);
              tasks.forEach(task => extractedTasks.add(task));
            });

            const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
            console.log("📌 Final Extracted Tasks:", uniqueTasks);
            setTasks(uniqueTasks);
            changeHandler(file, uniqueTasks);
          },
          error: (error :any) => {
            console.error("❌ CSV Parse Error:", error);
          }
        });
      } else {
        // Handle Excel files
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log("📊 Excel Parse Results:", jsonData);
        
        if (jsonData.length === 0) {
          console.log("❌ No data found in Excel");
          return;
        }

        const extractedTasks = new Set<string>();
        const firstRow = jsonData[0];
        const taskColumnName = findTaskColumn(firstRow);

        if (!taskColumnName) {
          console.log("❌ No task column found in Excel");
          return;
        }

        jsonData.forEach((row: any) => {
          console.log("🔍 Processing Row:", row);
          const taskCell = row[taskColumnName];
          console.log("📌 Task Cell Value:", taskCell);
          
          const tasks = processTaskCell(taskCell);
          tasks.forEach(task => extractedTasks.add(task));
        });

        const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
        console.log("📌 Final Extracted Tasks:", uniqueTasks);
        setTasks(uniqueTasks);
        changeHandler(file, uniqueTasks);
      }
    } catch (error) {
      console.error("❌ File Processing Error:", error);
    }
  };

  const removeFile = () => {
    setFile(null);
    setTasks([]);
    setSelectedFile?.(null);
    changeHandler(null, []);
  };

  return (
    <div className="w-full">
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
        <Flex direction='row'  align='center' gap="xl">
          <MdUploadFile size={50} color={color || "#1a73e8"} />
          <Text c="dimmed" size="sm">
            Drag and drop your {name} here, or click to select a file
          </Text>
        </Flex>
      </Dropzone>

      {file && (
        <div className="mt-4">
          <Space h='sm'/>
          <Flex gap="md" justify="center" align="center" direction="row">
            <Paper
              withBorder
              // w={200}
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
          </Flex>
        </div>
      )}
    </div>
  );
};

export default RFQUploadDropZoneExcel;