import { ActionIcon, Flex, Paper, Text, ScrollArea } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useState } from "react";
import { MdClose, MdFilePresent, MdUploadFile } from "react-icons/md";

interface UploadDropZoneExcelProps {
  name: string;
  changeHandler: (files: File[]) => void;
  color?: string;
}

const CompareUploadDropZoneExcel = ({ name, changeHandler, color }: UploadDropZoneExcelProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDrop = (newFiles: File[]) => {
    console.log("Dropped files:", newFiles);
    const updatedFiles = [...selectedFiles, ...newFiles];
    setSelectedFiles(updatedFiles);
    changeHandler(updatedFiles);
  };

  const removeFile = (fileToRemove: File) => {
    const updatedFiles = selectedFiles.filter((file) => file !== fileToRemove);
    setSelectedFiles(updatedFiles);
    changeHandler(updatedFiles);
  };

  return (
    <div style={{ width: "500px", margin: "auto" }}> {/* Fixed width container */}
      {/* File Drop Zone with fixed width */}
      <Dropzone
        accept={[
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ".xlsm",
          ".xls",
          ".xlsx",
          ".csv"
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
            width: "100%", // Ensure it stays within the container
          },
        }}
        onDrop={handleDrop}
        multiple
      >
        <div>
          <MdUploadFile size={40} color={color || "#1a73e8"} />
          <Text c="dimmed" size="md">
            Drag and drop your {name} here, or click to select files
          </Text>
        </div>
      </Dropzone>

      {/* Scrollable Selected Files */}
      {selectedFiles.length > 0 && (
        <ScrollArea
          scrollbarSize={6}
          type="always"
          offsetScrollbars
          style={{ width: "100%", marginTop: "10px", overflowX: "auto" }}
        >
          <Flex gap="sm" style={{ whiteSpace: "nowrap" }}>
            {selectedFiles.map((file, index) => (
              <Paper
                key={index}
                withBorder
                shadow="xs"
                radius="md"
                p="sm"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5em",
                  minWidth: "200px", // Ensures each item has space
                }}
              >
                <MdFilePresent size={24} color="#1a73e8" />
                <Text size="sm" style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                  {file.name}
                </Text>
                <ActionIcon onClick={() => removeFile(file)} color="red" variant="transparent">
                  <MdClose size={16} />
                </ActionIcon>
              </Paper>
            ))}
          </Flex>
        </ScrollArea>
      )}
    </div>
  );
};

export default CompareUploadDropZoneExcel;
