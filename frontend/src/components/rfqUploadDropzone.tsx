import { ActionIcon, Flex, Paper, Text, Group, Center, Space, Select, Stack, Alert } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useEffect, useState } from "react";
import { MdClose, MdFilePresent, MdUploadFile, MdError } from "react-icons/md";
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
  // Add raw column names to preserve original format
  rawColumns: string[];
}

// Add a type for the row data
interface RowData {
  [key: string]: any;
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
  const [rawTaskColumns, setRawTaskColumns] = useState<string[]>([]);  // Store original column names
  const [selectedTaskColumn, setSelectedTaskColumn] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Required sheet and column name constants
  const REQUIRED_SHEET_NAME = "MPD";
  const REQUIRED_TASK_COLUMN_NAME = "TASK NUMBER";
  const REQUIRED_DESCRIPTION_COLUMN_NAME = "DESCRIPTION";

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

  // List of possible task columns for auto-detection
  const possibleTaskColumns = [
    "Task",
    "task",
    "TASK",
    "TASK NUMBER",
    "Task Number",
    "task number",
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

  // Function to normalize column names for comparison
  const normalizeColumnName = (name: string): string => {
    if (!name) return "";
    
    return name.toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ")  // Replace multiple spaces with single space
      .replace(/[\r\n]+/g, " ")  // Replace newlines with space (for wrapped text)
      .replace(/[^\w\s]/g, "");  // Remove special characters
  };

  // Function to check if a column name matches the required name
  const isMatchingColumnName = (actual: string, required: string): boolean => {
    const normalizedActual = normalizeColumnName(actual);
    const normalizedRequired = normalizeColumnName(required);
    
    return normalizedActual === normalizedRequired;
  };

  // Function to find a matching column name in an array of column names
  const findMatchingColumnName = (columns: string[], requiredName: string): string | undefined => {
    return columns.find(column => isMatchingColumnName(column, requiredName));
  };

  const handleDrop = async (newFiles: File[]) => {
    try {
      if (newFiles.length > 0) {
        const droppedFile = newFiles[0];
        
        // Reset all state
        setFile(droppedFile);
        setTasks([]);
        setSelectedSheet(null);
        setSelectedTaskColumn(null);
        setAvailableSheets([]);
        setFileError(null);
        setIsAnalyzing(true);
        
        // Update parent component's state if callback provided
        if (setSelectedFile) {
          setSelectedFile(droppedFile);
        }
        
        console.log("✅ File Selected:", droppedFile.name);
        
        // Analyze the file for sheet and column data
        await analyzeFile(droppedFile);
      }
    } catch (error) {
      console.error("❌ Error in handleDrop:", error);
      setFileError("An error occurred while processing the file. Please try again.");
      setIsAnalyzing(false);
    }
  };

  const validateFileRequirements = (sheets: SheetInfo[], workbook: XLSX.WorkBook): boolean => {
    // Check if the required sheet exists
    const mpdSheet = sheets.find(sheet => sheet.name === REQUIRED_SHEET_NAME);
    
    if (!mpdSheet) {
      setFileError(`Invalid file. The required sheet "${REQUIRED_SHEET_NAME}" was not found. Please select another file.`);
      return false;
    }
    
    // Check if the required TASK NUMBER column exists in the MPD sheet (with normalization)
    const taskNumberColumn = findMatchingColumnName(mpdSheet.rawColumns, REQUIRED_TASK_COLUMN_NAME);
    if (!taskNumberColumn) {
      setFileError(`Invalid file. The required column "${REQUIRED_TASK_COLUMN_NAME}" was not found in the "${REQUIRED_SHEET_NAME}" sheet. Please select another file.`);
      return false;
    }
    
    // Check if the required DESCRIPTION column exists in the MPD sheet (with normalization)
    const descriptionColumn = findMatchingColumnName(mpdSheet.rawColumns, REQUIRED_DESCRIPTION_COLUMN_NAME);
    if (!descriptionColumn) {
      setFileError(`Invalid file. The required column "${REQUIRED_DESCRIPTION_COLUMN_NAME}" was not found in the "${REQUIRED_SHEET_NAME}" sheet. Please select another file.`);
      return false;
    }
    
    // Check if the sheet has any data rows
    const worksheet = workbook.Sheets[REQUIRED_SHEET_NAME];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as RowData[];
    
    if (jsonData.length === 0) {
      setFileError(`No data found in the "${REQUIRED_SHEET_NAME}" sheet. Please select another file.`);
      return false;
    }
    
    // Check if there is any data in the required columns
    const taskColumnKey = findMatchingColumnNameInData(jsonData[0], REQUIRED_TASK_COLUMN_NAME);
    const descriptionColumnKey = findMatchingColumnNameInData(jsonData[0], REQUIRED_DESCRIPTION_COLUMN_NAME);
    
    let hasTaskData = false;
    
    for (const row of jsonData) {
      const taskValue = taskColumnKey ? row[taskColumnKey] : undefined;
      if (taskValue !== undefined && taskValue !== null && taskValue !== "") {
        hasTaskData = true;
        break;
      }
    }
    
    if (!hasTaskData) {
      setFileError(`No data found in the "${REQUIRED_TASK_COLUMN_NAME}" column. Please select another file.`);
      return false;
    }
    
    return true;
  };
  
  // Helper function to find a matching column name in a data row object
  const findMatchingColumnNameInData = (dataRow: RowData | undefined, requiredName: string): string | undefined => {
    if (!dataRow) return undefined;
    
    return Object.keys(dataRow).find(key => isMatchingColumnName(key, requiredName));
  };

  const analyzeFile = async (fileToAnalyze: File) => {
    if (!fileToAnalyze) {
      setIsAnalyzing(false);
      return;
    }
    
    setIsAnalyzing(true);
    setFileError(null);
    const fileType = fileToAnalyze.name.split(".").pop()?.toLowerCase();
    
    try {
      if (fileType === "csv") {
        // For CSV files - CSV won't meet our requirements as we need an Excel file with specific sheet
        setFileError("Invalid file format. Please upload an Excel file (.xls, .xlsx) containing the required sheet and columns.");
        // Don't reset the file here to keep showing the file error message
      } else {
        // Handle Excel files with multiple sheets
        const buffer = await fileToAnalyze.arrayBuffer();
        const workbook = XLSX.read(buffer, { 
          type: "array",
          cellStyles: true,  // Enable style parsing
          // cellFormulas: true,
          cellHTML: true     // This might help with format preservation
        });
        
        const sheets: SheetInfo[] = [];
        
        // Analyze each sheet
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          
          // Get data with header options to preserve formatting
          // First, get the raw headers
          const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1");
          const headers: string[] = [];
          const rawHeaders: string[] = [];
          
          // Get the header row
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
            const cell = worksheet[cellAddress];
            
            if (cell && cell.v !== undefined) {
              const headerValue = cell.v.toString();
              rawHeaders.push(headerValue);  // Store the raw header
              headers.push(normalizeColumnName(headerValue));  // Store normalized header
            }
          }
          
          // Get data with first row as header
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as RowData[];
          
          // Even if there's no data rows, we still want to include the sheet with headers
          if (headers.length > 0) {
            sheets.push({
              name: sheetName,
              columns: headers,
              rawColumns: rawHeaders
            });
          }
        });
        
        console.log("📑 Available Sheets:", sheets);
        
        // Validate the file against our requirements
        const isValid = validateFileRequirements(sheets, workbook);
        
        if (!isValid) {
          // Don't reset the file here to keep showing the file error message
        } else {
          // If we reach here, the file is valid
          setAvailableSheets(sheets);
          
          // Auto-select the MPD sheet
          const mpdSheet = sheets.find(sheet => sheet.name === REQUIRED_SHEET_NAME)!;
          setSelectedSheet(REQUIRED_SHEET_NAME);
          
          // Set both normalized and raw columns
          setTaskColumns(mpdSheet.columns);
          setRawTaskColumns(mpdSheet.rawColumns);
          
          // Find the task number column that matches the required name (normalized)
          const taskNumberColumn = findMatchingColumnName(mpdSheet.rawColumns, REQUIRED_TASK_COLUMN_NAME);
          
          if (taskNumberColumn) {
            setSelectedTaskColumn(taskNumberColumn);
            
            // Extract tasks from the required sheet and matching TASK NUMBER column
            await extractTasksFromSheet(workbook, REQUIRED_SHEET_NAME, taskNumberColumn, fileToAnalyze);
          }
        }
      }
    } catch (error) {
      console.error("❌ File Analysis Error:", error);
      setFileError("An error occurred while analyzing the file. Please try again with a valid Excel file.");
      // Don't reset the file here to keep showing the file error message
    } finally {
      setIsAnalyzing(false);
    }
  };

  const findTaskColumn = (row: RowData): string | undefined => {
    // Find the first matching column that exists in the row
    const columnName = Object.keys(row).find(key => {
      const normalizedKey = normalizeColumnName(key);
      return possibleTaskColumns.some(possibleCol => 
        normalizeColumnName(possibleCol) === normalizedKey
      ) || normalizedKey.includes('TASK');
    });

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
      .map((task: string) => task
      // .replace(/[^\w\s-/#]/g, "")
    ); // Allow hyphen, forward slash, and hash

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
    
    try {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const extractedTasks = new Set<string>();
      
      jsonData.forEach((row: any) => {
        // Try to find the column in the row using the exact name first
        let taskCell = row[columnName];
        
        // If not found, try normalized comparison
        if (taskCell === undefined) {
          const rowKeys = Object.keys(row);
          const matchingKey = rowKeys.find(key => isMatchingColumnName(key, columnName));
          if (matchingKey) {
            taskCell = row[matchingKey];
          }
        }
        
        const tasks = processTaskCell(taskCell);
        tasks.forEach(task => extractedTasks.add(task));
      });
      
      const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
      console.log("📌 Final Extracted Tasks:", uniqueTasks);
      
      // Check if we found any tasks
      if (uniqueTasks.length === 0) {
        setFileError(`No tasks found in the "${REQUIRED_TASK_COLUMN_NAME}" column. Please select another file.`);
        return;
      }
      
      setTasks(uniqueTasks);
      
      // Make sure we're using the current file reference, not the potentially stale closure value
      changeHandler(currentFile, uniqueTasks, { 
        sheetName, 
        columnName
      });
    } catch (error) {
      console.error("❌ Error extracting tasks from sheet:", error);
      setFileError("An error occurred while extracting tasks from the sheet. Please check the file format.");
    }
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
        try {
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
        } catch (error) {
          console.error("❌ Error extracting tasks from CSV:", error);
          setFileError("An error occurred while extracting tasks from the CSV. Please check the file format.");
        }
      },
      error: (error : any) => {
        console.error("❌ CSV Parsing Error:", error);
        setFileError("An error occurred while parsing the CSV file. Please check the file format.");
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
    setIsAnalyzing(true);
    
    try {
      const fileType = file.name.split(".").pop()?.toLowerCase();
      
      if (fileType === "csv") {
        const text = await file.text();
        extractTasksFromCSV(text, columnName, file);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        await extractTasksFromSheet(workbook, selectedSheet, columnName, file);
      }
    } catch (error) {
      console.error("❌ Error processing column change:", error);
      setFileError("An error occurred while extracting tasks. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setTasks([]);
    setSelectedSheet(null);
    setSelectedTaskColumn(null);
    setAvailableSheets([]);
    setTaskColumns([]);
    setFileError(null);
    
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
              style={{ display: "flex", gap: "0.5em", minWidth: "200px", width: "100%" }}
            >
              <MdFilePresent size={24} color="#1a73e8" />
              <Text size="sm" lineClamp={1} style={{ flexGrow: 1 }}>
                {file.name}
              </Text>
              <ActionIcon onClick={removeFile} color="red" variant="transparent">
                <MdClose size={16} />
              </ActionIcon>
            </Paper>
            
            {fileError && (
              <Alert 
                icon={<MdError size={16} />} 
                title="Invalid File" 
                color="red" 
                withCloseButton
                onClose={removeFile}
                style={{ width: "100%" }}
              >
                {fileError}
              </Alert>
            )}
            
            {isAnalyzing ? (
              <Text size="xs" c="dimmed">Analyzing file...</Text>
            ) : (
              <>
                {availableSheets.length > 0 && !fileError && (
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