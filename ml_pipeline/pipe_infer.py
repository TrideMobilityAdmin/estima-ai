import os
import pandas as pd
import numpy as np
import joblib
import time
from pymongo import MongoClient
import json
from datetime import datetime
import sys
from model.ml_pipeline import defects_prediction

# Connect to MongoDB
client = MongoClient("mongodb://admin:admin123@10.100.3.13:27017/")
db = client["gmr-mro-staging-5y"]
input_collection = db["estimate_file_upload"]
output_collection = db["estima_output"]

def process_document(estID):
    if estID is None or estID == "":
        print("Invalid estID provided.")
        return
    
    # Fetch filtered data for the given estID
    query = {"estID": estID}
    docs = list(input_collection.find(query))
    
    # Ensure docs is not empty
    if not docs:
        print(f"No matching document found in input_collection for estID: {estID}")
        return
    
    # Directly assign the document if only one exists
    bson_data = docs[0]
    #print(bson_data)
    
    # Create a directory path
    folder_name = str(estID)
    filepath = f"/home/Data/python_infer/results/{folder_name}/"
    
    try:
        os.makedirs(filepath, exist_ok=True)
        print(f"Created directory: {filepath}")
    except Exception as e:
        print(f"Error creating directory: {e}")
        return
    
    try:
        # Extract data from bson_data
        # Extract data from bson_data
        task_numbers = bson_data.get("task", [])
        descriptions = bson_data.get("description", [])
        add_tasks = bson_data.get("additionalTasks", [])  # Changed default from {} to []
        customer_name = bson_data.get("operator", " ")
        customer_name_consideration = bson_data.get("operatorForModel", False)
        if isinstance(customer_name_consideration, str):
            customer_name_consideration = customer_name_consideration.capitalize()
        probability_threshold = bson_data.get("probability", 0)
        aircraft_model = bson_data.get("aircraftModel", " ")
        check_category = bson_data.get("typeOfCheck", " ")
        aircraft_age = bson_data.get("aircraftAge", 0)
        age_cap= bson_data.get("aircraftAgeThreshold", 3)
        delta_tasks=bson_data.get("considerDeltaUnAvTasks",False)
        cappingDetails = bson_data.get("cappingDetails", "capping details not found")
        
        # Convert to strings
        task_numbers = [str(task) for task in task_numbers]
        descriptions = [str(desc) for desc in descriptions]
        
        # Extract data from additional tasks
        add_task_numbers = [str(task["taskID"]) for task in add_tasks]
        add_descriptions = [str(task["taskDescription"]) for task in add_tasks]  
        if len(add_task_numbers)>1:
            task_numbers_combined = task_numbers + add_task_numbers[1:]  # Fixed: extend() modifies in-place and returns None
            descriptions_combined = descriptions + add_descriptions[1:]   # Fixed: use + operator instead
        else:
            task_numbers_combined = task_numbers
            descriptions_combined = descriptions
        
        # Create DataFrame for mpd_task_data
        mpd_task_data = pd.DataFrame({
            "TASK NUMBER": task_numbers_combined,
            "DESCRIPTION": descriptions_combined
        })
        
        print(f"Processed document with estID: {estID}")
        
        # Call defects_prediction function with correct parameters
        output_data = defects_prediction(estID,aircraft_model, check_category, aircraft_age, mpd_task_data,filepath,cappingDetails,age_cap,customer_name,customer_name_consideration,probability_threshold,delta_tasks)
        
        print("Output JSON is generated")
        sys.stdout.flush()
        
        # Insert output data into MongoDB
        output_collection.insert_one(output_data)
        print("Document inserted successfully.")
        
        # Update status to completed
        update_query = {"estID": estID}
        update_data = {"$set": {"status": "Completed", "filepath": filepath}}
        result = input_collection.update_one(update_query, update_data)
        print(f"Updated estID: {estID} to 'Completed'")
        
    except Exception as e:
        print(f"Error encountered in processing: {e}")
        
        # Update status to failed if there's an error
        update_query = {"estID": estID}
        update_data = {"$set": {"status": "Failed", "error": str(e)}}
        result = input_collection.update_one(update_query, update_data)
        print(f"Updated estID: {estID} to 'Failed'")
        
    sys.stdout.flush()

def run_pipeline():
    while True:
        try:
            print("Checking MongoDB for new documents...")
            
            # Find all documents where status = "Initiated"
            query = {"status": "Initiated"}
            cursor = input_collection.find(query)
            
            # Store estID values in a list
            estIDs = [doc["estID"] for doc in cursor]
            
            if estIDs:
                for estID in estIDs:
                    try:
                        print(f"Processing document with estID: {estID}")
                        sys.stdout.flush()
                        
                        # Update the status to "Progress"
                        update_query = {"estID": estID, "status": "Initiated"}
                        update_data = {"$set": {"status": "Progress"}}
                        result = input_collection.update_one(update_query, update_data)
                        
                        # Process the document
                        process_document(estID)
                        
                    except Exception as inner_e:
                        print(f"Error processing estID {estID}: {inner_e}")
                        sys.stdout.flush()
                        
                        # Update status to failed if there's an error
                        update_query = {"estID": estID}
                        update_data = {"$set": {"status": "Failed", "error": str(inner_e)}}
                        result = input_collection.update_one(update_query, update_data)
            else:
                print("No documents found with status 'Initiated'.")
                sys.stdout.flush()
                
        except Exception as e:
            print(f"Error in pipeline execution: {e}")
            sys.stdout.flush()
            
        print("Sleeping for 10 seconds before checking again...")
        sys.stdout.flush()
        time.sleep(10)

# Start pipeline
if __name__ == "__main__":
    run_pipeline()