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
        text: 'Task Distribution by Skill',
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

interface Task {
    taskId: string;
    manHours: {
        avg: number;
    };
}

interface SkillGroup {
    skill: string;
    tasks: Task[];
}

const SkillsTasksDonutChart = ({ skillGroup }: { skillGroup: SkillGroup }) => {
    // Transform data to show distribution of average hours across tasks for this skill
    const series = skillGroup.tasks.map(task => task.manHours.avg);
    const labels = skillGroup.tasks.map(task => task.taskId);

    const updatedConfig = {
        ...chartConfig,
        title: {
            ...chartConfig.title,
            text: `Task Distribution for ${skillGroup.skill}`,
        },
    };

    return (
        <Center mb="lg">
            <div style={{ width: 300, height: 300 }}>
                {series.length ? (
                    <ReactApexChart
                        type="donut"
                        height={280}
                        width={280}
                        options={updatedConfig}
                        series={series}
                        labels={labels}
                    />
                ) : (
                    <Text>No data available</Text>
                )}
            </div>
        </Center>
    );
};

// Optional: Create a component for findings distribution
const SkillsFindingsDonutChart = ({ skillGroup }: { skillGroup: any }) => {
    const series = skillGroup.tasks.map((task:any) => task.manHours.avg);
    const labels = skillGroup.tasks.map((task:any) => task.taskId);

    const updatedConfig = {
        ...chartConfig,
        title: {
            ...chartConfig.title,
            text: `Findings Distribution for ${skillGroup.skill}`,
        },
    };

    return (
        <Center mb="lg">
            <div style={{ width: 300, height: 300 }}>
                {series.length ? (
                    <ReactApexChart
                        type="donut"
                        height={280}
                        width={280}
                        options={updatedConfig}
                        series={series}
                        labels={labels}
                    />
                ) : (
                    <Text>No data available</Text>
                )}
            </div>
        </Center>
    );
};

export { SkillsTasksDonutChart, SkillsFindingsDonutChart };