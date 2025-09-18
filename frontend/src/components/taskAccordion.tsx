import React, { useState, useMemo } from 'react';
import { 
    Card, 
    Title, 
    TextInput, 
    Accordion, 
    Badge, 
    ScrollArea, 
    Center, 
    Text, 
    Group, 
    Flex, 
    Pagination 
} from "@mantine/core";
import { IconCube, IconAlertTriangle } from "@tabler/icons-react";
import airlineColors from '../assets/airlineColors.json';

interface TaskAccordionProps {
    title: string;
    data: any[];
    searchValue: string;
    onSearchChange: (value: string) => void;
    icon?: 'task' | 'finding';
    itemsPerPage?: number;
}

const TaskAccordion: React.FC<TaskAccordionProps> = ({ 
    title, 
    data, 
    searchValue, 
    onSearchChange, 
    icon = 'task',
    itemsPerPage = 8 
}) => {
    const [openItems, setOpenItems] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    // Group tasks by taskId and calculate total quantities
    const groupedTasks = useMemo(() => {
        if (!data || data.length === 0) return [];

        const taskGroups = new Map<string, any>();

        data.forEach((item: any) => {
            const taskId = item.taskId;
            if (!taskId) return;

            if (!taskGroups.has(taskId)) {
                taskGroups.set(taskId, {
                    taskId,
                    taskDescription: item.taskDescription,
                    packages: [],
                    totalQuantity: 0,
                    source: item.source
                });
            }

            const group = taskGroups.get(taskId);
            if (item.packages && Array.isArray(item.packages)) {
                group.packages.push(...item.packages);
                
                // Calculate total quantity for this task
                const taskQuantity = item.packages.reduce((sum: number, pkg: any) => {
                    return sum + (pkg?.quantity || 0);
                }, 0);
                group.totalQuantity += taskQuantity;
            }
        });

        // Sort tasks in alphanumerical order by taskId
        return Array.from(taskGroups.values()).sort((a, b) => {
            const taskA = a.taskId || '';
            const taskB = b.taskId || '';
            
            // Natural alphanumeric sort
            return taskA.localeCompare(taskB, undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        });
    }, [data]);

    // Filter tasks based on search
    const filteredTasks = useMemo(() => {
        if (!searchValue) return groupedTasks;
        
        return groupedTasks.filter((task) =>
            task.taskId?.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [groupedTasks, searchValue]);

    // Pagination
    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
    const displayedTasks = filteredTasks.slice(
        (currentPage - 1) * itemsPerPage, 
        currentPage * itemsPerPage
    );

    const IconComponent = icon === 'finding' ? IconAlertTriangle : IconCube;
    const iconColor = icon === 'finding' ? "#EE0D10" : "#4E66DE";

    // Function to get stock status badge color
    const getStockStatusColor = (stockStatus: string): string => {
        if (!stockStatus) return 'yellow';
        
        // Find matching airline color by name (case insensitive)
        const matchingAirline = airlineColors.find(airline => 
            airline.name.toLowerCase().includes(stockStatus.toLowerCase()) ||
            stockStatus.toLowerCase().includes(airline.name.toLowerCase())
        );
        
        if (matchingAirline) {
            return matchingAirline.primaryColor;
        }
        
        // Default colors for common stock statuses
        const statusLower = stockStatus.toLowerCase();
        if (statusLower.includes('owned')) {
            return '#05154F'; // Navy blue for owned
        } else if (statusLower.includes('available')) {
            return '#00A651'; // Green for available
        } else if (statusLower.includes('unavailable') || statusLower.includes('out of stock')) {
            return '#E2231A'; // Red for unavailable
        } else if (statusLower.includes('pending')) {
            return '#FF8301'; // Orange for pending
        } else if (statusLower.includes('reserved')) {
            return '#A020F0'; // Purple for reserved
        }
        
        return '#FFA400'; // Default yellow-orange
    };

    return (
        <Card radius="md" h="90vh" style={{ overflowY: "auto" }}>
            {/* Title & Search Input */}
            <Title order={5} mb="sm">{title}</Title>
            <TextInput
                placeholder={`Search ${title}...`}
                value={searchValue}
                onChange={(e) => onSearchChange(e.currentTarget.value)}
                mb="md"
            />

            {/* Scrollable Accordion List */}
            {displayedTasks.length > 0 ? (
                <ScrollArea h="70vh" scrollbarSize={0} scrollHideDelay={0}>
                    <Accordion
                        variant="separated"
                        radius="md"
                        multiple
                        value={openItems}
                        onChange={setOpenItems}
                    >
                        {displayedTasks.map((task: any, index: number) => {
                            const itemValue = `${task.taskId}-${index}`;
                            return (
                                <Accordion.Item key={itemValue} value={itemValue}>
                                    <Accordion.Control>
                                        <Group justify="space-between" w="100%">
                                            <Group>
                                                <IconComponent color={iconColor} size={20} />
                                                <Text fw={500}>{task.taskId || "-"}</Text>
                                            </Group>
                                            <Badge 
                                                color="blue" 
                                                variant="light"
                                                size="lg"
                                                style={{ marginRight: '20px' }}
                                            >
                                                Qty: {Math.round(task.totalQuantity)}
                                            </Badge>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <ScrollArea 
                                            h={task.packages?.length > 2 ? 250 : 200} 
                                            scrollHideDelay={0}
                                        >
                                            <Text fz="xs" mb="sm">
                                                <Text span c="gray" inherit>
                                                    Description: {" "}
                                                </Text>
                                                {task.taskDescription || "-"}
                                            </Text>

                                            {task.packages?.map((pkg: any, pkgIndex: number) => (
                                                <Card 
                                                    key={`${pkg.packageId}-${pkgIndex}`} 
                                                    p="sm" 
                                                    radius="md" 
                                                    mt="xs" 
                                                    bg="#ebeced"
                                                >
                                                    <Flex direction="column" gap="xs">
                                                        {/* Package ID with Quantity Badge */}
                                                        <Group justify="space-between" align="center">
                                                            <Group>
                                                                <Text c="dimmed" fz="sm">
                                                                    Package ID:
                                                                </Text>
                                                                <Text fw={500} fz="sm">
                                                                    {pkg?.packageId || "-"}
                                                                </Text>
                                                            </Group>
                                                            <Badge color="blue" size="sm">
                                                                Qty: {pkg?.quantity || "-"}
                                                            </Badge>
                                                        </Group>
                                                        
                                                        {/* Aircraft Model with Stock Status Badge */}
                                                        {(pkg?.aircraftModel || pkg?.aircraft_model) && (
                                                            <Group justify="space-between" align="center">
                                                                <Group>
                                                                    <Text c="dimmed" fz="sm">
                                                                        Aircraft Model:
                                                                    </Text>
                                                                    <Text fw={500} fz="sm">
                                                                        {pkg?.aircraftModel || pkg?.aircraft_model}
                                                                    </Text>
                                                                </Group>
                                                                {pkg?.stockStatus && (
                                                                    <Badge 
                                                                        size="sm"
                                                                        style={{ backgroundColor: getStockStatusColor(pkg.stockStatus), color: 'white' }}
                                                                    >
                                                                        {pkg.stockStatus}
                                                                    </Badge>
                                                                )}
                                                            </Group>
                                                        )}
                                                        
                                                        {/* Log Item / Task Number */}
                                                        {pkg?.logItem && (
                                                            <Group>
                                                                <Text c="dimmed" fz="sm">
                                                                    {title === 'MPD' ? 'Task Number:' : 'Log Item:'}
                                                                </Text>
                                                                <Text fw={500} fz="sm">
                                                                    {pkg.logItem}
                                                                </Text>
                                                            </Group>
                                                        )}
                                                        
                                                        {/* Description */}
                                                        {pkg?.description && (
                                                            <Group>
                                                                <Text c="dimmed" fz="sm">
                                                                    Description:
                                                                </Text>
                                                                <Text fw={500} fz="sm">
                                                                    {pkg.description}
                                                                </Text>
                                                            </Group>
                                                        )}
                                                        
                                                        {/* Date */}
                                                        <Group>
                                                            <Text c="dimmed" fz="sm">
                                                                Date:
                                                            </Text>
                                                            <Text fw={500} fz="sm">
                                                                {pkg?.date || "-"}
                                                            </Text>
                                                        </Group>
                                                        
                                                        {/* Show stock status badge separately if no aircraft model */}
                                                        {pkg?.stockStatus && !pkg?.aircraftModel && !pkg?.aircraft_model && (
                                                            <Group justify="flex-end">
                                                                <Badge 
                                                                    size="sm"
                                                                    style={{ backgroundColor: getStockStatusColor(pkg.stockStatus), color: 'white' }}
                                                                >
                                                                    {pkg.stockStatus}
                                                                </Badge>
                                                            </Group>
                                                        )}
                                                    </Flex>
                                                </Card>
                                            ))}
                                        </ScrollArea>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            );
                        })}
                    </Accordion>
                </ScrollArea>
            ) : (
                <Center h="60vh">
                    <Text c="dimmed">No {title} Found</Text>
                </Center>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <Center mt="md">
                    <Pagination
                        color="#4E66DE"
                        total={totalPages}
                        value={currentPage}
                        onChange={setCurrentPage}
                        size="sm"
                    />
                </Center>
            )}
        </Card>
    );
};

export default TaskAccordion;
