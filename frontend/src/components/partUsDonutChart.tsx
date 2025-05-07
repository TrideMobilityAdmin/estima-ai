import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { PieChart } from "echarts/charts";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { Card, Text, Center } from "@mantine/core";

// Register required ECharts components
echarts.use([TooltipComponent, LegendComponent, PieChart, CanvasRenderer, LabelLayout]);

const DonutChartComponent = ({ partUsageData }: { partUsageData: any }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [donutData, setDonutData] = useState<{ name: string; value: number }[]>([]);
  const [hasData, setHasData] = useState(false);

  // Process data for the donut chart
  const processDonutData = (data: any) => {
    const totalTasks = data?.usage?.tasks?.reduce(
      (acc: number, task: any) => acc + task?.packages?.reduce((sum: number, pkg: any) => sum + pkg?.quantity, 0),
      0
    ) || 0;

    const totalFindings = data?.usage?.findings?.hmvTasks?.reduce(
      (acc: number, finding: any) => acc + finding?.packages?.reduce((sum: number, pkg: any) => sum + pkg?.quantity, 0),
      0
    ) || 0;

    const total = totalTasks + totalFindings;
    if (total > 0) {
      // Calculate percentages for each section
      const tasksPercentage = (totalTasks / total) * 100;
      const findingsPercentage = (totalFindings / total) * 100;
      
      // Filter out sections with 0 values and only include sections above 0.6
      const filteredData = [];
      
      if (tasksPercentage > 0.6) {
        filteredData.push({ name: "Tasks", value: tasksPercentage });
      }
      
      if (findingsPercentage > 0.6) {
        filteredData.push({ name: "Findings", value: findingsPercentage });
      }
      
      if (filteredData.length > 0) {
        setHasData(true);
        setDonutData(filteredData);
      } else {
        setHasData(false);
        setDonutData([]);
      }
    } else {
      setHasData(false);
      setDonutData([]);
    }
  };

  // Initialize and update the Donut chart
  const initDonutChart = () => {
    if (chartRef.current && hasData) {
      const myChart = echarts.init(chartRef.current);
      const option = {
        tooltip: { 
          trigger: "item", 
          formatter: "{b}: {c}%" 
        },
        legend: { 
          bottom: "5%", 
          left: "center" 
        },
        series: [
          {
            name: "Distribution Analysis",
            type: "pie",
            radius: ["40%", "70%"],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 5,
              borderColor: "#fff",
              borderWidth: 2,
            },
            label: {
              show: true,
              position: "inside",
              fontSize: 12,
              fontWeight: "bold",
              color: "#050505",
              formatter: "{c}%",
            },
            labelLine: { show: false },
            data: donutData.map((item) => ({
              name: item.name,
              value: Math.round(item.value),
            })),
          },
        ],
      };
      myChart.setOption(option);
      
      // Handle chart resize when window size changes
      window.addEventListener('resize', () => {
        myChart.resize();
      });
      
      return () => {
        window.removeEventListener('resize', () => {
          myChart.resize();
        });
        myChart.dispose();
      };
    }
  };

  // Update chart when data changes
  useEffect(() => {
    if (partUsageData) {
      processDonutData(partUsageData);
    }
  }, [partUsageData]);

  useEffect(() => {
    const chartInstance = initDonutChart();
    
    return () => {
      if (chartInstance) {
        chartInstance();
      }
    };
  }, [donutData]);

  return (
    <Card radius="md" h="50vh">
      {hasData ? (
        <div ref={chartRef} style={{ width: "100%", height: "300px" }} />
      ) : (
        <Center h="100%">
          <Text c="dimmed">No Data Found</Text>
        </Center>
      )}
    </Card>
  );
};

export default DonutChartComponent;