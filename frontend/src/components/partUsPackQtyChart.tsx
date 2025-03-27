import React, { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { TooltipComponent, LegendComponent, GridComponent } from "echarts/components";
import { BarChart, LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { Card, Title } from "@mantine/core";

// Register ECharts components
echarts.use([TooltipComponent, LegendComponent, GridComponent, BarChart, LineChart, CanvasRenderer]);

interface MixedChartProps {
  title: string;
  data: any[];
  dataKey: string; // The key for the x-axis (taskId or findingId)
}

const MixedChartComponent: React.FC<MixedChartProps> = ({ title, data, dataKey }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      const myChart = echarts.init(chartRef.current);
      const option = {
        tooltip: { trigger: "axis" },
        legend: { top: "5%", left: "center" },
        xAxis: {
          type: "category",
          data: data.map((item) => item[dataKey]), // X-axis values (Task IDs or Finding IDs)
          axisLabel: { rotate: -45, textStyle: { fontSize: 12 } },
        },
        yAxis: { type: "value" },
        series: [
          {
            name: "Packages",
            type: "line",
            data: data.map((item) => item.packages),
            itemStyle: { color: "#1445B6" },
            barWidth: 40,
          },
          {
            name: "Quantity",
            type: "bar",
            data: data.map((item) => item.quantity),
            itemStyle: { color: "#D6B575" },
            lineStyle: { width: 2 },
            symbolSize: 8,
          },
        ],
      };
      myChart.setOption(option);
    }
  }, [data]);

  return (
    <Card radius="md" h="400px">
      <Title order={5} c="dimmed" ta="left">
        {title}
      </Title>
      <div ref={chartRef} style={{ width: "100%", height: "350px" }} />
    </Card>
  );
};

export default MixedChartComponent;
