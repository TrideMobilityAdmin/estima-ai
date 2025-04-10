import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Accordion,
    Card,
    Text,
    Grid,
    Group,
    Title,
    Space,
    TextInput,
    Flex,
    Badge,
    Pagination,
    Center,
    Box,
    ScrollArea,
    Button,
    Tooltip,
    Modal,
    SimpleGrid
} from "@mantine/core";
import { IconDownload, IconSearch } from "@tabler/icons-react";
import { AgGridReact } from "ag-grid-react";

const FindingListCompareScreen: React.FC<{ findingsEligible: any[], findingsNotEligible: any[] }> = ({ findingsEligible, findingsNotEligible }) => {
    const [findingSearch, setFindingSearch] = useState("");
    const [openedAccordion, setOpenedAccordion] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const findingListRef = useRef<HTMLDivElement>(null);
    console.log("findingsEligible >>>> Component >>>> ", findingsEligible);
    const filteredFindings = useMemo(() => {
        const search = findingSearch?.trim()?.toLowerCase();
        if (!search) return findingsEligible;
        return findingsEligible?.filter(finding => finding?.task_number?.toLowerCase()?.includes(search));
    }, [findingsEligible, findingSearch]);

    useEffect(() => {
        setCurrentPage(1);
    }, [findingSearch]);

    const paginatedFindings = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredFindings?.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredFindings, currentPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        findingListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const parts = [
        { partId: "12345", desc: "Part A", qty: 2, predQty: 4, unit: "pcs", price: 10.5 },
        { partId: "67890", desc: "Part B", qty: 1, predQty: 2, unit: "pcs", price: 20.0 },
        { partId: "54321", desc: "Part C", qty: 3, predQty: 6, unit: "pcs", price: 15.75 },
        { partId: "09876", desc: "Part D", qty: 4, predQty: 3, unit: "pcs", price: 5.25 },
    ];

    const notAvailable = [
        {
            findingId: "F-200002-01",
            manHrs: 3,
            sparesCost: 35,
        },
        {
            findingId: "F-200121-01",
            manHrs: 5,
            sparesCost: 50,
        },
        {
            findingId: "F-200435-01",
            manHrs: 4,
            sparesCost: 25,
        },
    ];

    const [opened, setOpened] = useState(false);

    return (
        <>
            <Modal
                opened={opened}
                onClose={() => {
                    setOpened(false);
                }}
                size={800}
                withCloseButton={true}
                styles={{
                    header: {
                        padding: '16px',
                        width: '100%'
                    },
                    title: {
                        width: '100%',
                        margin: 0
                    }
                }}
                title={
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title order={4} c='dimmed'>
                            Findings Not Eligible for Comparison
                        </Title>
                        <Button
                            size="xs"
                            rightSection={<IconDownload size={14} />}
                            variant="light"
                        >
                            Download
                        </Button>
                    </div>
                }
            >
                <Box style={{ flex: 1, height: '400px' }}>
                    <div
                        className="ag-theme-alpine"
                        style={{
                            width: "100%",
                            height: "100%",
                        }}
                    >
                        <style>
                            {`
                            .ag-theme-alpine {
                                --ag-header-background-color: #f8f9fa;
                                --ag-odd-row-background-color: #ffffff;
                                --ag-even-row-background-color: #f9f9f9;
                                --ag-row-hover-color: #f1f3f5;
                                --ag-border-color: #e9ecef;
                                --ag-font-size: 13px;
                            }
                            
                            .ag-theme-alpine .ag-header-cell {
                                font-weight: 600;
                                color: #495057;
                            }
                            
                            .ag-theme-alpine .ag-row {
                                border-bottom: 1px solid var(--ag-border-color);
                            }
                
                            .ag-theme-alpine .ag-cell {
                                padding: 8px;
                            }
                            `}
                        </style>
                        <AgGridReact
                            rowData={notAvailable || []}
                            domLayout="normal"
                            columnDefs={[
                                {
                                    field: "findingId",
                                    headerName: "Finding ID",
                                    flex: 1.5,
                                    minWidth: 120,
                                    sortable: true,
                                    resizable: true,
                                    filter: true,
                                    floatingFilter: true,
                                },
                                {
                                    field: "manHrs",
                                    headerName: "Man Hours",
                                    flex: 1.5,
                                    minWidth: 120,
                                    sortable: true,
                                    resizable: true,
                                },
                                {
                                    field: "sparesCost",
                                    headerName: "Spare Cost",
                                    flex: 0.8,
                                    minWidth: 80,
                                    filter: 'agNumberColumnFilter',
                                    cellRenderer: (val: any) => {
                                        return <>
                                            <Text>
                                                {val?.data?.sparesCost?.toFixed(2)}
                                            </Text>
                                        </>
                                    }
                                }
                            ]}
                            pagination={true}
                            paginationPageSize={10}
                        />
                    </div>
                </Box>
            </Modal>

            <Card radius='md' ref={findingListRef} p="md" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Top Section: Title and Search */}
                <Box mb="md" style={{ flex: '0 0 auto' }}>
                    <Group justify="space-between">
                        <Flex direction='column'>
                            <Title order={3}>Finding Analysis</Title>
                        </Flex>
                        <Group>
                            <TextInput
                                placeholder="Search Findings..."
                                value={findingSearch}
                                leftSection={<IconSearch />}
                                onChange={(e) => setFindingSearch(e.currentTarget.value)}
                                size="xs"
                            />
                            <Tooltip label="Show Not Eligible Findings">
                                <Button
                                    variant="light"
                                    color="red"
                                    size="xs"
                                    radius="sm"
                                    onClick={() => setOpened(true)}
                                >
                                    Not Eligible
                                </Button>
                            </Tooltip>
                        </Group>
                    </Group>
                </Box>

                {/* Middle Section: Scrollable Accordion */}
                <Box style={{ flex: '1 1 auto', marginBottom: "16px" }}>
                    <ScrollArea style={{ height: "calc(100vh - 200px)" }} offsetScrollbars scrollbarSize={1}>
                        {paginatedFindings?.length > 0 ? (
                            <Accordion
                                variant="separated"
                                radius="md"
                                value={openedAccordion}
                                onChange={(value) => setOpenedAccordion(value)}
                            >
                                {paginatedFindings?.map((finding: any) => (
                                    <Accordion.Item key={finding?.task_number} value={finding?.task_number}>
                                        <Accordion.Control
                                            style={{
                                                paddingLeft: 10,
                                                paddingRight: 10,
                                                background: openedAccordion === finding?.task_number
                                                    ? "linear-gradient(90deg,rgb(78, 95, 228), #4364F7)"
                                                    : "transparent",
                                                color: openedAccordion === finding?.task_number ? "#fff" : "#000",
                                                borderRadius: "10px",
                                                height: 65,
                                            }}
                                        >
                                            <Group justify="space-between" style={{ width: "100%", padding: "12px 16px" }}>
                                                <div>
                                                    <Group>
                                                        <Text fz='sm'>Finding :</Text>
                                                        <Title order={5} fz='sm'>{finding?.task_number || "-"}</Title>
                                                    </Group>
                                                </div>
                                            </Group>
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <SimpleGrid cols={2} spacing="xs" mb='xs'>
                                                <Card p={0} h='80vh'>
                                                    <Group p='sm' justify="center">
                                                        <Title order={4}>
                                                            Predicted
                                                        </Title>
                                                    </Group>
                                                    <SimpleGrid cols={2} spacing="xs" >
                                                        <Card bg='#e7fff0' shadow="0" radius='md'>
                                                            <Group justify="space-between" align="start">
                                                                <Flex direction='column'>
                                                                    <Text fz='xs' c="dimmed">Man Hours</Text>
                                                                    <Text fz='lg' fw={600}>{Math.round(finding?.predicted_finding_manhours) || 0} h</Text>
                                                                </Flex>
                                                            </Group>
                                                        </Card>
                                                        <Card bg='#e7fff0' shadow="0" radius='md'>
                                                            <Group justify="space-between" align="start">
                                                                <Flex direction='column'>
                                                                    <Text fz='xs' c="dimmed">Spares Cost</Text>
                                                                    <Text fz='lg' fw={600}>{finding?.predicted_finding_spares_cost?.toFixed(2) || 0} $</Text>
                                                                </Flex>
                                                            </Group>
                                                        </Card>
                                                    </SimpleGrid>
                                                    <Space h='sm' />
                                                    <Box style={{ flex: 1, height: '400px' }}>
                                                        <div
                                                            className="ag-theme-alpine"
                                                            style={{
                                                                width: "100%",
                                                                height: "100%",
                                                            }}
                                                        >
                                                            <style>
                                                                {`
                                                        .ag-theme-alpine {
                                                            --ag-header-background-color: #f8f9fa;
                                                            --ag-odd-row-background-color: #ffffff;
                                                            --ag-even-row-background-color: #f9f9f9;
                                                            --ag-row-hover-color: #f1f3f5;
                                                            --ag-border-color: #e9ecef;
                                                            --ag-font-size: 13px;
                                                        }
                                                        
                                                        .ag-theme-alpine .ag-header-cell {
                                                            font-weight: 600;
                                                            color: #495057;
                                                        }
                                                        
                                                        .ag-theme-alpine .ag-row {
                                                            border-bottom: 1px solid var(--ag-border-color);
                                                        }
                                    
                                                        .ag-theme-alpine .ag-cell {
                                                            padding: 8px;
                                                        }
                                                        `}
                                                            </style>
                                                            <AgGridReact
                                                                rowData={finding?.predicted_finding_sparelist || []}
                                                                domLayout="normal"
                                                                columnDefs={[
                                                                    {
                                                                        field: "partId",
                                                                        headerName: "Part Number",
                                                                        flex: 1.5,
                                                                        minWidth: 120,
                                                                        sortable: true,
                                                                        resizable: true,
                                                                        filter: true,
                                                                        floatingFilter: true,
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.partId}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },
                                                                    {
                                                                        field: "desc",
                                                                        headerName: "Description",
                                                                        flex: 1.5,
                                                                        minWidth: 120,
                                                                        sortable: true,
                                                                        resizable: true,
                                                                        filter: true,
                                                                        floatingFilter: true,
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.desc}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },
                                                                    {
                                                                        field: "qty",
                                                                        headerName: "Qty",
                                                                        flex: 0.8,
                                                                        minWidth: 80,
                                                                        filter: 'agNumberColumnFilter',
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.qty?.toFixed(2)}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },
                                                                    {
                                                                        field: "unit",
                                                                        headerName: "Unit",
                                                                        flex: 0.8,
                                                                        minWidth: 50,
                                                                        sortable: true,
                                                                        resizable: true,
                                                                        filter: true,
                                                                        floatingFilter: true,
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.unit}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },
                                                                    {
                                                                        field: "price",
                                                                        headerName: "Price ($)",
                                                                        flex: 0.8,
                                                                        minWidth: 80,
                                                                        filter: 'agNumberColumnFilter',
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.price?.toFixed(2)}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },

                                                                    {
                                                                        field: "prob",
                                                                        headerName: "Prob (%)",
                                                                        flex: 0.8,
                                                                        minWidth: 80,
                                                                        sortable: true,
                                                                        resizable: true,
                                                                        filter: true,
                                                                        floatingFilter: true,
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.prob?.toFixed(2)}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },
                                                                ]}
                                                                pagination={true}
                                                                paginationPageSize={10}
                                                            />
                                                        </div>
                                                    </Box>
                                                </Card>
                                                <Card p={0} h='80vh'>
                                                    <Group justify="center">
                                                        <Title order={4} p='sm'>
                                                            Actual
                                                        </Title>
                                                    </Group>
                                                    <SimpleGrid cols={2} spacing="xs" >
                                                        <Card bg='#e7f5ff' shadow="0" radius='md'>
                                                            <Group justify="space-between" align="start">
                                                                <Flex direction='column'>
                                                                    <Text fz='xs' c="dimmed">Man Hours</Text>
                                                                    <Text fz='lg' fw={600}>{Math.round(finding?.actual_findings_manhours) || 0} h</Text>
                                                                </Flex>
                                                            </Group>
                                                        </Card>
                                                        <Card bg='#e7f5ff' shadow="0" radius='md'>
                                                            <Group justify="space-between" align="start">
                                                                <Flex direction='column'>
                                                                    <Text fz='xs' c="dimmed">Spares Cost</Text>
                                                                    <Text fz='lg' fw={600}>{finding?.actual_findings_spares_cost?.toFixed(2) || 0} $</Text>
                                                                </Flex>
                                                            </Group>
                                                        </Card>
                                                    </SimpleGrid>
                                                    <Space h='sm' />
                                                    <Box style={{ flex: 1, height: '400px' }}>
                                                        <div
                                                            className="ag-theme-alpine"
                                                            style={{
                                                                width: "100%",
                                                                height: "100%",
                                                            }}
                                                        >
                                                            <style>
                                                                {`
                                                        .ag-theme-alpine {
                                                            --ag-header-background-color: #f8f9fa;
                                                            --ag-odd-row-background-color: #ffffff;
                                                            --ag-even-row-background-color: #f9f9f9;
                                                            --ag-row-hover-color: #f1f3f5;
                                                            --ag-border-color: #e9ecef;
                                                            --ag-font-size: 13px;
                                                        }
                                                        
                                                        .ag-theme-alpine .ag-header-cell {
                                                            font-weight: 600;
                                                            color: #495057;
                                                        }
                                                        
                                                        .ag-theme-alpine .ag-row {
                                                            border-bottom: 1px solid var(--ag-border-color);
                                                        }
                                    
                                                        .ag-theme-alpine .ag-cell {
                                                            padding: 8px;
                                                        }
                                                        `}
                                                            </style>
                                                            <AgGridReact
                                                                rowData={finding?.actual_findings_spares_list || []}
                                                                domLayout="normal"
                                                                columnDefs={[
                                                                    {
                                                                        field: "partId",
                                                                        headerName: "Part Number",
                                                                        flex: 1.5,
                                                                        minWidth: 120,
                                                                        sortable: true,
                                                                        resizable: true,
                                                                        filter: true,
                                                                        floatingFilter: true,
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.partId}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },
                                                                    {
                                                                        field: "desc",
                                                                        headerName: "Description",
                                                                        flex: 1.5,
                                                                        minWidth: 120,
                                                                        sortable: true,
                                                                        resizable: true,
                                                                        filter: true,
                                                                        floatingFilter: true,
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.desc}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },
                                                                    {
                                                                        field: "qty",
                                                                        headerName: "Qty",
                                                                        flex: 0.8,
                                                                        minWidth: 80,
                                                                        filter: 'agNumberColumnFilter',
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.qty?.toFixed(2)}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },
                                                                    {
                                                                        field: "qty",
                                                                        headerName: "Qty",
                                                                        flex: 0.8,
                                                                        minWidth: 80,
                                                                        filter: 'agNumberColumnFilter',
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.qty?.toFixed(2)}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },
                                                                    {
                                                                        field: "unit",
                                                                        headerName: "Unit",
                                                                        flex: 0.5,
                                                                        minWidth: 50,
                                                                        sortable: true,
                                                                        resizable: true,
                                                                        filter: true,
                                                                        floatingFilter: true,
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.unit}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },
                                                                    {
                                                                        field: "price",
                                                                        headerName: "Price ($)",
                                                                        flex: 0.8,
                                                                        minWidth: 80,
                                                                        filter: 'agNumberColumnFilter',
                                                                        cellRenderer: (val: any) => {
                                                                            return <>
                                                                                <Text>
                                                                                    {val?.data?.price?.toFixed(2)}
                                                                                </Text>
                                                                            </>
                                                                        }
                                                                    },
                                                                ]}
                                                                pagination={true}
                                                                paginationPageSize={10}
                                                            />
                                                        </div>
                                                    </Box>
                                                </Card>
                                            </SimpleGrid>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                ))}
                            </Accordion>
                        ) : (
                            <Center>
                                <Text c='gray' p={150}>
                                    No Findings Found
                                </Text>
                            </Center>
                        )}
                    </ScrollArea>
                </Box>

                {/* Bottom Section: Pagination */}
                <Box style={{ flex: '0 0 auto' }}>
                    {filteredFindings?.length > 0 && (
                        <Center>
                            <Pagination
                                color='rgb(78, 95, 228)'
                                total={Math.ceil(filteredFindings?.length / itemsPerPage)}
                                value={currentPage}
                                onChange={handlePageChange}
                            />
                        </Center>
                    )}
                </Box>
            </Card>
        </>
    );
};

export default FindingListCompareScreen;