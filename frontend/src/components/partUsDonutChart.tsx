import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { PieChart } from "echarts/charts";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { Card, Grid, Title, Center } from "@mantine/core";

// Register required ECharts components
echarts.use([TooltipComponent, LegendComponent, PieChart, CanvasRenderer, LabelLayout]);

const DonutChartComponent = ({ partUsageData }: { partUsageData: any }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [donutData, setDonutData] = useState<{ name: string; value: number }[]>([]);

  // Process data for the donut chart
  const processDonutData = (data: any) => {
    const totalTasks = data?.usage?.tasks?.reduce(
      (acc: number, task: any) => acc + task?.packages?.reduce((sum: number, pkg: any) => sum + pkg?.quantity, 0),
      0
    );

    const totalFindings = data?.usage?.findings?.hmvTasks?.reduce(
      (acc: number, finding: any) => acc + finding?.packages?.reduce((sum: number, pkg: any) => sum + pkg?.quantity, 0),
      0
    );

    const total = totalTasks + totalFindings;
    const tasksPercentage = total > 0 ? (totalTasks / total) * 100 : 0;
    const findingsPercentage = total > 0 ? (totalFindings / total) * 100 : 0;

    setDonutData([
      { name: "Tasks", value: tasksPercentage },
      { name: "Findings", value: findingsPercentage },
    ]);
  };

  // Initialize and update the Donut chart
  const initDonutChart = () => {
    if (chartRef.current) {
      const myChart = echarts.init(chartRef.current);
      const option = {
        tooltip: { trigger: "item" },
        legend: { bottom: "5%", left: "center" },
        series: [
          {
            name: "Distribution Analysis",
            type: "pie",
            radius: ["40%", "70%"], // Inner and outer radius for the donut effect
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 5,
              borderColor: "#fff",
              borderWidth: 2,
            },
            label: { show: true, formatter: "{b}: {c}%" },
            labelLine: { show: true },
            data: donutData.map((item) => ({
              name: item.name,
              value: item.value.toFixed(2), // Ensure percentage formatting
            })),
          },
        ],
      };
      myChart.setOption(option);
    }
  };

  // Update chart when data changes
  useEffect(() => {
    if (partUsageData) {
      processDonutData(partUsageData);
    }
  }, [partUsageData]);

  useEffect(() => {
    if (donutData.length > 0) {
      initDonutChart();
    }
  }, [donutData]);

  return (
      <Card radius="md" h="50vh">
        {/* <Title order={5} c="dimmed">
          Distribution Analysis (%)
        </Title> */}
        {/* <Center> */}
          <div ref={chartRef} style={{ width: "100%", height: "300px" }} />
        {/* </Center> */}
      </Card>
  );
};

export default DonutChartComponent;
