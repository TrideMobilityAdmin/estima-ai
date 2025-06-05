import { Dropzone } from "@mantine/dropzone";
import { useState } from "react";
import { Text, Paper } from "@mantine/core";

export default function TestDropzone() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Paper p="md" shadow="md">
      <Dropzone
        onDrop={(files) => {
          const file = files[0];
          if (file) {
            setFileName(file.name);
            setError(null);
          }
        }}
        onReject={(files) => setError("Rejected: " + files[0].errors[0].message)}
        maxSize={2 * 1024 * 1024}
      >
        <Text>Drop an Excel file here or click to select.</Text>
      </Dropzone>
      {fileName && <Text>File: {fileName}</Text>}
      {error && <Text color="red">{error}</Text>}
    </Paper>
  );
}