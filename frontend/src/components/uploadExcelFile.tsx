import { ActionIcon, Flex, Paper, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useState } from "react";
import { MdClose, MdFilePresent, MdUploadFile } from "react-icons/md";

interface UploadDropZoneExcelProps {
  name: string;
  changeHandler: (file: File | null) => void;
  color?: string;
}

const UploadDropZoneExcel = ({ name, changeHandler, color }: UploadDropZoneExcelProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      setSelectedFile(newFiles[0]); // Only store the first file
      changeHandler(newFiles[0]); // Pass single file to parent
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    changeHandler(null);
  };

  return (
    <div className="w-full">
      <Dropzone
        accept={[
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.xlsm',
          '.xls',
          '.xlsx'
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
        className="border-2 border-dashed rounded-lg p-8 cursor-pointer bg-gray-50"
      >
        <div>
          <MdUploadFile size={40} color={color || "#1a73e8"} />
          <Text c="dimmed" size="md">
            Drag and drop your {name} here, or click to select a file
          </Text>
        </div>
      </Dropzone>

      {selectedFile && (
        <div className="mt-4">
          <Flex gap="md" justify="center" align="center">
            <Paper withBorder shadow="xs" radius="md" p="sm" style={{ display: "flex", gap: "0.5em", minWidth: "150px" }}>
              <MdFilePresent size={24} color="#1a73e8" />
              <Text size="sm" lineClamp={1}>
                {selectedFile.name}
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

export default UploadDropZoneExcel;
