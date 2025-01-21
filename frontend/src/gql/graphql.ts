/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type GroupList = {
  __typename?: 'GroupList';
  Group: Array<Scalars['Float']['output']>;
};

export type Query = {
  __typename?: 'Query';
  GetGroupList: GroupList;
  GetGroupsByTask: Array<SpareCosting>;
  GetSpareDetailsByGroup: Array<SpareCosting>;
  GetSpareDetailsByTask: Array<SpareCosting>;
  GetTaskList: TaskList;
};


export type QueryGetGroupsByTaskArgs = {
  sourceTask: Scalars['String']['input'];
};


export type QueryGetSpareDetailsByGroupArgs = {
  group: Scalars['String']['input'];
};


export type QueryGetSpareDetailsByTaskArgs = {
  sourceTask: Scalars['String']['input'];
};

export type Session = {
  __typename?: 'Session';
  loginTime: Scalars['String']['output'];
  requestID: Scalars['String']['output'];
  userID: Scalars['String']['output'];
};

export type SpareCosting = {
  __typename?: 'SpareCosting';
  CorrectiveAction: Scalars['String']['output'];
  DescCorr: Scalars['String']['output'];
  Description: Scalars['String']['output'];
  Group: Scalars['Float']['output'];
  GroupProb: Scalars['String']['output'];
  GroupProbOverall: Scalars['String']['output'];
  LogItem: Scalars['String']['output'];
  MHGEst: Scalars['Float']['output'];
  MHGMax: Scalars['String']['output'];
  MHGMin: Scalars['String']['output'];
  MHTEst: Scalars['Float']['output'];
  MHTMax: Scalars['Float']['output'];
  MHTMin: Scalars['Float']['output'];
  Package: Scalars['String']['output'];
  SourceTask: Scalars['String']['output'];
  SourceTaskDiscrep: Scalars['String']['output'];
  SpareQty: Array<SpareQty>;
  SparesCostGroupEst: Scalars['Float']['output'];
  SparesCostGroupMax: Scalars['Float']['output'];
  SparesCostGroupMin: Scalars['Float']['output'];
  SparesCostTaskEst: Scalars['Float']['output'];
  SparesCostTaskMax: Scalars['Float']['output'];
  SparesCostTaskMin: Scalars['Float']['output'];
  TaskProb: Scalars['String']['output'];
  _id: Scalars['String']['output'];
};

export type SpareQty = {
  __typename?: 'SpareQty';
  Check: Scalars['String']['output'];
  Group: Scalars['Int']['output'];
  IssuedPart: Scalars['String']['output'];
  MoVAvgPrice: Scalars['Float']['output'];
  MovAvgQtyRounded: Scalars['Float']['output'];
  PartDescription: Scalars['String']['output'];
  Probability: Scalars['String']['output'];
  SourceTask: Scalars['String']['output'];
  Unit: Scalars['String']['output'];
};

export type TaskList = {
  __typename?: 'TaskList';
  SourceTask: Array<Scalars['String']['output']>;
  _id: Scalars['String']['output'];
};
