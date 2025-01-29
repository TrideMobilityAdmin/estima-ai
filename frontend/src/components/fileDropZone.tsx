import {
  useState,
  Text,
  Dropzone,
  MdUploadFile,
  Paper,
  MdFilePresent,
  ActionIcon,
  MdClose,
  Flex,
} from "../constants/GlobalImports";
import * as XLSX from "xlsx";

type DropZoneExcelProps = {
  name: string; // Label text for the Dropzone
  changeHandler: (tasks: string[]) => void; // Callback to handle extracted tasks
  color?: string; // Custom border color for Dropzone
};

export default function DropZoneExcel({
  name,
  changeHandler,
  color,
}: DropZoneExcelProps) {
  const [files, setFiles] = useState<File[]>([]);

  // Read the Excel file and extract tasks
  const extractTasks = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0]; // Read the first sheet
      const sheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

      // Extract and process tasks
      const taskSet = new Set<string>();
      jsonData.forEach((row) => {
        const taskCell = row["Task"];
        if (taskCell) {
          const tasks = taskCell
            .toString()
            .split(",") // Split tasks by comma
            .map((task: string) => task.trim()) // Trim whitespace
            .filter((task: string) => task); // Filter out empty tasks
          tasks.forEach((task: string) => taskSet.add(task)); // Add unique tasks to the set
        }
      });

      changeHandler(Array.from(taskSet)); // Pass unique tasks to the parent
      
      // // Extract tasks from the "Task" column
      // const taskList = jsonData.map((row) => row["Task"]).filter((task) => !!task);
      // changeHandler(taskList); // Pass tasks to the parent component
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle file drop and process tasks
  const handleDrop = (newFiles: File[]) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      extractTasks(newFiles[0]); // Process the first file
    }
  };

 // Remove a file from the list
 const removeFile = (index: number) => {
  setFiles((prevFiles) => {
    const updatedFiles = prevFiles.filter((_, i) => i !== index);
    if (updatedFiles.length === 0) {
      changeHandler([]); // Clear tasks when all files are removed
    }
    return updatedFiles;
  });
};

  return (
    <div style={{ width: "100%", margin: "auto" }}>
      {/* Dropzone */}
      <Dropzone
        accept={[
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ".xlsm",
        ]} // Accept only Excel files
        onDrop={handleDrop}
        multiple={false} // Allow only one file at a time
        styles={{
          
          root: {
            height:"30vh",
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
      >
        <div>
          <MdUploadFile size={40} color={color || "#1a73e8"} />
          <Text c="dimmed" size="md">
            Drag and drop your {name} here, or click to select a file
          </Text>
        </div>
      </Dropzone>

      {/* File List UI */}
      {files.length > 0 && (
        <div style={{ marginTop: "1em" }}>
          <Flex gap="md" justify="center" align="center" direction="row">
            {files.map((file, index) => (
              <Paper
                key={index}
                withBorder
                shadow="xs"
                radius="md"
                p="sm"
                style={{
                  display: "flex",
                  gap: "0.5em",
                  minWidth: "150px",
                }}
              >
                <MdFilePresent size={24} color="#1a73e8" />
                <Text size="sm" lineClamp={1}>
                  {file.name}
                </Text>
                <ActionIcon
                  onClick={() => removeFile(index)}
                  color="red"
                  variant="transparent"
                >
                  <MdClose size={16} />
                </ActionIcon>
              </Paper>
            ))}
          </Flex>
        </div>
      )}
    </div>
  );
}
