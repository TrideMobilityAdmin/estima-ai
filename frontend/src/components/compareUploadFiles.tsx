import { ActionIcon, Flex, Paper, Text, ScrollArea } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { showNotification } from "@mantine/notifications";
import { IconFiles } from "@tabler/icons-react";
import { useState } from "react";
import { MdClose, MdFilePresent, MdUploadFile } from "react-icons/md";

interface UploadDropZoneExcelProps {
  name: string;
  changeHandler: (files: File[]) => void;
  color?: string;
}

const CompareUploadDropZoneExcel = ({ name, changeHandler, color }: UploadDropZoneExcelProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validSheetNames, setValidSheetNames] = useState<string[]>([]);

  const handleDrop = async (newFiles: File[]) => {
    const validFiles: File[] = [];
    const invalidFiles: File[] = [];

    // newFiles.forEach((file) => {
    //   if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
    //     validFiles.push(file);
    //   } else {
    //     invalidFiles.push(file);
    //   }
    // });
    newFiles.forEach((file) => {
     
        validFiles.push(file);
     
    });
    if (invalidFiles.length > 0) {
      showNotification({
        title: "Invalid File Format",
        message: "Only .xlsx and .xls files are supported. .xlsm files are not allowed.",
        color: "red",
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      changeHandler([...selectedFiles, ...validFiles]);
      await extractSheetNames(validFiles);
    }
  };

  const extractSheetNames = async (files: File[]) => {
    const sheetNames: string[] = [];
    for (const file of files) {
      const data = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(data, { type: "array" });
      sheetNames.push(...workbook.SheetNames);
    }
    setValidSheetNames(sheetNames);
  };

  const removeFile = (fileToRemove: File) => {
    const updatedFiles = selectedFiles.filter((file) => file !== fileToRemove);
    setSelectedFiles(updatedFiles);
    changeHandler(updatedFiles);
  };

  return (
    <div style={{ width: "500px", margin: "auto" }}> {/* Fixed width container */}
      <Dropzone
        // accept={
        //   [
        //     "application/vnd.ms-excel", 
        //     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        //     ".xls",
        //     ".xlsx",
        //     ".xlsm",
        //   ]
        // }
        accept={{
          // Excel file MIME types
          'application/vnd.ms-excel': ['.xls'],
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
          // CSV files
          'text/csv': ['.csv'],
          'application/csv': ['.csv'],
          // Additional Excel formats
          'application/vnd.ms-excel.sheet.binary.macroEnabled.12': ['.xlsb'],
        }}
        styles={{
          root: {
            borderColor: color || "#ced4da",
            borderStyle: "dashed",
            borderWidth: 2,
            borderRadius: 10,
            backgroundColor: "#F4F4F4",
            textAlign: "center",
            padding: "1em",
            cursor: "pointer",
            width: "100%",
          },
        }}
        onDrop={handleDrop}
        multiple
      >
        <div>
          <IconFiles size={30} color={color || "#1a73e8"} />
          <Text c="dimmed" size="md">
            Drag and drop your {name} here, or click to select files
          </Text>
        </div>
      </Dropzone>

      {/* Scrollable Selected Files */}
      {selectedFiles.length > 0 && (
        <ScrollArea scrollbarSize={6} type="always" offsetScrollbars style={{ width: "100%", marginTop: "10px", overflowX: "auto" }}>
          <Flex gap="sm" style={{ whiteSpace: "nowrap" }}>
            {selectedFiles.map((file, index) => (
              <Paper key={index} withBorder shadow="xs" radius="md" p="sm" style={{ display: "flex", alignItems: "center", gap: "0.5em", minWidth: "200px" }}>
                <MdFilePresent size={24} color="#1a73e8" />
                <Text size="sm" style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{file.name}</Text>
                <ActionIcon onClick={() => removeFile(file)} color="red" variant="transparent">
                  <MdClose size={16} />
                </ActionIcon>
              </Paper>
            ))}
          </Flex>
        </ScrollArea>
      )}

      {/* Valid Sheet Names Display */}
      {/* {validSheetNames.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <Text fw={500}>Valid Sheet Names:</Text>
          <ul>
            {validSheetNames.map((sheet, index) => (
              <li key={index}>{sheet}</li>
            ))}
          </ul>
        </div>
      )} */}
    </div>
  );
};

export default CompareUploadDropZoneExcel;