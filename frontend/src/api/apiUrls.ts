// export const baseUrl = "https://fleet-data-gmr.evrides.in/api/";

// export const baseUrl = "https://backend.mrodemo.evrides.live/api/v1"; // Local URL for testing
// export const baseUrl = "http://10.100.3.13:8000/api/v1"; // Dev URL
export const baseUrl = "https://10.100.12.82/api/v1";    // Production URL

export const getUserLogin_Url = baseUrl + "/auth/login";
export const getValidateTasks_Url = "/validate";
export const getEstimateReport_Url = "/estimates/";
export const getPartUsage_Url = "/parts/usage";
export const getMultiPartUsage_Url = "multiple/parts/usage";
export const getSkillReq_Url = "/skills/analysis";
export const uploadEstimate_Url = "/upload-estimate";
export const getEstimateStatus_Url = "/estimate_file_status";
export const getHistoryEstimateStatus_Url = "/historical_estimate_file_status";
export const getConfigurations_Url = "/configurations";
export const getProbabilityWise_Url = "/probability_wise_manhrs_sparecost/";
export const getChangepassword_Url = "/auth/change_password";
export const getOperatorsList_Url = "/operators_list";
export const getEstimateDetails_Url = "/file_upload_estimate/";
export const getFilteredTasks_Url = "/filtered_tasks/";
export const getModelTasksValidate_Url = "/model_tasks_validate";
export const getAllEstimatesSummary_Url = "/estimate_aggregates";

export const getValidatedTasksByID_Url ="/validate_tasks_by_estid/"