import { Card, Text, Group, Divider, Space, Flex } from "@mantine/core";
// import { LucideIcon, Clock, DollarSign, Search, LineChart } from "lucide-react";

// interface StatsCardProps {
//   title: string;
//   icon: LucideIcon;
//   actual: number;
//   predicted: number;
//   difference: number;
//   accuracy: number;
//   color: string;
// }

const StatsCardOverall: React.FC<any> = ({
  title,
  icon: Icon,
  actual,
  predicted,
  difference,
  accuracy,
  color,
  not_eligible,
  unit
}) => {
  return (
    <Card
      shadow="sm"
    //   padding="lg"
      radius="md"
      style={{
        borderTop: `4px solid ${color}`,
        borderRadius: "10px",
      }}
    >
      <Group justify="space-between">
        <Text fw={600} fz="md" c='#69696b'>
          {title}
        </Text>
        <Icon size={25} color={color} />
      </Group>

      <Divider variant="dashed" mt={10} mb={10}/>

      <Group justify="center" align="center" gap='150'>
        <Flex direction='column' align='center' justify='center'>
            <Text size="sm" c='#69696b'>Actual</Text>
            <Text  fz="lg" fw={500}>{actual} {unit}</Text>
        </Flex>
        <Flex direction='column' align='center' justify='center'>
            <Text size="sm" c='#69696b'>Predicted</Text>
            <Text  fz="lg" fw={500}>{predicted} {unit}</Text>
        </Flex>
      </Group>

      {/* <Group justify="space-between">
      <Text size="sm" c='#69696b'>Actual</Text>
      <Text  fz="md">{actual} {unit}</Text>
      </Group>
      <Space h='xs'/>
      <Group justify="space-between">
      <Text size="sm" c='#69696b'>Predicted</Text>
      <Text  fz="md">{predicted} {unit}</Text>
      </Group>
      <Space h='xs'/> */}
    </Card>
  );
};

export default StatsCardOverall;
