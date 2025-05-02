import { Card, Text, Group, Divider, Space, ThemeIcon, Flex, Title } from "@mantine/core";
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

const StatsCardUnbillable: React.FC<any> = ({
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
     <Card withBorder radius="md" p="5" mb="sm" bg="gray.0">
              <Group gap="md">
                <ThemeIcon variant="light" radius="md" size={50} color="blue.6">
                  <Icon size={24} />
                </ThemeIcon>
                <Flex direction="column">
                  <Text size="sm" fw={500} c="dimmed">
                    {title}
                  </Text>
                  <Text size="lg" fw={600} c="blue.6">
                    {actual}
                  </Text>
                </Flex>
              </Group>
    
              </Card>
  );
};

export default StatsCardUnbillable;
