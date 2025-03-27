import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { Card, Grid, Title } from '@mantine/core';

// Register required ECharts components
echarts.use([TitleComponent, TooltipComponent, LegendComponent, PieChart, CanvasRenderer]);

interface Props {
  partUsageData: any;
}

const AircraftPieCharts: React.FC<Props> = ({ partUsageData }) => {
  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef1.current && chartRef2.current) {
      const chart1 = echarts.init(chartRef1.current);
      const chart2 = echarts.init(chartRef2.current);

      const createPieChartOption = (title: string, data: any[]) => ({
        // title: {
        //   text: title,
        //   left: 'center',
        // },
        tooltip: {
          trigger: 'item',
        },
        legend: {
          orient: 'vertical',
          left: 'right',
        },
        series: [
          {
            name: 'Aircraft Model',
            type: 'pie',
            radius: '60%',
            data: data.map((item: any) => ({
              value: item.count,
              name: item.aircraftModel,
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      });

      const data1 = partUsageData?.aircraftDetails?.task_parts_aircraft_details?.aircraftModels || [];
      const data2 = partUsageData?.aircraftDetails?.sub_task_parts_aircraft_details?.aircraftModels || [];

      chart1.setOption(createPieChartOption('MPD - Aircraft wise Quantity', data1));
      chart2.setOption(createPieChartOption('Findings - Aircraft wise Quantity', data2));

      return () => {
        chart1.dispose();
        chart2.dispose();
      };
    }
  }, [partUsageData]);

  return (
    <Grid>
      <Grid.Col span={6}>
        <Card radius="md" h="60vh">
          <Title order={5} c="dimmed">
            MPD - Aircraft wise Quantity
          </Title>
          <div ref={chartRef1} style={{ width: '100%', height: '400px' }} />
        </Card>
      </Grid.Col>
      <Grid.Col span={6}>
        <Card radius="md" h="60vh">
          <Title order={5} c="dimmed">
            Findings - Aircraft wise Quantity
          </Title>
          <div ref={chartRef2} style={{ width: '100%', height: '400px' }} />
        </Card>
      </Grid.Col>
    </Grid>
  );
};

export default AircraftPieCharts;
