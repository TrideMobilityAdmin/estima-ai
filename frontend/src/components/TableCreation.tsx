import { Card, Group, Space, Stack, Table, Text } from "@mantine/core";

import { MdGridView } from "react-icons/md";

interface TableProps {
  tableHeading: string[];
  tableData: string[][];
}
// const gradientColor = "linear-gradient(to right, #9575CD, #D1C4E9)";
const gradientColor = "linear-gradient(to right, #98A0CA, #EEF3FF)";

export default function TableCreation(props: TableProps) {
  return (
    <Card
      style={{
        height: "100%",
        maxWidth: "99%",
        borderRadius: "10px",
        overflow: "auto",
        backgroundColor: "transparent",
      }}
    >
      <div style={{ height: '400px', overflow: 'auto' }}>
      <Table
        highlightOnHover
        horizontalSpacing="lg"
        verticalSpacing="md"
        style={{ borderRadius: "8px",overflow:"auto" }}
      >
        <Table.Thead>
          <Table.Tr>
            {props.tableHeading.map((el, index) => (
              <Table.Th
                key={index}
                style={{
                  background: gradientColor,
                  borderRadius: "10px 4px 0 0",
                  color: "black",
                }}
              >
                {el}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        {props.tableData.length === 0 ? (  
          <Table.Tbody>
            <Table.Tr>
              <Table.Td colSpan={props.tableHeading.length}>
                <div
                  style={{
                    height: "100%",
                    width: "80vw",
                    overflow: "hidden",
                  }}
                >
                  <Space h="xl" />
                  <Group justify="center">
                    <Stack align="center">
                      <MdGridView size={100} />
                      <Text>No Data Found</Text>
                    </Stack>
                  </Group>
                </div>  
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>                    
        ) : (
          <Table.Tbody>
            {props.tableData.map((el, index) => (
              <Table.Tr key={index}>
                {el.map((e, index) => (
                  <Table.Td key={index}>{e}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        )}
      </Table>
      </div>

    </Card>
  );
}
