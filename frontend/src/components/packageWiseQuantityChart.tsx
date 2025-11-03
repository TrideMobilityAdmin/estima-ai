import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Card, Title, Center, Text } from '@mantine/core';

interface PackageWiseChartProps {
    title: string;
    data: { packageId: string; quantity: number }[];
}

const PackageWiseQuantityChart: React.FC<PackageWiseChartProps> = ({ title, data }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<echarts.ECharts | null>(null);
    
    // console.log(`${title} - Received data:`, data);

    useEffect(() => {
        // Cleanup previous chart
        if (chartInstanceRef.current) {
            chartInstanceRef.current.dispose();
            chartInstanceRef.current = null;
        }

        if (!chartRef.current || !data || data.length === 0) {
            return;
        }

        try {
            // Initialize chart
            const chart = echarts.init(chartRef.current);
            chartInstanceRef.current = chart;

            const option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    },
                    formatter: function (params: any) {
                        const dataPoint = params[0];
                        return `<strong>${dataPoint.name}</strong><br/>Quantity: ${dataPoint.value}`;
                    }
                },
                grid: {
                    left: 60,
                    right: 40,
                    bottom: 100,
                    top: 40,
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: data.map(item => item.packageId),
                    axisLabel: {
                        interval: 0,
                        rotate: -45,
                        fontSize: 11,
                        color: '#666',
                        margin: 15
                    },
                    axisTick: {
                        alignWithLabel: true
                    },
                    axisLine: {
                        lineStyle: {
                            color: '#d0d0d0'
                        }
                    }
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        fontSize: 11,
                        color: '#666'
                    },
                    splitLine: {
                        show: true,
                        lineStyle: {
                            color: '#f0f0f0',
                            type: 'dashed'
                        }
                    },
                    axisLine: {
                        show: false
                    }
                },
                series: [
                    {
                        name: 'Quantity',
                        type: 'bar',
                        data: data.map(item => item.quantity),
                        itemStyle: {
                            color: '#1445B6',
                            borderRadius: [4, 4, 0, 0]
                        },
                        barWidth: 40,
                        emphasis: {
                            itemStyle: {
                                color: '#0d3494'
                            }
                        }
                    }
                ]
            };

            chart.setOption(option);

            // Handle resize
            const handleResize = () => {
                if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
                    chartInstanceRef.current.resize();
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
            };
        } catch (error) {
            console.error('Error initializing chart:', error);
        }
    }, [data]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.dispose();
                chartInstanceRef.current = null;
            }
        };
    }, []);

    if (!data || data.length === 0) {
        return (
            <Card>
                <Title order={5} c='dimmed' mb="md">
                    {title}
                </Title>
                <Center h={400}>
                    <Text c="dimmed">No Data Available</Text>
                </Center>
            </Card>
        );
    }

    // Calculate dynamic width for horizontal scrolling
    const barWidth = 40;
    const barSpacing = 20;
    const minWidth = 500;
    const dynamicWidth = Math.max(data.length * (barWidth + barSpacing), minWidth);

    return (
        <Card>
            <Title order={5} c='dimmed' mb="md">
                {title}
            </Title>
            <div
                style={{
                    width: '100%',
                    height: '400px',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff'
                }}
                className="scrollable-chart-container"
            >
                <div
                    ref={chartRef}
                    style={{
                        width: `${dynamicWidth}px`,
                        height: '430px',
                        minWidth: `${minWidth}px`
                    }}
                />
            </div>
        </Card>
    );
};

export default PackageWiseQuantityChart;
