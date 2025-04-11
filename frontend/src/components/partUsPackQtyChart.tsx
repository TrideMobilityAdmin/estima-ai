import React, { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import {
  TooltipComponent,
  GridComponent,
  LegendComponent
} from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { Card, Center, Title, Text } from "@mantine/core";

// Register required ECharts components
echarts.use([
  TooltipComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer
]);

interface MixedChartProps {
  title: string;
  data: any[];
  dataKey1: string; // X-axis key (e.g., taskId)
}

const MixedChartComponent: React.FC<MixedChartProps> = ({ title, data, dataKey1 }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      const myChart = echarts.init(chartRef.current);
      const colors = ["#5470C6", "#EE6666"];

      const option = {
        color: colors,
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "cross" }
        },
        legend: {
          top: "5%"
        },
        grid: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 20
        },
        xAxis: {
          type: "category",
          axisTick: { show: false }, // Hide tick marks
          axisLine: { show: false }, // Hide axis line
          axisLabel: { show: false }, // Hide labels
          // axisLabel: { rotate: -45, interval: 0 }, // Rotate labels for better fit
          data: data.map((item) => item[dataKey1])
        },
        yAxis: {
          type: "value"
        },
        series: [
          {
            name: "Packages",
            type: "line",
            smooth: true,
            data: data.map((item) => item.packages)
          },
          {
            name: "Quantity",
            type: "line",
            smooth: true,
            data: data.map((item) => item.quantity)
          }
        ]
      };

      myChart.setOption(option);
      myChart.resize();
    }
  }, [data, dataKey1]);

  return (
    <Card radius="md" h="400px">
      <Title order={5} c="dimmed" ta="left">
        {title}
      </Title>

      {data.length > 0 ? (
        <div style={{ overflowX: "auto", overflowY: "hidden", width: "100%" }}>
          <div style={{ width: `${Math.max(data.length * 80, 600)}px`, minWidth: "600px" }}>
            <div ref={chartRef} style={{ width: "100%", height: "350px" }} />
          </div>
        </div>
      ) : (
        <Center h="300px">
          <Text c="dimmed">No data found</Text>
        </Center>
      )}
    </Card>
  );
};

export default MixedChartComponent;
