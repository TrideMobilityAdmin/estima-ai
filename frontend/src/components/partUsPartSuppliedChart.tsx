import React, { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { TooltipComponent, LegendComponent, LegendScrollComponent } from "echarts/components";
import { PieChart } from "echarts/charts";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { Card, Title, Center, Text } from "@mantine/core";
import airlines from '../assets/airlineColors.json';
// Register ECharts components
echarts.use([
  TooltipComponent,
  LegendComponent,
  LegendScrollComponent,
  PieChart,
  CanvasRenderer,
  LabelLayout
]);

interface DonutChartProps {
  title: string;
  partUsageData: any;
  type: "MPD" | "Findings"; // To differentiate between MPD and Findings
}

// Airline color mapping function
const getAirlineColor = (statusCode: string): string => {
  // Convert status code to lowercase for case-insensitive comparison
  const statusLower = statusCode.toLowerCase();

  // First try exact match (original behavior)
  const exactMatch = airlines.find(airline => airline.name.toLowerCase() === statusLower);
  if (exactMatch) {
    return exactMatch.primaryColor;
  }

  // Then try partial matches (new behavior)
  // Check if status code contains airline name
  const containsAirlineName = airlines.find(airline =>
    statusLower.includes(airline.name.toLowerCase())
  );
  if (containsAirlineName) {
    return containsAirlineName.primaryColor;
  }

  // Check if airline name contains status code
  const airlineNameContainsStatus = airlines.find(airline =>
    airline.name.toLowerCase().includes(statusLower)
  );
  if (airlineNameContainsStatus) {
    return airlineNameContainsStatus.primaryColor;
  }

  // If still no match found, try to match key words
  const keyWords = statusLower.split(/[\s-]+/); // Split by spaces or hyphens
  for (const word of keyWords) {
    if (word.length < 3) continue; // Skip very short words

    const keywordMatch = airlines.find(airline =>
      airline.name.toLowerCase().includes(word)
    );
    if (keywordMatch) {
      return keywordMatch.primaryColor;
    }
  }

  // Default color if no match found
  return "rgba(196, 147, 0, 1)";
};

const DonutChartComponentPartSupplied: React.FC<DonutChartProps> = ({
  title,
  partUsageData,
  type
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  // Determine which dataset to use (MPD or Findings)
  const stockStatuses = type === "MPD"
    ? partUsageData?.aircraftDetails?.task_parts_aircraft_details?.stockStatuses
    : partUsageData?.aircraftDetails?.sub_task_parts_aircraft_details?.stockStatuses;

  // Process data
  const chartData = stockStatuses?.map((status: any) => ({
    name: status.statusCode,
    value: status.count,
    itemStyle: {
      color: getAirlineColor(status.statusCode) // Assign color dynamically
    }
  })) || [];

  useEffect(() => {
    if (chartRef.current && chartData.length > 0) {
      const myChart = echarts.init(chartRef.current);

      // Handle window resize
      const handleResize = () => {
        myChart.resize();
      };
      window.addEventListener('resize', handleResize);

      const option = {
        tooltip: {
          trigger: "item",
          formatter: "{a} <br/>{b}: {c} ({d}%)"
        },
        legend: {
          type: 'scroll',          // Enable scrolling for legend
          orient: 'vertical',      // Vertical orientation
          right: 10,               // Position on right
          top: 20,                 // Top position
          bottom: 10,              // Bottom position to ensure proper height calculation
          formatter: '{name}',     // Format legend names
          textStyle: {
            fontSize: 12,          // Smaller text for legends
            overflow: 'breakAll'   // Break text to avoid overflow
          },
          pageTextStyle: {         // Style for paging text
            color: '#333'
          }
        },
        series: [
          {
            name: title,
            type: "pie",
            radius: ["40%", "70%"], // Donut shape
            center: ['40%', '50%'], // Move chart slightly to the left
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 5,
              borderColor: "#fff",
              borderWidth: 2
            },
            label: {
              show: true,
              position: 'inside',
              formatter: "{c}"
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '14',
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: true
            },
            data: chartData
          }
        ]
      };

      myChart.setOption(option);

      // Clean up
      return () => {
        window.removeEventListener('resize', handleResize);
        myChart.dispose();
      };
    }
  }, [chartData, title]);

  return (
    <Card radius="md" h="60vh">
      <Title order={5} c="dimmed" ta="left">
        {title}
      </Title>
      {chartData.length > 0 ? (
        <div ref={chartRef} style={{ width: "100%", height: "300px" }} />
      ) : (
        <Center h="300px">
          <Text c="dimmed">No data found</Text>
        </Center>
      )}
    </Card>
  );
};

export default DonutChartComponentPartSupplied;