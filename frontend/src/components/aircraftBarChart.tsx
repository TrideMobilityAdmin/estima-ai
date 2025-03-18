import React, { useEffect, useRef } from 'react';
import { Box, Paper, Title } from '@mantine/core';
import * as echarts from 'echarts';

// Define the data structure
interface FlightData {
  value: number;
  percent: number;
}

// Component props
interface FlightDataVisualizationProps {
  data?: FlightData[];
  title?: string;
  height?: number;
}

const FlightDataVisualization: React.FC<FlightDataVisualizationProps> = ({
  data = [
    { value: 123, percent: 82 },
    { value: 60, percent: 23 },
    { value: 95, percent: 67 },
    { value: 75, percent: 59 },
    { value: 60, percent: 48 }
  ],
  title = 'Flight Data Visualization',
  height = 500
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    // Initialize chart when component mounts
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // Clean up function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;

    // Flight path SVG symbol - airplane icon
    const flightSymbol = 'path://M40.8,39.4c-0.3-0.3-0.8-0.4-1.3-0.4l-7.1-1.4L19.9,26.5c-0.3-0.3-0.7-0.4-1.1-0.4l-9.4,0.7' +
      'c-0.4,0-0.7,0.2-0.9,0.5C8.2,27.5,8.1,28,8.3,28.4l2.3,5.2c0.2,0.5,0.6,0.8,1.1,0.8l9.3-0.7l6.2,4.9l-7.8,7.1' +
      'c-0.4,0.4-0.5,0.9-0.3,1.4c0.2,0.5,0.7,0.8,1.2,0.8h3.3c0.3,0,0.6-0.1,0.8-0.3l8.9-6.5l7.6,1.5c0.1,0,0.2,0,0.2,0' +
      'c0.3,0,0.6-0.1,0.9-0.3c0.3-0.2,0.5-0.6,0.5-1v-1.1C41.6,40.1,41.3,39.7,40.8,39.4z';

    // Extract values and percentages
    const values = data.map(item => item.value);
    const percentages = data.map(item => item.percent + '%');
    const max = Math.max(...values);
    const min = Math.min(...values);

    // Option configuration
    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params: any) {
          return `Value: ${params[0].value}<br/>Percentage: ${data[params[0].dataIndex].percent}%`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: percentages,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 14,
          fontWeight: 'bold',
          color: '#333'
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: max + 10,
        splitLine: { 
          show: true,
          lineStyle: {
            type: 'dashed',
            color: '#ddd'
          }
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: true }
      },
      series: [
        {
          name: 'Base',
          type: 'pictorialBar',
          symbolSize: [60, 60],
          symbolOffset: [0, 0],
          z: 10,
          data: values.map((value, index) => {
            return {
              value: value,
              symbol: flightSymbol,
              symbolSize: [60, 60],
              symbolRotate: 0,
              itemStyle: {
                color: index % 2 === 0 ? '#5470c6' : '#91cc75'
              }
            };
          })
        },
        {
          name: 'Background',
          type: 'pictorialBar',
          symbolSize: [60, 60],
          symbolOffset: [0, 0],
          z: 5,
          data: values.map(() => {
            return {
              value: max,
              symbol: flightSymbol,
              symbolSize: [60, 60],
              symbolRotate: 0,
              itemStyle: {
                color: '#ddd',
                opacity: 0.3
              }
            };
          })
        }
      ],
      // Add markers for max and min values
      graphic: [
        {
          type: 'text',
          left: 'right',
          top: max / (max + 10) * 100 + '%',
          style: {
            text: 'max: ' + max,
            align: 'right',
            fill: '#999',
            fontSize: 12
          }
        },
        {
          type: 'text',
          left: 'right',
          top: min / (max + 10) * 100 + '%',
          style: {
            text: 'min: ' + min,
            align: 'right',
            fill: '#999',
            fontSize: 12
          }
        }
      ]
    };

    // Set the option and render the chart
    chartInstance.current.setOption(option);
  }, [data]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <Paper shadow="sm" p="md" radius="md">
      <Title order={2} mb="md">{title}</Title>
      <Box ref={chartRef} style={{ width: '100%', height: height }} />
    </Paper>
  );
};

export default FlightDataVisualization;