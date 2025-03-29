import { useState } from "react";
import { Dropzone } from "@mantine/dropzone";
import { ActionIcon, Button, Flex, Paper, ScrollArea, SimpleGrid, Text } from "@mantine/core";
import { MdClose, MdFilePresent, MdUploadFile } from "react-icons/md";
import { IconFileSpreadsheet } from "@tabler/icons-react";

interface UploadDropZoneExcelProps {
  name: string;
  changeHandler: (files: File[]) => void;
  color?: string;
}

const CompareUploadDropZoneExcelNew = ({ name, changeHandler, color }: UploadDropZoneExcelProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDrop = (newFiles: File[]) => {
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
    <div style={{ width: "600px", margin: "auto" }}> {/* Centered container */}
      {/* Dropzone UI */}
      <Dropzone
        accept={[".xls", ".xlsx", ".csv"]}
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
            width: "100%",
          },
        }}
        onDrop={handleDrop}
        multiple
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <MdUploadFile size={40} color={color || "#868e96"} />
          <Text size="md" c="dimmed" mt={5}>
            Drag and drop your Excel files here
          </Text>
          <Text size="sm" c="dimmed" mt={5}>
            or
          </Text>
          <Button
            size="sm"
            variant="light"
            c="#1a73e8"
            fw={500}
            style={{ cursor: "pointer", marginTop: 5 }}
          >
            Browse Files
          </Button>
        </div>
      </Dropzone>

      {/* Selected Files UI */}
      {selectedFiles.length > 0 && (
        <div style={{ marginTop: "15px" }}>
          <Text size="sm" fw={500}>
            Selected Files
          </Text>
          <ScrollArea  style={{ maxHeight: "200px", marginTop: "10px" }}>
            <Flex direction='column' gap='xs' >
              {selectedFiles.map((file, index) => (
                <Paper
                  key={index}
                //   withBorder
                //   shadow="xs"
                  radius="md"
                  p="sm"
                  bg='#f0f0f0'
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <Flex align="center" gap="sm">
                    <IconFileSpreadsheet size={24} color="#05990c" />
                    <div>
                      <Text size="sm" fw={500}>
                        {file.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                      </Text>
                    </div>
                  </Flex>
                  <ActionIcon onClick={() => removeFile(file)} color="gray" variant="transparent">
                    <MdClose size={16} />
                  </ActionIcon>
                </Paper>
              ))}
            </Flex>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default CompareUploadDropZoneExcelNew;
