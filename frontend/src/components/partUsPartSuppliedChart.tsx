import React, { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { PieChart } from "echarts/charts";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { Card, Title } from "@mantine/core";

// Register ECharts components
echarts.use([TooltipComponent, LegendComponent, PieChart, CanvasRenderer, LabelLayout]);

interface DonutChartProps {
  title: string;
  partUsageData: any;
  type: "MPD" | "Findings"; // To differentiate between MPD and Findings
}

// Airline color mapping function
const getAirlineColor = (statusCode: string) => {
  const airlines = [
    { name: "FLY DUBAI", primaryColor: "#006496" },
    { name: "FLYNAS", primaryColor: "#00B7AC" },
    { name: "Indigo EOL", primaryColor: "#001B94" },
    { name: "SpiceJet", primaryColor: "#ed1b23" },
    { name: "OMAN AIR", primaryColor: "#006B65" },
    { name: "INDIGO", primaryColor: "#001B94" },
    { name: "US BANGLA", primaryColor: "#012169" },
    { name: "OWNED", primaryColor: "#05154f" },
  ];

  const airline = airlines.find((airline) => airline.name.toLowerCase() === statusCode.toLowerCase());
  return airline ? airline.primaryColor : "rgba(196, 147, 0, 1)";
};

const DonutChartComponentPartSupplied: React.FC<DonutChartProps> = ({ title, partUsageData, type }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  // Determine which dataset to use (MPD or Findings)
  const stockStatuses =
    type === "MPD"
      ? partUsageData?.aircraftDetails?.task_parts_aircraft_details?.stockStatuses
      : partUsageData?.aircraftDetails?.sub_task_parts_aircraft_details?.stockStatuses;

  // Process data
  const chartData =
    stockStatuses?.map((status: any) => ({
      name: status.statusCode,
      value: status.count,
      itemStyle: { color: getAirlineColor(status.statusCode) }, // Assign color dynamically
    })) || [];

  useEffect(() => {
    if (chartRef.current) {
      const myChart = echarts.init(chartRef.current);
      const option = {
        tooltip: { trigger: "item" },
        // legend: { bottom: "0%", left: "center" },
        legend: {
            orient: 'vertical',
            left: 'right',
          },
        series: [
          {
            name: title,
            type: "pie",
            radius: ["40%", "70%"], // Donut shape
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 5,
              borderColor: "#fff",
              borderWidth: 2,
            },
            label: { show: true, formatter: "{c}" },
            labelLine: { show: true },
            data: chartData,
          },
        ],
      };
      myChart.setOption(option);
    }
  }, [chartData]);

  return (
    <Card radius="md" h="60vh">
      <Title order={5} c="dimmed" ta="left">
        {title}
      </Title>
      <div ref={chartRef} style={{ width: "100%", height: "300px" }} />
    </Card>
  );
};

export default DonutChartComponentPartSupplied;
