// import { Grid, Title } from "@mantine/core";
import { SegmentedControl, Select } from "@mantine/core";
import DropZoneExcel from "../components/fileDropZone";
import {
    Badge,
    Box,
    Button,
    Card,
    Divider,
    Flex,
    Grid,
    Group,
    MdLensBlur,
    MdOutlineArrowForward,
    MdPin,
    MdOutlineFileDownload,
    ScrollArea,
    SimpleGrid,
    Space,
    Text,
    TextInput,
    Title,
    useState,
    MdPictureAsPdf,
    ThemeIcon,
    MdOutlineTimeline,
    MdOutlineMiscellaneousServices,
    Progress,
    axios,
    showNotification,
    Table
} from "../constants/GlobalImports";
import { AreaChart } from "@mantine/charts";
import '../App.css';
export default function Estimate() {
    const [scrolledTable, setScrolledTable] = useState(false);
    const [tasks, setTasks] = useState<string[]>([]);
    const handleFiles = (files: File[]) => {
        console.log("Uploaded files:", files);
    };
    // Handle extracted tasks
    const handleTasks = (extractedTasks: string[]) => {
        setTasks(extractedTasks);
        console.log("tasks :", extractedTasks);
    };

    const [downloading, setDownloading] = useState(false);
    const handleDownloadPDF = async () => {
        setDownloading(true); // Start loading
        try {
            const response = await axios.get(
                "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf",
                {
                    responseType: "blob", // Ensure the response is a Blob (binary data)
                }
            );

            // Create a Blob URL for the PDF file
            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);

            // Create a link element to trigger the download
            const link = document.createElement("a");
            link.href = url;
            link.download = "Estimate.pdf"; // Name for the downloaded file
            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);

            // Show success notification
            showNotification({
                title: "Download Successful",
                message: "Your PDF has been downloaded successfully!",
                color: "green",
            });
        } catch (error) {
            console.error("Error downloading PDF:", error);

            // Show error notification
            showNotification({
                title: "Download Failed",
                message: "There was an error downloading the PDF.",
                color: "red",
            });
        } finally {
            setDownloading(false); // End loading
        }
    };

    const parts = [
        {
            partName: "Nut",
            partDesc: "POO1",
            qty: "6",
            unit: "",
            price: "20"
        },
        {
            partName: "Foam Tape",
            partDesc: "POO2",
            qty: "2",
            unit: "",
            price: "80"
        },
        {
            partName: "Blind Rivet",
            partDesc: "POO3",
            qty: "1",
            unit: "",
            price: "40"
        },
        {
            partName: "Selant",
            partDesc: "POO4",
            qty: "4",
            unit: "",
            price: "20"
        },
        {
            partName: "Nut",
            partDesc: "POO1",
            qty: "6",
            unit: "",
            price: "20"
        },
        {
            partName: "Foam Tape",
            partDesc: "POO2",
            qty: "2",
            unit: "",
            price: "80"
        },
        {
            partName: "Blind Rivet",
            partDesc: "POO3",
            qty: "1",
            unit: "",
            price: "40"
        },
        {
            partName: "Selant",
            partDesc: "POO4",
            qty: "4",
            unit: "",
            price: "20"
        }
    ];
    const rows = parts.map((element) => (
        <Table.Tr key={element.partDesc}>
            <Table.Td>{element.partDesc}</Table.Td>
            <Table.Td>{element.partName}</Table.Td>
            <Table.Td>{element.qty}</Table.Td>
            <Table.Td>{element.price}</Table.Td>
        </Table.Tr>
    ));
    // const handleDownloadPDF = async () => {
    //     try {
    //       const response = await axios.get(
    //         "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf",
    //         {
    //           responseType: "blob", // Ensure the response is a Blob (binary data)
    //         }
    //       );

    //       // Create a Blob URL for the PDF file
    //       const blob = new Blob([response.data], { type: "application/pdf" });
    //       const url = window.URL.createObjectURL(blob);

    //       // Create a link element to trigger the download
    //       const link = document.createElement("a");
    //       link.href = url;
    //       link.download = "Estimate.pdf"; // Name for the downloaded file
    //       document.body.appendChild(link);
    //       link.click();

    //       // Cleanup
    //       link.remove();
    //       window.URL.revokeObjectURL(url);
    //     } catch (error) {
    //       console.error("Error downloading PDF:", error);
    //     }
    //   };

    // console.log("")
    return (
        <>
            <div style={{ padding: 70 }}>
                <Grid grow gutter="xs">
                    <Grid.Col span={3}>
                        <Card withBorder
                            // className="glass-card"
                            h='50vh' radius='md'
                        // style={{
                        //     background: 'rgba(255, 255, 255, 0.1)',
                        //     backdropFilter : "blur(50px)",
                        //     boxShadow : "0 4px 30px rgba(0, 0, 0, 0.1)",
                        //     borderRadius: '8px',
                        //     padding: '16px',
                        //     display: 'flex',
                        //     flexDirection: "column",
                        // }}
                        >
                            <Group>
                                <Text size="md" fw={500}>
                                    Select Document
                                </Text>
                                <DropZoneExcel
                                    name="Excel Files"
                                    changeHandler={handleTasks}
                                    color="green" // Optional custom border color
                                />
                            </Group>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={5}>
                        <Card withBorder h='50vh' radius='md'>
                            <Group mb='xs'>
                                <Text size="md" fw={500}>
                                    Tasks
                                </Text>
                                {
                                    tasks.length > 0 ? (
                                        <Badge color="indigo" size="md" radius="sm">
                                            {tasks?.length}
                                        </Badge>
                                    ) : (
                                        <></>
                                    )
                                }
                            </Group>
                            <ScrollArea
                                style={{
                                    flex: 1, // Take remaining space for scrollable area
                                    overflow: "auto",
                                }}
                                offsetScrollbars
                                scrollHideDelay={1}
                            >
                                {tasks.length > 0 ? (
                                    <SimpleGrid cols={4}>
                                        {tasks.map((task, index) => (
                                            <Badge
                                                key={index}
                                                color="blue"
                                                variant="light"
                                                radius='sm'
                                                style={{ margin: "0.25em" }}
                                            >
                                                {task}
                                            </Badge>
                                        ))}
                                    </SimpleGrid>
                                ) : (
                                    <Text ta='center' size="sm" c="dimmed">
                                        No tasks found. Please Select a file.
                                    </Text>
                                )}
                            </ScrollArea>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={4}>
                        <Card withBorder h='50vh' radius='md'>
                            <Text size="md" fw={500} >
                                RFQ Parameters
                            </Text>
                            <ScrollArea
                                style={{
                                    flex: 1, // Take remaining space for scrollable area
                                    overflow: "auto",
                                }}
                                offsetScrollbars
                                scrollHideDelay={1}
                            >
                                <SimpleGrid cols={1} spacing='xs'>
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Probability"
                                    //   {...form.getInputProps("probability")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Indigo, AirIndia"
                                        label="Operator"
                                    //   {...form.getInputProps("assetOwner")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Aircraft Age"
                                    //   {...form.getInputProps("assetOwner")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Flight Cycles"
                                    //   {...form.getInputProps("assetOwner")}
                                    />
                                    <TextInput
                                        size="xs"
                                        leftSection={<MdPin />}
                                        placeholder="Ex:50"
                                        label="Flight Hours"
                                    //   {...form.getInputProps("assetOwner")}
                                    />

                                    <Text size="md" fw={500}>
                                        Capping
                                    </Text>

                                    <Grid>
                                        <Grid.Col span={7}>
                                            <Select
                                                size="xs"
                                                label="Man Hrs Capping Type"
                                                placeholder="Select Capping Type"
                                                data={['Type - 1', 'Type - 2', 'Type - 3', 'Type - 4']}
                                                defaultValue="React"
                                                allowDeselect
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={5}>
                                            <TextInput
                                                size="xs"
                                                leftSection={<MdPin />}
                                                placeholder="Ex: 40"
                                                label="Man Hours"
                                            //   {...form.getInputProps("assetOwner")}
                                            />
                                        </Grid.Col>
                                    </Grid>

                                    <Grid>
                                        <Grid.Col span={7}>
                                            <Select
                                                size="xs"
                                                label="Spares Capping Type"
                                                placeholder="Select Capping Type"
                                                data={['Type - 1', 'Type - 2', 'Type - 3', 'Type - 4']}
                                                defaultValue="React"
                                                allowDeselect
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={5}>
                                            <TextInput
                                                size="xs"
                                                leftSection={<MdPin />}
                                                placeholder="Ex: 600$"
                                                label="Cost($)"
                                            //   {...form.getInputProps("assetOwner")}
                                            />
                                        </Grid.Col>
                                    </Grid>
                                </SimpleGrid>


                            </ScrollArea>
                        </Card>
                    </Grid.Col>
                </Grid>

                <Group justify="center" pt='sm' pb='sm'>
                    <Button
                        variant="gradient"
                        gradient={{ from: 'indigo', to: 'cyan', deg: 90 }}
                        // variant="filled"
                        // color='#1A237E'
                        disabled={tasks.length > 0 ? false : true}
                        leftSection={<MdLensBlur size={14} />}
                        rightSection={<MdOutlineArrowForward size={14} />}
                    >
                        Generate Estimate
                    </Button>
                </Group>

                <Divider
                    variant="dashed"
                    labelPosition="center"
                    color={"gray"}
                    pb='sm'
                    pt='sm'
                    label={
                        <>
                            <Box ml={5}>Estimate</Box>
                        </>
                    }
                />

                <Group justify="space-between">
                    <Title order={4}>
                        Overall Estimate Report
                    </Title>
                    <Button
                        size="xs"
                        variant="filled"
                        color="#1bb343"
                        leftSection={<MdPictureAsPdf size={14} />}
                        rightSection={<MdOutlineFileDownload size={14} />}
                        onClick={handleDownloadPDF}
                        loading={downloading} // Mantine built-in downloading effect
                    >
                        {downloading ? "Downloading..." : "Download Estimate"}
                    </Button>
                </Group>

                <Space h='sm' />

                <SimpleGrid cols={3} spacing='xs'>
                    <Flex
                        justify="flex-start"
                        align="flex-start"
                        direction="column"
                    >
                        <Card withBorder w='100%' p={5}>
                            <Group p={0} gap='sm'>
                                <ThemeIcon variant="light" radius="md" size="60" color="indigo">
                                    <MdOutlineTimeline style={{ width: '70%', height: '70%' }} />
                                </ThemeIcon>

                                <Flex direction='column'>
                                    <Text size="md" fw={500} fz='h6' c='gray'>
                                        Total TAT Time
                                    </Text>
                                    <Text size="md" fw={600} fz='h3' >
                                        44
                                    </Text>
                                </Flex>
                            </Group>
                        </Card>
                        <Space h='sm' />
                        <Card withBorder w='100%'>
                            <Flex gap="lg" direction="column">
                                <Title order={6} c='gray'>Est Man Hrs.</Title>
                                <Grid justify="flex-start" align="center">
                                    <Grid.Col span={3}>
                                        <Text fz='sm'>Min</Text>
                                    </Grid.Col>
                                    <Grid.Col span={9}>
                                        <Group justify="flex-end" fz='xs' fw='600' c="green">{40} Hrs</Group>
                                        <Progress color="green" value={40} />
                                    </Grid.Col>
                                </Grid>

                                <Grid justify="flex-start" align="center">
                                    <Grid.Col span={3}>
                                        <Text fz='sm'>Estimated</Text>
                                    </Grid.Col>
                                    <Grid.Col span={9}>
                                        <Group justify="flex-end" fz='xs' fw='600' c="yellow">{66} Hrs</Group>
                                        <Progress color="yellow" value={66} />
                                    </Grid.Col>
                                </Grid>

                                <Grid justify="flex-start" align="center">
                                    <Grid.Col span={3}>
                                        <Text fz='sm'>Max</Text>
                                    </Grid.Col>
                                    <Grid.Col span={9}>
                                        <Group justify="flex-end" fz='xs' fw='600' c="red">{46} Hrs</Group>
                                        <Progress color="red" value={46} />
                                    </Grid.Col>
                                </Grid>

                                <Grid justify="flex-start" align="center">
                                    <Grid.Col span={3}>
                                        <Text fz='sm'>Capping</Text>
                                    </Grid.Col>
                                    <Grid.Col span={9}>
                                        <Group justify="flex-end" fz='xs' fw='600' c="indigo">{46} Hrs</Group>
                                        <Progress color="indigo" value={46} />
                                    </Grid.Col>
                                </Grid>
                            </Flex>
                        </Card>
                        <Space h='sm' />
                        <Card withBorder w='100%' p={5}>
                            <Group p={0} gap='sm'>
                                <ThemeIcon variant="light" radius="md" size="60" color="indigo">
                                    <MdOutlineMiscellaneousServices style={{ width: '70%', height: '70%' }} />
                                </ThemeIcon>
                                <Flex direction='column'>
                                    <Text size="md" fw={500} fz='h6' c='gray'>
                                        Capping Unbilled Costing ($)
                                    </Text>
                                    <Text size="md" fw={600} fz='h3' >
                                        44
                                    </Text>
                                </Flex>
                            </Group>
                        </Card>
                    </Flex>

                    <Card withBorder>
                        <Text size="md" fw={500} fz="h6" c="gray">
                            Estimated Parts
                        </Text>

                        {/* Custom CSS for sticky header and scrollable body */}
                        <div style={{ position: 'relative', height: '40vh', overflow: 'hidden' }}>
                            <Table
                                stickyHeader
                                striped
                                highlightOnHover
                                style={{
                                    // position: 'relative',
                                    overflow: 'auto',
                                    height: '100%',
                                }}
                            >
                                {/* Sticky Header */}
                                <Table.Thead
                                    style={{
                                        position: 'sticky',
                                        top: 0,
                                        backgroundColor: 'white',
                                        zIndex: 1,
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                                    }}
                                >
                                    <Table.Tr>
                                        <Table.Th>Part Desc</Table.Th>
                                        <Table.Th>Part Name</Table.Th>
                                        <Table.Th>Qty</Table.Th>
                                        <Table.Th>Price($)</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>

                                {/* Scrollable Body */}
                                <Table.Tbody style={{ overflow: 'auto', height: "50vh" }}>
                                    {parts.length > 0 ? (
                                        parts.map((row, index) => (
                                            <Table.Tr key={index}>
                                                <Table.Td>{row.partDesc}</Table.Td>
                                                <Table.Td>{row.partName}</Table.Td>
                                                <Table.Td>{row.qty}</Table.Td>
                                                <Table.Td>{row.price}</Table.Td>
                                            </Table.Tr>
                                        ))
                                    ) : (
                                        <Table.Tr>
                                            <Table.Td colSpan={4} style={{ textAlign: 'center' }}>
                                                No data available
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </div>
                    </Card>

                    <Flex
                    justify="flex-start"
                    align="flex-start"
                    direction="column"
                    >
                        <Card withBorder w='100%' p={5}>
                            <Group p={0} gap='sm'>
                                <ThemeIcon variant="light" radius="md" size="60" color="indigo">
                                    <MdOutlineMiscellaneousServices style={{ width: '70%', height: '70%' }} />
                                </ThemeIcon>
                                <Flex direction='column'>
                                    <Text size="md" fw={500} fz='h6' c='gray'>
                                        Estimated Spares Cost ($)
                                    </Text>
                                    <Text size="md" fw={600} fz='h3' >
                                        44
                                    </Text>
                                </Flex>
                            </Group>
                        </Card>
                        <Space h='sm' />
                        <Card w='100%' withBorder radius={10}>
          <Flex gap="lg" direction="column">
            <Title order={5}>Spare Cost ($)</Title>
            <AreaChart
              h={250}
              data={[
                {
                  date: "Min",
                  Cost:  100,
                },
                {
                  date: "Estimated",
                  Cost: 800,
                },
                {
                  date: "Max",
                  Cost: 1000,
                },
              ]}
              dataKey="date"
              series={[{ name: "Cost", color: "indigo.6" }]}
              curveType="natural"
              connectNulls
            />
          </Flex>
        </Card>
                    </Flex>
                    
                </SimpleGrid>
                <Space h='xl' />

                <SegmentedControl color="#1A237E" bg='white' data={['Findings', 'Man Hours', 'Spare Parts']} />
            </div>
        </>
    )
}