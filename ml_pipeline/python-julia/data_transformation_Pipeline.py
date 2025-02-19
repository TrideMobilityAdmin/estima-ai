import pymongo
from pymongo import MongoClient
import json
import ast
from bson import ObjectId
from datetime import datetime
import math
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
import time

class MongoDBConnection:
    """MongoDB connection manager"""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.client = None
        
    def __enter__(self):
        self.client = MongoClient(self.connection_string)
        return self.client
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            self.client.close()

class DataProcessor:
    """Handles data processing and transformation operations"""
    
    @staticmethod
    def safe_eval(exp_cons_value: Any) -> List[float]:
        """Convert string/array/number representation to list or number."""
        if isinstance(exp_cons_value, str):
            try:
                return float(exp_cons_value)
            except ValueError:
                pass
            
            try:
                safe_value = exp_cons_value.replace('inf', '"inf"').replace('nan', '"nan"')
                return ast.literal_eval(safe_value)
            except (ValueError, SyntaxError):
                pass
            
            try:
                numbers_str = exp_cons_value.strip('[]').replace(' ', '').split(',')
                return [float(num) for num in numbers_str if num]
            except ValueError:
                pass
            
        elif isinstance(exp_cons_value, (int, float, list)):
            return exp_cons_value
            
        elif isinstance(exp_cons_value, (np.ndarray, pd.Series)):
            try:
                return exp_cons_value.tolist()
            except Exception as e:
                print(f"Error converting NumPy/Pandas: {e}")
                return []
        
        print(f"safe_eval failed for unknown type: {type(exp_cons_value)}")
        return []

class EstimateProcessor:
    """Main processor for maintenance estimates"""
    
    def __init__(self, mongo_connection: str, base_path: str):
        self.mongo_connection = mongo_connection
        self.base_path = base_path
        
    def process_parts(self, exp_cons: List[float], parts_data: pd.DataFrame) -> List[Dict]:
        """Process spare parts data and return top 5 parts."""
        if not isinstance(exp_cons, list) or not exp_cons:
            return []
            
        sorted_indices = sorted(
            range(len(exp_cons)),
            key=lambda i: exp_cons[i] if not math.isinf(exp_cons[i]) else -1,
            reverse=True
        )[:5]
        
        spare_parts = []
        for idx in sorted_indices:
            if 0 <= idx < len(parts_data) and exp_cons[idx] > 0:
                part_info = parts_data.iloc[idx]
                spare_parts.append({
                    "partId": part_info["issued-part-#"],
                    "desc": part_info["part-description"],
                    "qty": exp_cons[idx],
                    "unit": part_info["issued-uom"],
                    "price": float(part_info["base-price-usd"])
                })
        
        return spare_parts

    def process_tasks(self, source_tasks: pd.DataFrame, parts_data: pd.DataFrame) -> List[Dict]:
        """Process tasks data and return structured task information."""
        tasks = []
        for _, row in source_tasks.iterrows():
            exp_cons = DataProcessor.safe_eval(row["exp_cons"])
            task = {
                "sourceTask": row["task"],
                "cluster_id":row["cluster"],
                "description": row["description"],
                "cluster": int(row["cluster"]),
                "mhs": {
                    "max": float(row["max_mh"]),
                    "min": float(row["min_mh"]),
                    "avg": float(row["avg_mh"]),
                    "est": float(row["est_mh"])
                },
                "exp_cons": exp_cons,
                "spareParts": self.process_parts(exp_cons, parts_data)
            }
            tasks.append(task)
        return tasks

    def process_findings(self, disc_vectors: pd.DataFrame, parts_data: pd.DataFrame, pkg_id: str) -> List[Dict]:
        """Process findings data and return structured finding information."""
        findings = []
        for _, row in disc_vectors.iterrows():
            exp_cons = DataProcessor.safe_eval(row["exp_cons"])
            finding = {
                "taskId": str(row["stc_id"]) if pd.notna(row["stc_id"]) else "",
                "details": [{
                    "logItem": f"{pkg_id}/{row['cluster_id']}",
                    "description": "Discrepancy found",
                    "mhs": {
                        "max": float(row["max_mh"]),
                        "min": float(row["min_mh"]),
                        "avg": float(row["avg_mh"]),
                        "est": float(row["est_mh"])
                    },
                    "prob": float(row["prob"]),
                    "exp_cons": exp_cons,
                    "spareParts": self.process_parts(exp_cons, parts_data)
                }]
            }
            findings.append(finding)
        return findings

    def calculate_total_cost(self, items: List[Dict], is_task: bool = True) -> float:
        """Calculate total parts cost for tasks or findings."""
        if is_task:
            return sum(part["price"] for item in items for part in item["spareParts"])
        return sum(part["price"] for item in items for detail in item["details"] for part in detail["spareParts"])

    def store_output(self, output_data: Dict, pkg_id: str) -> None:
        """Store processed data in MongoDB."""
        with MongoDBConnection(self.mongo_connection) as client:
            db = client["gmr-mro"]
            collection = db["estima_output"]
            
            # Remove exp_cons from output
            for task in output_data["tasks"]:
                task.pop("exp_cons", None)
            for finding in output_data["findings"]:
                for detail in finding["details"]:
                    detail.pop("exp_cons", None)
            
            # Add metadata
            output_data.update({
                "userID": ObjectId(),
                "createdAt": datetime.now(),
                "lastUpdated": datetime.now(),
                "createdBy": "estimaai@evrides.live",
                "updatedBy": ObjectId(),
                
            })
            
            collection.insert_one(output_data)
            print(f"Successfully stored data for package {pkg_id} in MongoDB")

    def process_document(self, est_id: str, filepath: str, filename:str) -> None:
        """Process a single estimate document."""
        # Read input files
        source_tasks = pd.read_csv(filepath + "source_tasks_output.csv")
        final_vectors = pd.read_csv(filepath + "fin_vec_output.csv")
        disc_vectors = pd.read_csv(filepath + "disc_vec_output.csv")
        parts_data = pd.read_csv(f"{self.base_path}/parts.csv")
        pkg_input = pd.read_csv(f"{self.base_path}/pkg_input.csv")
        
        pkg_id = filename
        
        # Process data
        tasks = self.process_tasks(source_tasks, parts_data)
        findings = self.process_findings(disc_vectors, parts_data, pkg_id)
        
        # Calculate totals
        total_parts_cost_tasks = self.calculate_total_cost(tasks)
        total_parts_cost_findings = self.calculate_total_cost(findings, False)
        
        # Prepare output
        output_data = {
            "estID": est_id,
            "description": f"Estimate for package {pkg_id}",
            "tasks": tasks,
            "aggregatedTasks": {
                "totalMhs": float(final_vectors[final_vectors["task_cat"] == "total"]["est_mh"].iloc[0]),
                "totalPartsCost": total_parts_cost_tasks
            },
            "findings": findings,
            "aggregatedFindings": {
                "totalMhs": float(final_vectors[final_vectors["task_cat"] == "discrepancies"]["est_mh"].iloc[0]),
                "totalPartsCost": total_parts_cost_findings
            },
            "originalFilename": filename
        }
        
        self.store_output(output_data, filename)
        print(f"Successfully processed package {pkg_id} with EST ID: {est_id}")

