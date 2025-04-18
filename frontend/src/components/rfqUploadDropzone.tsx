import { ActionIcon, Flex, Paper, Text, Group, Center, Space, Select, Stack, Alert, Loader } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useEffect, useState, useCallback, useMemo } from "react";
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
  rawColumns: string[];
}

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
  const [rawTaskColumns, setRawTaskColumns] = useState<string[]>([]);
  const [selectedTaskColumn, setSelectedTaskColumn] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processingPercentage, setProcessingPercentage] = useState<number>(0);
  const [processingError, setProcessingError] = useState<Error | null>(null);

  // Required sheet and column name constants
  const REQUIRED_SHEET_NAME = "MPD";
  const REQUIRED_TASK_COLUMN_NAME = "TASK NUMBER";
  const REQUIRED_DESCRIPTION_COLUMN_NAME = "DESCRIPTION";

  // List of possible task columns for auto-detection - moved outside component
  const possibleTaskColumns = useMemo(() => [
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
  ], []);

  // Reset analysis state
  const resetAnalysisState = useCallback(() => {
    setTasks([]);
    setSelectedSheet(null);
    setSelectedTaskColumn(null);
    setAvailableSheets([]);
    setTaskColumns([]);
    setRawTaskColumns([]);
    setFileError(null);
    setProcessingPercentage(0);
    setProcessingError(null);
  }, []);

  // Function to normalize column names for comparison
  const normalizeColumnName = useCallback((name: string): string => {
    if (!name) return "";
    
    return name.toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/[\r\n]+/g, " ")
      .replace(/[^\w\s]/g, "");
  }, []);

  // Function to check if a column name matches the required name
  const isMatchingColumnName = useCallback((actual: string, required: string): boolean => {
    const normalizedActual = normalizeColumnName(actual);
    const normalizedRequired = normalizeColumnName(required);
    
    return normalizedActual === normalizedRequired;
  }, [normalizeColumnName]);

  // Function to find a matching column name in an array of column names
  const findMatchingColumnName = useCallback((columns: string[], requiredName: string): string | undefined => {
    return columns.find(column => isMatchingColumnName(column, requiredName));
  }, [isMatchingColumnName]);

  // Helper function to find a matching column name in a data row object
  const findMatchingColumnNameInData = useCallback((dataRow: RowData | undefined, requiredName: string): string | undefined => {
    if (!dataRow) return undefined;
    
    return Object.keys(dataRow).find(key => isMatchingColumnName(key, requiredName));
  }, [isMatchingColumnName]);

  // Effect to handle prop changes safely
  useEffect(() => {
    // Only update local file state from props if it's different
    if (selectedFile !== file) {
      setFile(selectedFile || null);
      
      // If a file is passed from props and we haven't analyzed it yet, do so
      if (selectedFile && availableSheets.length === 0 && !isAnalyzing) {
        resetAnalysisState();
        analyzeFile(selectedFile).catch(err => {
          console.error("File analysis failed:", err);
          setFileError(`Failed to analyze file: ${err.message || "Unknown error"}`);
          setIsAnalyzing(false);
        });
      }
    }
  }, [selectedFile, file, availableSheets.length, isAnalyzing, resetAnalysisState]);

  // Process task cell data safely
  const processTaskCell = useCallback((taskCell: any): string[] => {
    if (!taskCell) return [];
    
    try {
      const taskString = String(taskCell).trim();
      if (!taskString) return [];

      // Split by comma or newline
      const tasks = taskString
        .split(/[,\n]/)
        .map((task: string) => task.trim())
        .filter((task: string) => task.length > 0); 

      return tasks;
    } catch (error) {
      console.error("Error processing task cell:", error);
      return [];
    }
  }, []);

  // Find task column in a row
  const findTaskColumn = useCallback((row: RowData): string | undefined => {
    try {
      // Find the first matching column that exists in the row
      const columnName = Object.keys(row).find(key => {
        const normalizedKey = normalizeColumnName(key);
        return possibleTaskColumns.some(possibleCol => 
          normalizeColumnName(possibleCol) === normalizedKey
        ) || normalizedKey.includes('TASK');
      });

      return columnName;
    } catch (error) {
      console.error("Error finding task column:", error);
      return undefined;
    }
  }, [normalizeColumnName, possibleTaskColumns]);

  // Validate file meets requirements
  const validateFileRequirements = useCallback((sheets: SheetInfo[], workbook: XLSX.WorkBook): boolean => {
    try {
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
      
      // Added check for worksheet existence
      if (!worksheet) {
        setFileError(`The "${REQUIRED_SHEET_NAME}" sheet exists but cannot be accessed. Please check the file format.`);
        return false;
      }
      
      // Added safety check for sheet_to_json
      let jsonData: RowData[] = [];
      try {
        jsonData = XLSX.utils.sheet_to_json(worksheet) as RowData[];
      } catch (error) {
        console.error("Error converting sheet to JSON:", error);
        setFileError(`Error reading data from "${REQUIRED_SHEET_NAME}" sheet. The file might be corrupted.`);
        return false;
      }
      
      if (jsonData.length === 0) {
        setFileError(`No data found in the "${REQUIRED_SHEET_NAME}" sheet. Please select another file.`);
        return false;
      }
      
      // Check if there is any data in the required columns
      const taskColumnKey = findMatchingColumnNameInData(jsonData[0], REQUIRED_TASK_COLUMN_NAME);
      
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
    } catch (error:any) {
      console.error("Error validating file requirements:", error);
      setFileError(`Error validating file: ${error.message || "Unknown error"}. Please try another file.`);
      return false;
    }
  }, [findMatchingColumnName, findMatchingColumnNameInData]);

  // Handle user dropping a file
  const handleDrop = useCallback(async (newFiles: File[]) => {
    try {
      if (newFiles.length > 0) {
        const droppedFile = newFiles[0];
        
        // Reset all state
        setFile(droppedFile);
        resetAnalysisState();
        setIsAnalyzing(true);
        
        // Update parent component's state if callback provided
        if (setSelectedFile) {
          setSelectedFile(droppedFile);
        }
        
        // Analyze the file for sheet and column data
        await analyzeFile(droppedFile);
      }
    } catch (error:any) {
      console.error("Error in handleDrop:", error);
      setFileError(`Error processing file: ${error.message || "Unknown error"}. Please try again.`);
      setIsAnalyzing(false);
    }
  }, [resetAnalysisState, setSelectedFile]);

  // Extract tasks from sheet with improved error handling
  const extractTasksFromSheet = useCallback(async (
    workbook: XLSX.WorkBook, 
    sheetName: string, 
    columnName: string,
    currentFile: File
  ) => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found in workbook`);
      }
      
      // Process in chunks to avoid memory issues
      const processDataChunk = () => {
        return new Promise<string[]>((resolve, reject) => {
          try {
            // Use a timeout to prevent UI blocking
            setTimeout(() => {
              try {
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
                resolve(uniqueTasks);
              } catch (error) {
                reject(error);
              }
            }, 50);
          } catch (error) {
            reject(error);
          }
        });
      };
      
      // Execute the processing with error handling
      const uniqueTasks = await processDataChunk();
      
      // Check if we found any tasks
      if (uniqueTasks.length === 0) {
        setFileError(`No tasks found in the "${columnName}" column. Please select another file or column.`);
        return;
      }
      
      setTasks(uniqueTasks);
      
      // Make sure we're using the current file reference, not the potentially stale closure value
      changeHandler(currentFile, uniqueTasks, { 
        sheetName, 
        columnName
      });
    } catch (error : any) {
      console.error("Error extracting tasks from sheet:", error);
      setFileError(`Error extracting tasks from sheet: ${error.message || "Unknown error"}. Please check the file format.`);
      throw error; // Re-throw to allow caller to handle
    }
  }, [isMatchingColumnName, processTaskCell, changeHandler]);

  // Extract tasks from CSV with improved error handling
  const extractTasksFromCSV = useCallback(async (
    csvText: string, 
    columnName: string,
    currentFile: File
  ) => {
    try {
      let allExtractedTasks = new Set<string>();
      let parsingComplete = false;
      let parsingError: Error | null = null;
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        chunk: (results : any, parser : any) => {
          try {
            if (results.errors && results.errors.length > 0) {
              console.warn("CSV parsing warnings:", results.errors);
            }
            
            results.data.forEach((row: any) => {
              const taskCell = row[columnName];
              const tasks = processTaskCell(taskCell);
              tasks.forEach(task => allExtractedTasks.add(task));
            });
          } catch (error) {
            console.error("Error processing CSV chunk:", error);
            parsingError = error instanceof Error ? error : new Error(String(error));
            parser.abort(); // Stop parsing on error
          }
        },
        complete: () => {
          parsingComplete = true;
          
          if (parsingError) {
            setFileError(`Error processing CSV data: ${parsingError.message}. Please check the file format.`);
            return;
          }
          
          const uniqueTasks = Array.from(allExtractedTasks).filter(Boolean);
          
          if (uniqueTasks.length === 0) {
            setFileError(`No tasks found in the selected column "${columnName}". Please check the file or select another column.`);
            return;
          }
          
          setTasks(uniqueTasks);
          
          // Update parent component
          changeHandler(currentFile, uniqueTasks, { 
            sheetName: "CSV Data", 
            columnName
          });
        },
        error: (error : any) => {
          console.error("CSV Parsing Error:", error);
          setFileError(`Error parsing CSV file: ${error.message}. Please check the file format.`);
          parsingError = error;
        }
      });
      
      // Wait for parsing to complete (for async handling)
      return new Promise<void>((resolve, reject) => {
        const checkComplete = () => {
          if (parsingComplete) {
            if (parsingError) {
              reject(parsingError);
            } else {
              resolve();
            }
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        
        checkComplete();
      });
    } catch (error) {
      console.error("Error in extractTasksFromCSV:", error);
      setFileError(`Error processing CSV file: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`);
      throw error;
    }
  }, [processTaskCell, changeHandler]);

  // Analyze the uploaded file with improved error handling and memory management
  const analyzeFile = useCallback(async (fileToAnalyze: File) => {
    if (!fileToAnalyze) {
      setIsAnalyzing(false);
      return;
    }
    
    setIsAnalyzing(true);
    setFileError(null);
    setProcessingError(null);
    setProcessingPercentage(10);
    
    try {
      const fileType = fileToAnalyze.name.split(".").pop()?.toLowerCase();
      
      if (fileType === "csv") {
        // For CSV files - CSV won't meet our requirements as we need an Excel file with specific sheet
        setFileError("Invalid file format. Please upload an Excel file (.xls, .xlsx) containing the required sheet and columns.");
        setIsAnalyzing(false);
      } else {
        setProcessingPercentage(20);
        
        // Use a memory-efficient approach with chunks and Web Workers if available
        return new Promise<void>((resolve, reject) => {
          try {
            // Create a timeout to prevent UI locking
            setTimeout(() => {
              try {
                const reader = new FileReader();
                
                reader.onload = async (e) => {
                  try {
                    setProcessingPercentage(40);
                    const buffer = e.target?.result as ArrayBuffer;
                    
                    if (!buffer) {
                      throw new Error("Failed to read file buffer");
                    }
                    
                    // Use safe options for Excel parsing
                    const workbook = XLSX.read(new Uint8Array(buffer), { 
                      type: "array",
                      cellStyles: false, // Changed to false for performance
                      cellHTML: false,   // Changed to false for performance
                      cellFormula: false // Disable formula parsing for safety
                    });
                    
                    setProcessingPercentage(60);
                    
                    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                      throw new Error("Invalid Excel file format or empty workbook");
                    }
                    
                    const sheets: SheetInfo[] = [];
                    
                    // Analyze each sheet with better error handling
                    for (const sheetName of workbook.SheetNames) {
                      try {
                        const worksheet = workbook.Sheets[sheetName];
                        
                        if (!worksheet || !worksheet['!ref']) {
                          console.warn(`Sheet ${sheetName} has no data or reference`);
                          continue;
                        }
                        
                        // Get the raw headers
                        const range = XLSX.utils.decode_range(worksheet['!ref']);
                        const headers: string[] = [];
                        const rawHeaders: string[] = [];
                        
                        // Get the header row
                        for (let C = range.s.c; C <= range.e.c; ++C) {
                          const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
                          const cell = worksheet[cellAddress];
                          
                          if (cell && cell.v !== undefined) {
                            const headerValue = String(cell.v);
                            rawHeaders.push(headerValue);
                            headers.push(normalizeColumnName(headerValue));
                          }
                        }
                        
                        // Even if there's no data rows, we still want to include the sheet with headers
                        if (headers.length > 0) {
                          sheets.push({
                            name: sheetName,
                            columns: headers,
                            rawColumns: rawHeaders
                          });
                        }
                      } catch (sheetError) {
                        console.error(`Error processing sheet ${sheetName}:`, sheetError);
                        // Continue with other sheets instead of failing completely
                      }
                    }
                    
                    setProcessingPercentage(80);
                    
                    if (sheets.length === 0) {
                      throw new Error("No valid sheets found in the Excel file");
                    }
                    
                    // Validate the file against our requirements
                    const isValid = validateFileRequirements(sheets, workbook);
                    
                    if (!isValid) {
                      // Keep the current error message set by validateFileRequirements
                      setIsAnalyzing(false);
                      resolve();
                      return;
                    }
                    
                    // If we reach here, the file is valid
                    setAvailableSheets(sheets);
                    
                    // Auto-select the MPD sheet
                    const mpdSheet = sheets.find(sheet => sheet.name === REQUIRED_SHEET_NAME);
                    
                    if (!mpdSheet) {
                      throw new Error(`Required sheet "${REQUIRED_SHEET_NAME}" not found`);
                    }
                    
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
                    } else {
                      throw new Error(`Task column "${REQUIRED_TASK_COLUMN_NAME}" not found in sheet "${REQUIRED_SHEET_NAME}"`);
                    }
                    
                    setProcessingPercentage(100);
                    resolve();
                  } catch (error) {
                    console.error("File Processing Error:", error);
                    setFileError(`Error processing file: ${error instanceof Error ? error.message : "Unknown error"}. Please try again with a valid file.`);
                    reject(error);
                  } finally {
                    setIsAnalyzing(false);
                  }
                };
                
                reader.onerror = (error) => {
                  console.error("File Reading Error:", error);
                  setFileError("Error reading file. Please try again.");
                  setIsAnalyzing(false);
                  reject(error);
                };
                
                // Read the file as an array buffer
                reader.readAsArrayBuffer(fileToAnalyze);
              } catch (error) {
                console.error("File Analysis Error:", error);
                setFileError(`Error analyzing file: ${error instanceof Error ? error.message : "Unknown error"}. Please try again with a valid Excel file.`);
                setIsAnalyzing(false);
                reject(error);
              }
            }, 100); // Small delay to allow UI to update
          } catch (outsideError) {
            console.error("Unexpected error during file processing:", outsideError);
            setFileError(`An unexpected error occurred: ${outsideError instanceof Error ? outsideError.message : "Unknown error"}`);
            setIsAnalyzing(false);
            reject(outsideError);
          }
        });
      }
    } catch (error) {
      console.error("File Analysis Error:", error);
      setFileError(`Error analyzing file: ${error instanceof Error ? error.message : "Unknown error"}. Please try again with a valid Excel file.`);
      setIsAnalyzing(false);
      throw error;
    }
  }, [
    normalizeColumnName, 
    validateFileRequirements, 
    findMatchingColumnName, 
    extractTasksFromSheet
  ]);

  // Handle sheet selection change with improved error handling
  const handleSheetChange = useCallback(async (sheetName: string) => {
    if (!file || !sheetName) return;
    
    try {
      setSelectedSheet(sheetName);
      setSelectedTaskColumn(null);
      setTasks([]);
      
      // Update columns based on selected sheet
      const sheet = availableSheets.find(s => s.name === sheetName);
      if (sheet) {
        setTaskColumns(sheet.columns);
        setRawTaskColumns(sheet.rawColumns);
      }
      
      // Clear tasks in parent component
      changeHandler(file, [], undefined);
    } catch (error) {
      console.error("Error changing sheet:", error);
      setFileError(`Error changing sheet: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [file, availableSheets, changeHandler]);

  // Handle column selection change with improved error handling
  const handleColumnChange = useCallback(async (columnName: string) => {
    if (!file || !selectedSheet || !columnName) return;
    
    try {
      setSelectedTaskColumn(columnName);
      setIsAnalyzing(true);
      setTasks([]);
      setFileError(null);
      
      const fileType = file.name.split(".").pop()?.toLowerCase();
      
      if (fileType === "csv") {
        try {
          const text = await file.text();
          await extractTasksFromCSV(text, columnName, file);
        } catch (error) {
          console.error("Error processing CSV for column change:", error);
          setFileError(`Error processing CSV file: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`);
        }
      } else {
        // Use a more memory-efficient approach
        try {
          const reader = new FileReader();
          
          reader.onload = async (e) => {
            try {
              const buffer = e.target?.result as ArrayBuffer;
              
              if (!buffer) {
                throw new Error("Failed to read file buffer");
              }
              
              const workbook = XLSX.read(new Uint8Array(buffer), { 
                type: "array",
                cellStyles: false,
                cellHTML: false,
                cellFormula: false
              });
              
              await extractTasksFromSheet(workbook, selectedSheet, columnName, file);
            } catch (error) {
              console.error("Error processing file for column change:", error);
              setFileError(`Error extracting tasks: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`);
            } finally {
              setIsAnalyzing(false);
            }
          };
          
          reader.onerror = (error) => {
            setFileError("Error reading file. Please try again.");
            setIsAnalyzing(false);
          };
          
          reader.readAsArrayBuffer(file);
        } catch (error) {
          console.error("Error reading file for column change:", error);
          setFileError(`Error reading file: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`);
          setIsAnalyzing(false);
        }
      }
    } catch (error) {
      console.error("Error processing column change:", error);
      setFileError(`Error processing column change: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`);
      setIsAnalyzing(false);
    }
  }, [file, selectedSheet, extractTasksFromCSV, extractTasksFromSheet]);

  // Remove the selected file with improved error handling
  const removeFile = useCallback(() => {
    try {
      setFile(null);
      resetAnalysisState();
      
      if (setSelectedFile) {
        setSelectedFile(null);
      }
      
      changeHandler(null, []);
    } catch (error) {
      console.error("Error removing file:", error);
    }
  }, [resetAnalysisState, setSelectedFile, changeHandler]);

  // Error boundary effect
  useEffect(() => {
    if (processingError) {
      setFileError(`An error occurred: ${processingError.message}. Please try again.`);
      setIsAnalyzing(false);
    }
  }, [processingError]);

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
          maxSize={50 * 1024 * 1024} // Add max size (50MB) to prevent extremely large files
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
                title="File Error" 
                color="red" 
                withCloseButton
                onClose={removeFile}
                style={{ width: "100%" }}
              >
                {fileError}
              </Alert>
            )}
            
            {isAnalyzing ? (
              <Stack align="center" w="100%">
                <Loader size="sm" />
                <Text size="xs" c="dimmed">
                  Analyzing file{processingPercentage > 0 ? ` (${processingPercentage}%)` : '...'}
                </Text>
              </Stack>
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
                        data={rawTaskColumns.map((col, index) => ({ 
                          value: col, 
                          label: col 
                        }))}
                        value={selectedTaskColumn}
                        onChange={(value) => value && handleColumnChange(value)}
                        searchable
                        clearable={false}
                        size="xs"
                        disabled={rawTaskColumns.length === 0}
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