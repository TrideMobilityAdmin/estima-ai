import React, { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { PieChart } from "echarts/charts";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { Center, Text } from "@mantine/core";

// Register ECharts components
echarts.use([TooltipComponent, LegendComponent, PieChart, CanvasRenderer, LabelLayout]);

interface SkillsDonutChartProps {
  task: {
    skills: { skill: string; manHours?: { avg: number } }[];
  };
}

const SkillsDonutChart: React.FC<SkillsDonutChartProps> = ({ task }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      const myChart = echarts.init(chartRef.current);

      const series = task?.skills
        ?.map((skill) => skill?.manHours?.avg)
        ?.filter((val) => typeof val === "number" && !isNaN(val)) || [];

      const labels = task?.skills?.map((skill) => skill?.skill || "Unknown Skill") || [];

      const option = {
        tooltip: {
          trigger: "item",
          formatter: "{b}: {c} hrs ({d}%)",
        },
        legend: {
          bottom: "5%",
          left: "center",
        },
        series: [
          {
            name: "Skill Distribution",
            type: "pie",
            radius: ["40%", "70%"],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: "#fff",
              borderWidth: 2,
            },
            label: {
              show: false,
              position: "center",
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 16,
                fontWeight: "bold",
              },
            },
            labelLine: {
              show: false,
            },
            data: labels.map((label, index) => ({
              value: series[index],
              name: label,
            })),
          },
        ],
      };

      myChart.setOption(option);
    }
  }, [task]);

  return (
    <Center mb="lg">
      <div style={{ width: 300, height: 300 }}>
        {task?.skills?.length ? (
          <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        ) : (
          <Text>No data available</Text>
        )}
      </div>
    </Center>
  );
};

export default SkillsDonutChart;