class Pipeline:
    """Main pipeline class for processing maintenance estimates"""
    
    def __init__(self, connection_string: str, base_path: str):
        self.connection_string = connection_string
        self.processor = EstimateProcessor(connection_string, base_path)
        
    def run(self):
        """Run the continuous processing pipeline."""
        try:
            while True:
                print("Checking MongoDB for new documents...")
                
                with MongoDBConnection(self.connection_string) as client:
                    db = client["gmr-mro"]
                    input_collection = db["estimate_file_upload"]
                    
                    # Find documents with "Csv Generated" status
                    cursor = input_collection.find({"status": "Csv Generated"})
                    est_ids = [doc["estID"] for doc in cursor]
                    
                    if est_ids:
                        print(f"Processing document with estID: {est_ids[0]}")
                        # Get filepath from status collection
                        doc = input_collection.find_one({"estID": est_ids[0]})
                        self.processor.process_document(est_ids[0], doc["filepath"],doc["original_filename"])
                        
                        # Update status
                        input_collection.update_one(
                            {"estID": est_ids[0], "status": "Csv Generated"},
                            {"$set": {"status": "completed"}}
                        )
                    else:
                        print("No documents found with status Csv Generated")
                
                print("Sleeping for 10 seconds before checking again...")
                time.sleep(10)
                
        except Exception as e:
            print(f"Pipeline terminated: {e}")

def main():
    """Main entry point for the application."""
    connection_string = "mongodb://admin:Tride%401234@telematics-mongo1.evrides.in:22022,telematics-mongo2.evrides.in:22022/?authSource=admin&replicaSet=trideRepl&readPreference=secondaryPreferred"
    base_path = "/home/Data/v0Files/v0_trainings_1"
    
    pipeline = Pipeline(connection_string, base_path)
    pipeline.run()

if __name__ == "__main__":
    main()