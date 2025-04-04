import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { Card, Grid, Title, Text, Center } from '@mantine/core';

// Register required ECharts components
echarts.use([TitleComponent, TooltipComponent, LegendComponent, PieChart, CanvasRenderer]);

interface Props {
  partUsageData: any;
}

const AircraftPieCharts: React.FC<Props> = ({ partUsageData }) => {
  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);
  
  // Extract data
  const data1 = partUsageData?.aircraftDetails?.task_parts_aircraft_details?.aircraftModels || [];
  const data2 = partUsageData?.aircraftDetails?.sub_task_parts_aircraft_details?.aircraftModels || [];
  
  useEffect(() => {
    const createPieChart = (chartRef: HTMLDivElement | null, data: any[], title: string) => {
      if (!chartRef || data.length === 0) return;
      
      const chart = echarts.init(chartRef);
      chart.setOption({
        tooltip: { 
          trigger: 'item',
          // formatter: '{b}: {c} ({d}%)'
        },
        legend: { 
          orient: 'horizontal', 
          bottom: '0',
          itemWidth: 10,
          itemHeight: 10,
          textStyle: {
            fontSize: 10
          }
        },
        series: [
          {
            name: 'Aircraft Model',
            type: 'pie',
            radius: '60%',
            avoidLabelOverlap: true,
            itemStyle: {
              // borderRadius: 4,
              borderWidth: 2
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '12',
                fontWeight: 'bold'
              },
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
            // labelLine: {
            //   show: false
            // },
            data: data.map((item: any) => ({ value: item.count, name: item.aircraftModel })),
          },
        ],
      });
      
      // Handle window resize
      window.addEventListener('resize', () => {
        chart.resize();
      });
      
      return chart;
    };
    
    const chart1 = createPieChart(chartRef1.current, data1, 'MPD - Aircraft wise Quantity');
    const chart2 = createPieChart(chartRef2.current, data2, 'Findings - Aircraft wise Quantity');
    
    return () => {
      chart1?.dispose();
      chart2?.dispose();
      window.removeEventListener('resize', () => {});
    };
  }, [data1, data2]);
  
  return (
    <Grid>
      <Grid.Col span={6}>
        <Card radius="md" h="60vh">
          <Title order={5} c="dimmed" mb="md">MPD - Aircraft wise Quantity</Title>
          {data1.length > 0 ? (
            <div ref={chartRef1} style={{ width: '100%', height: '88%' }} />
          ) : (
            <Center h="88%"><Text c="dimmed">No data found</Text></Center>
          )}
        </Card>
      </Grid.Col>
      <Grid.Col span={6}>
        <Card radius="md" h="60vh">
          <Title order={5} c="dimmed" mb="md">Findings - Aircraft wise Quantity</Title>
          {data2.length > 0 ? (
            <div ref={chartRef2} style={{ width: '100%', height: '88%' }} />
          ) : (
            <Center h="88%"><Text c="dimmed">No data found</Text></Center>
          )}
        </Card>
      </Grid.Col>
    </Grid>
  );
};

export default AircraftPieCharts;