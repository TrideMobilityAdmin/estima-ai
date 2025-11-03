// RFQUploadDropZoneExcel.tsx
import { ActionIcon, Flex, Paper, Text, Group } from "@mantine/core";
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

const RFQSkillsUploadDropZoneExcel = ({
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
      // console.log("✅ File Selected:", selectedFile.name);
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
      "TASK_NO"
    ];

    // Find the first matching column that exists in the row
    const columnName = Object.keys(row).find(key => 
      possibleColumns.includes(key) || 
      key.toLowerCase().includes('task')
    );

    // console.log("🔍 Found Task Column:", columnName);
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

    // console.log("📌 Processed Tasks:", tasks);
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
            // console.log("📊 CSV Parse Results:", results);
            
            if (results.data.length === 0) {
              // console.log("❌ No data found in CSV");
              return;
            }

            const extractedTasks = new Set<string>();
            const firstRow = results.data[0];
            const taskColumnName = findTaskColumn(firstRow);

            if (!taskColumnName) {
              // console.log("❌ No task column found in CSV");
              return;
            }

            results.data.forEach((row: any) => {
              // console.log("🔍 Processing Row:", row);
              const taskCell = row[taskColumnName];
              // console.log("📌 Task Cell Value:", taskCell);
              
              const tasks = processTaskCell(taskCell);
              tasks.forEach(task => extractedTasks.add(task));
            });

            const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
            // console.log("📌 Final Extracted Tasks:", uniqueTasks);
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
        
        // console.log("📊 Excel Parse Results:", jsonData);
        
        if (jsonData.length === 0) {
          // console.log("❌ No data found in Excel");
          return;
        }

        const extractedTasks = new Set<string>();
        const firstRow = jsonData[0];
        const taskColumnName = findTaskColumn(firstRow);

        if (!taskColumnName) {
          // console.log("❌ No task column found in Excel");
          return;
        }

        jsonData.forEach((row: any) => {
          // console.log("🔍 Processing Row:", row);
          const taskCell = row[taskColumnName];
          // console.log("📌 Task Cell Value:", taskCell);
          
          const tasks = processTaskCell(taskCell);
          tasks.forEach(task => extractedTasks.add(task));
        });

        const uniqueTasks = Array.from(extractedTasks).filter(Boolean);
        // console.log("📌 Final Extracted Tasks:", uniqueTasks);
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
            borderColor: color || "#ced4da",
            borderStyle: "dashed",
            borderWidth: 2,
            borderRadius: 10,
            backgroundColor: "#F4F4F4",
            textAlign: "center",
            padding: "2em",
            cursor: "pointer",
          },
        }}
        onDrop={handleDrop}
        multiple={false}
      >
        <Group justify="center" gap="xl">
          <MdUploadFile size={40} color={color || "#1a73e8"} />
          <Text c="dimmed" size="md">
            Drag and drop your {name} here, or click to select a file
          </Text>
        </Group>
      </Dropzone>

      {file && (
        <div className="mt-4">
          <Flex gap="md" justify="center" align="center" direction="row">
            <Paper
              withBorder
              w={200}
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

export default RFQSkillsUploadDropZoneExcel;