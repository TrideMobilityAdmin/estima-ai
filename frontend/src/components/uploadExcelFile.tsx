import { ActionIcon, Flex, Paper, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useState } from "react";
import { MdClose, MdFilePresent, MdUploadFile } from "react-icons/md";

const UploadDropZoneExcel = ( {name, changeHandler, color} : any ) => {
  const [files, setFiles] = useState([]);

  const handleDrop = (newFiles :any) => {
    setFiles(newFiles);
    // Call the parent's change handler with the new files
    changeHandler(newFiles);
  };

  const removeFile = (index :any) => {
    setFiles((prevFiles: any) => {
      const updatedFiles = prevFiles.filter((_ :any, i :any) => i !== index);
      // Update parent component
      changeHandler(updatedFiles);
      return updatedFiles;
    });
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
            // height:"30vh",
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

      {files.length > 0 && (
        <div className="mt-4">
          <Flex gap="md" justify="center" align="center" direction="row">
            {files?.map((file :any, index :any) => (
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
                  // className="text-red-500 hover:text-red-700"
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
};

export default UploadDropZoneExcel;