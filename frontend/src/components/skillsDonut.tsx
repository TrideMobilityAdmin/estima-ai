import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { Center, Text } from '@mantine/core';
import { ApexOptions } from 'apexcharts';

const chartConfig: ApexOptions = {
    chart: {
        background: 'transparent',
        type: 'donut',
    },
    title: {
        text: 'Skill Distribution',
        align: 'center',
        style: {
            fontSize: '16px',
            fontWeight: 500,
        },
    },
    plotOptions: {
        pie: {
            donut: {
                size: '65%',
                labels: {
                    show: true,
                    value: {
                        show: true,
                        fontSize: '16px',
                        fontWeight: 600,
                        formatter: (val: any) => `${val.toFixed(1)}%`,
                    },
                    total: {
                        show: true,
                        fontSize: '16px',
                        fontWeight: 600,
                        formatter: (w: any) => {
                            const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                            return `${total.toFixed(1)} hrs`;
                        },
                    },
                },
            },
        },
    },
    dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`,
        style: {
            fontSize: '14px',
            fontWeight: 600,
        },
    },
    legend: {
        position: 'bottom',
        fontSize: '14px',
    },
    stroke: {
        width: 0,
    },
    tooltip: {
        enabled: true,
        y: {
            formatter: (val: number) => `${val.toFixed(1)} hrs`,
        },
    },
};

const SkillsDonutChart = ({ task } :any) => {
    const series = task?.skills
        ?.map((skill : any) => skill?.manHours?.avg)
        ?.filter((val : any) => typeof val === "number" && !isNaN(val)) || [];

    const labels = task?.skills?.map((skill : any) => skill?.skill || "Unknown Skill") || [];

    return (
        <Center mb="lg">
            <div style={{ width: 300, height: 300 }}>
                {series.length ? (
                    <ReactApexChart
                        type="donut"
                        height={280}
                        width={280}
                        options={chartConfig}
                        labels={labels}
                        series={series}
                    />
                ) : (
                    <Text>No data available</Text>
                )}
            </div>
        </Center>
    );
};

export default SkillsDonutChart;