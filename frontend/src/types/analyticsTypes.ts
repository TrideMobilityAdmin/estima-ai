import { gql } from "urql";

export const GetTaskList = gql`
  query GetTaskList {
    GetTaskList {
      _id
      SourceTask
    }
  }
`;

export const GetGroupsByTask = gql`
  query GetGroupsByTask($sourceTask: String!) {
    GetGroupsByTask(sourceTask: $sourceTask) {
      _id
      Package
      LogItem
      Description
      CorrectiveAction
      DescCorr
      SourceTaskDiscrep
      SourceTask
      Group
      TaskProb
      GroupProbOverall
      GroupProb
      MHGMin
      MHGMax
      MHGEst
      MHTMin
      MHTMax
      MHTEst
      SparesCostGroupMin
      SparesCostGroupMax
      SparesCostGroupEst
      SparesCostTaskMin
      SparesCostTaskMax
      SparesCostTaskEst
      SpareQty {
        SourceTask
        Group
        IssuedPart
        PartDescription
        Unit
        MovAvgQtyRounded
        Check
      Probability
      MoVAvgPrice
      }
    }
  }
`;
export const GetSpareDetailsByTask = gql`
  query GetSpareDetailsByTask($sourceTask: String!) {
    GetSpareDetailsByTask(sourceTask: $sourceTask) {
      _id
      Package
      LogItem
      Description
      CorrectiveAction
      DescCorr
      SourceTaskDiscrep
      SourceTask

      Group
      TaskProb
      GroupProbOverall
      GroupProb
      MHGMin
      MHGMax
      MHGEst
      MHTMin
      MHTMax
      MHTEst
      SparesCostGroupMin
      SparesCostGroupMax
      SparesCostGroupEst
      SparesCostTaskMin
      SparesCostTaskMax
      SparesCostTaskEst
      SpareQty {
        SourceTask
        Group
        IssuedPart
        PartDescription
        Unit
        MovAvgQtyRounded
        Check
      Probability
      MoVAvgPrice
      }
    }
  }
`;
