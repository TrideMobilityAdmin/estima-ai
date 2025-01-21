import { Box, Divider, Group, Select, Space } from "@mantine/core";
import TasksCard from "../components/tasksCardComponent";
import { MdLibraryBooks } from "react-icons/md";
import GroupsComponent from "../components/groupsComponent";
import { useEffect, useState } from "react";
import { GetTaskList } from "../types/analyticsTypes";
import { useQuery } from "urql";

export default function TasksGroup() {
  // const taskData = [
  //   "200002-01-1",
  //   "200003-01-1",
  //   "200127-07-1",
  //   "200151-01-1",
  //   "200145-01-1",
  //   "200211-02-1",
  //   "200315-01-1"
  // ];
  const [tasks, setTasks] = useState<any>();
  const [taskId, setTaskId] = useState<any>();

  const [AllTasksQuery] = useQuery({
    query: GetTaskList,
  });

  useEffect(() => {
    let isRefresh = true;
    if (isRefresh) {
      const { data } = AllTasksQuery;
      if (data?.GetTaskList) {
        setTasks(data?.GetTaskList?.SourceTask);
        setTaskId(data?.GetTaskList?.SourceTask[0]);
      }
    }
  }, [AllTasksQuery]);
  console.log("allTasks >>>> ", tasks);
  console.log("taskId >>>>", taskId);

  // const [groupsDataQuery] = useQuery<Query>({
  //   query: GetGroupsByTask,
  //   variables: {
  //     sourceTask: taskId,
  //   },
  // });

  // const [groupsData, setGroupsData] = useState<SpareCosting[]>([]);

  // useEffect(() => {
  //   let isRefresh = true;
  //   const {data, fetching, error} = groupsDataQuery;
  //   if(data?.GetGroupsByTask?.length){
  //     setGroupsData(data?.GetGroupsByTask);
  //   }
  // },[groupsDataQuery, taskId]);

  // console.log("groups data by task >>>>",groupsData);
  return (
    <>
      <div style={{paddingLeft:15,paddingRight:15, paddingTop:75}}>
      <Group justify="space-betweenflex-start">
        <Select
        searchable
        w={400}
            label="Source Task"
            c={"grey"}
            placeholder="Select Task"
            data={tasks}
            defaultValue={taskId}
            value={taskId}
            onChange={(val) => {
              if (val) {
                setTaskId(val);
              }
            }}
            leftSection={<MdLibraryBooks color="grey" />}
          />
        </Group>
        <Space h={15} />
        <TasksCard taskID={taskId} />
        <Divider
          my="lg"
          variant="dashed"
          labelPosition="center"
          color={"gray"}
          label={
            <>
              <Box ml={5}>Groups</Box>
            </>
          }
        />
     
      <GroupsComponent taskID={taskId}/>
      </div>
    </>
  );
}
