# Imports
import pandas as pd
import numpy as np
import string
import nltk
import spacy
import dask.dataframe as dd
import networkx as nx
import asyncio
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import inflect
from typing import List, Dict, Set
import json
from pymongo import MongoClient

import gc
import string
import datetime
from dask import delayed
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.stem import WordNetLemmatizer
from collections import Counter
from typing import List, Tuple


# Initialize necessary components
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')
nlp = spacy.load("en_core_web_sm")
le = LabelEncoder()
q = inflect.engine()
vectorizer = TfidfVectorizer()

def preprocess_text(text: str, preserve_symbols=[], words_to_remove=['DURING', 'INSPECTION', 'OBSERVED']) -> str:
    '''
    This function performs text preprocessing and returns processed text. 
    It will also accept a list of symbols to preserve.
    Input: text
    Output: text
    '''
    #Newly added code to address an NaN float error
    if isinstance(text, float) and np.isnan(text):  
        return ''  
    
    # Define symbols to preserve
    preserve_symbols = set(preserve_symbols)

    for word in words_to_remove:
        text = text.replace(word, ' ')
    
    # Remove punctuation, excluding specified symbols
    custom_translation = str.maketrans('', '', ''.join(set(string.punctuation) - preserve_symbols))
    text = text.translate(custom_translation)
    return text

def compute_tfidf(corpus: list, preserve_symbols=['-', '/']) -> list:
    # Ensure corpus is a list of strings
    corpus = [str(text) if isinstance(text, str) else "" for text in corpus]

    # Preprocess text
    preprocessed_corpus = [preprocess_text(text, preserve_symbols) for text in corpus]



    # Ensure corpus is not empty
    if all(text.strip() == "" for text in preprocessed_corpus):
        raise ValueError("All preprocessed texts are empty!")

    # TF-IDF Vectorization
    vectorizer = TfidfVectorizer(stop_words=None)
    embeddings = vectorizer.fit_transform(preprocessed_corpus)

    return embeddings.toarray()


def threshold_transform(data: np.ndarray, threshold: float = 0.5, above_value: int = 1, below_value: int = 0) -> np.ndarray:
    """Apply a threshold transformation to data."""
    return np.where(np.array(data) > threshold, above_value, below_value)


client = MongoClient("mongodb://admin:Tride%401234@telematics-mongo1.evrides.in:22022,telematics-mongo2.evrides.in:22022,telematics-mongo3.evrides.in:22022/?authSource=admin&replicaSet=trideRepl")
db = client["gmr-mro-test-5y"]


test_packages = []
# Fetch data from MongoDB collection
aircraft_details_collection = db["aircraft_details"]
aircraft_cursor = aircraft_details_collection.find({})
aircraft_details = pd.DataFrame(list(aircraft_cursor))

# Drop the MongoDB _id column if present
aircraft_details.drop(columns=["_id"], errors="ignore", inplace=True)

# Drop duplicate rows
aircraft_details.drop_duplicates(inplace=True)

# Filter out test packages
if "package_number" in aircraft_details.columns:
    aircraft_details = aircraft_details[~aircraft_details["package_number"].isin(test_packages)]
else:
    print("Warning: 'package_number' column not found in the DataFrame.")



#sub_task_description_collection="sub_task_description"
sub_task_description = db["sub_task_description_max500mh_lhrh"]
sub_task_description = list(sub_task_description.find({},))
sub_task_description = pd.DataFrame(sub_task_description)
# Drop the MongoDB _id column if not needed
sub_task_description = sub_task_description.drop(columns=["_id"], errors="ignore")
sub_task_description=sub_task_description.drop_duplicates()



sub_task_parts=db["sub_task_parts_lhrh"]
sub_task_parts = list(sub_task_parts.find({},))
sub_task_parts = pd.DataFrame(sub_task_parts)
# Drop the MongoDB _id column if not needed
sub_task_parts = sub_task_parts.drop(columns=["_id"], errors="ignore")
#sub_task_parts=sub_task_parts.drop_duplicates()

parts_master=db["parts_master"]
parts_master = list(parts_master.find({},))
parts_master= pd.DataFrame(parts_master)
parts_master = parts_master.drop(columns=["_id"], errors="ignore")
parts_master=parts_master.drop_duplicates()


task_parts_collection = db["task_parts_lhrh"]
task_parts  = list(task_parts_collection.find({}, {"package_number": 1, "task_number":1,"part_description":1,"issued_part_number":1,"used_quantity":1,"requested_stock_status":1}))
task_parts =  pd.DataFrame(task_parts)
task_parts.dropna(subset=["task_number","issued_part_number","part_description","used_quantity","requested_stock_status"],inplace=True)
task_parts_up=task_parts[task_parts["requested_stock_status"]!="Owned"]

task_parts_up = task_parts_up[task_parts_up["issued_part_number"].isin(parts_master["issued_part_number"])]

# Rename column "unit_of_measurement" to "issued_unit_of_measurement"
task_parts_up = task_parts_up.rename(columns={"unit_of_measurement": "issued_unit_of_measurement"})
# Get column names as lists
sub_task_parts_columns = sub_task_parts.columns.tolist()
task_parts_up_columns = task_parts_up.columns.tolist()

# Find common and missing columns
common_columns = list(set(sub_task_parts_columns) & set(task_parts_up_columns))  # Intersection
missing_columns = list(set(sub_task_parts_columns) - set(task_parts_up_columns))  # Difference

# Keep only common columns
task_parts_up = task_parts_up[common_columns]

# Add missing columns and fill them with NaN (equivalent to `missing` in Julia)
for col in missing_columns:
    task_parts_up[col] = np.nan  # Use None instead if dealing with strings

# Ensure column order matches `sub_task_parts`
task_parts_up = task_parts_up[sub_task_parts_columns]

for i, row in task_parts_up.iterrows():
    # Find matching part in parts_master
    matching_parts = parts_master[parts_master["issued_part_number"] == row["issued_part_number"]]
    
    if not matching_parts.empty:
        task_parts_up.at[i, "billable_value_usd"] = row["used_quantity"] * matching_parts.iloc[0]["agg_base_price_usd"]
        task_parts_up.at[i, "total_billable_price"]=matching_parts.iloc[0]["agg_base_price_usd"]
    
sub_task_parts = pd.concat([sub_task_parts, task_parts_up], ignore_index=True)
# Convert to string
string_cols = [
    'registration_number', 'package_number', 'task_number',
    'task_description', 'issued_part_number', 'part_description',
    'issued_unit_of_measurement', 'stock_status', 'base_currency',
    'soi_transaction'
]



# Apply conversions
for col in string_cols:
    sub_task_parts[col] = sub_task_parts[col].astype(str)
    
cols_to_convert = ['base_price_usd', 'freight_cost', 'admin_charges', 'total_billable_price', 'billable_value_usd', 'used_quantity']

for col in cols_to_convert:
    sub_task_parts[col] = pd.to_numeric(sub_task_parts[col], errors='coerce')



#sub_task_description_collection="sub_task_description"
task_description = db["task_description_max500mh_lhrh"]
task_description = list(task_description.find({},))
task_description = pd.DataFrame(task_description)
# Drop the MongoDB _id column if not needed
task_description = task_description.drop(columns=["_id"], errors="ignore")
task_description=task_description.drop_duplicates()
age_cap=3

LhRhTasks = db["RHLH_Tasks"]
LhRhTasks = list(LhRhTasks.find({},))
LhRhTasks = pd.DataFrame(LhRhTasks)

print(f"The shape of the aircraft collections {aircraft_details.shape }")
print(f"The shape of the sub task parts collections {sub_task_parts.shape }")
print(f"The shape of the sub task descriptions collections {sub_task_description.shape }")
print(f"The shape of the task descriptions collections {task_description.shape }")



def defects_prediction(estID,aircraft_model, check_category, aircraft_age, mpd_task_data,filepath,cappingDetails,age_cap=3):

    def updateLhRhTasks(LhRhTasks, MPD_TASKS):
        """
        Update MPD tasks by adding (LH) and (RH) suffixes for tasks marked as LHRH.
    
        Parameters:
        - LhRhTasks: DataFrame with 'LHRH' and 'TASK_CLEANED' columns
        - MPD_TASKS: DataFrame with 'TASK NUMBER' and 'DESCRIPTION' columns
    
        Returns:
        - Updated DataFrame with LH and RH tasks duplicated if LHRH == 1
        """
        # Get list of task numbers where LHRH is 1
        LhRhTasks_list = LhRhTasks[LhRhTasks["LHRH"] == 1]["TASK_CLEANED"].tolist()
        
        # List to collect rows
        data = []
    
        for _, row in MPD_TASKS.iterrows():
            task_number = str(row["TASK NUMBER"])
            description = row["DESCRIPTION"]
    
            if task_number in LhRhTasks_list:
                data.append({"TASK NUMBER": f"{task_number} (LH)", "DESCRIPTION": description})
                data.append({"TASK NUMBER": f"{task_number} (RH)", "DESCRIPTION": description})
            else:
                data.append({"TASK NUMBER": task_number, "DESCRIPTION": description})
        
        # Convert list of rows to DataFrame
        mpdLhRhTasks = pd.DataFrame(data)
        return mpdLhRhTasks

        
    mpd_task_data=updateLhRhTasks(LhRhTasks,mpd_task_data)

    print(f"type(aircraft_age): {type(aircraft_age)}, value: {aircraft_age}")
    # Convert aircraft_age to float
    aircraft_age = float(aircraft_age)
    aircraft_details['aircraft_age'] = aircraft_details['aircraft_age'].astype(float)
    aircraft_model_family = []
    
    A320_family = ["A319", "A320", "A321"]
    Boeing_NG = ["B737 NG", "B737-800(BCF)"]
    others = ["ATR42", "ATR72", "Q400", "B737 MAX"]
    
    if aircraft_model in A320_family:
        aircraft_model_family = A320_family
    elif aircraft_model in Boeing_NG:
        aircraft_model_family = Boeing_NG
    elif aircraft_model in others:
        aircraft_model_family = [aircraft_model]  # Corrected this line
    else:
        aircraft_model_family = aircraft_details['aircraft_model'].unique().tolist()


    print(f"type(age_cap): {type(age_cap)}, value: {age_cap}")
    print(f"type(aircraft_age): {type(aircraft_age)}, value: {aircraft_age}")
    print(f"The aircraft_model is {aircraft_model} and check_category is {check_category} and aircraft_age is {aircraft_age}")
    train_packages=[]
    if aircraft_age> 0.0:
        # Continue increasing age_cap until we get at least 5 packages or reach the maximum age limit
        while len(train_packages) < 5:  # Changed from >4 to <5 to keep looping until we have at least 5 packages
            train_packages = aircraft_details[
                (aircraft_details["aircraft_model"].isin(aircraft_model_family)) & 
                (aircraft_details["check_category"].isin(check_category)) & 
                (aircraft_details["aircraft_age"].between(max(aircraft_age - age_cap,0), min(aircraft_age + age_cap,31)))
            ]["package_number"].unique().tolist()
            
            # If we found at least 5 packages, we can exit the loop
            if len(train_packages) >= 5:
                break
            
            # Increase age_cap by 2
            age_cap += 1
            
            # Check if we've reached the maximum age limit
            if aircraft_age + age_cap > 30:
                break 
    else:
        train_packages = aircraft_details[
                (aircraft_details["aircraft_model"] .isin(aircraft_model_family)) & 
                (aircraft_details["check_category"].isin(check_category)) 
            ]["package_number"].unique().tolist()
        

    # At this point, train_packages contains either at least 5 packages or the maximum we could find
    print(f"Found {len(train_packages)} packages and the age is {aircraft_age} and   with age_cap of {age_cap}")
    
    print("Training packages are extracted")
    print("Processing the tasks")
    #no_of_task_packages=len(train_packages)
    
    # Filter task data based on packages and task numbers
    task_data =  task_description[task_description['package_number'].isin(train_packages)]
    task_description_unique_task_list = task_data["task_number"].unique().tolist()
    mpd_task_data = mpd_task_data[mpd_task_data["TASK NUMBER"].isin(task_description_unique_task_list)]
    # print(f"the shape of dataframe task data 1{task_data.shape}")
    task_data = task_data[task_data["task_number"].isin(mpd_task_data["TASK NUMBER"])]
    

    print(f"the shape of dataframe task data 2{task_data.shape}")
    # Filter sub parts data based on packages and task numbers
    sub_parts_data = sub_task_parts[sub_task_parts['package_number'].isin(train_packages)]
    no_of_task_packages=len(sub_parts_data["package_number"].unique().tolist())
    #print(f"the shape of dataframe sub parts data 1{sub_parts_data.shape}")
    sub_parts_data = sub_parts_data[sub_parts_data["task_number"].isin(mpd_task_data["TASK NUMBER"])]
 
    #print(f"the shape of dataframe sub parts data 2{sub_parts_data.shape}")
        
    def get_manhrs(task_number):
        filtered_data = task_data[task_data['task_number'] == task_number]
    
        if filtered_data.empty:
            return {
                'manhrs': {
                    'min': 0,
                    'max': 0,
                    'avg': 0,
                },
                'skill_set': [],
                'avg_est': 0
            }
    
        min_actual = filtered_data['actual_man_hours'].min()
        max_actual = filtered_data['actual_man_hours'].max()
        avg_actual = filtered_data['actual_man_hours'].mean()
        avg_estimated = filtered_data['estimated_man_hours'].mean()
        
        # Handle potential empty skill_number list
        skill_set = filtered_data['skill_number'].unique().tolist()
        
        result = {
            'manhrs': {
                'min': min_actual,
                'max': max_actual,
                'avg': avg_actual,
            },
            'skill_set': skill_set,
            'avg_est': avg_estimated
        }
    
        return result

    
    def get_sub_task_parts(mpd_task_data,no_of_task_packages):
        

        
        # Create an empty DataFrame to store all task parts
        all_task_parts_df = pd.DataFrame(columns=[
            "task_number", "issued_part_number", "part_description",
            "issued_unit_of_measurement", "used_quantity", "billable_value_usd"
        ])
        
        for index, row in mpd_task_data.iterrows():
            task_number = row['TASK NUMBER']
            filtered_data = sub_parts_data[sub_parts_data['task_number'] == task_number]
            

            
            if filtered_data.empty:
                continue
            
            
            # Group by issued_part_number
            grouped_data = filtered_data.groupby('issued_part_number', as_index=False).agg(
                avg_qty_used=('used_quantity', 'mean'),
                max_qty_used=('used_quantity', 'max'),
                min_qty_used=('used_quantity', 'min'),
                total_billable=('billable_value_usd', 'sum'),
                max_price=('total_billable_price','max'),
                total_quantity=('used_quantity', 'sum'),
                part_description=("part_description", 'first'),
                issued_unit_of_measurement=("issued_unit_of_measurement", 'first')
            )
            
            # Now calculate unit price afterward
            # Replace NaNs with 0 first
            grouped_data['total_quantity'] = grouped_data['total_quantity'].fillna(0)
            grouped_data["avg_qty_used"]= grouped_data['total_quantity']/no_of_task_packages
            grouped_data['total_billable'] = grouped_data['total_billable'].fillna(0)
            
            # Avoid division by zero
            grouped_data['avg_cost_per_unit'] = np.where(
                grouped_data['total_quantity'] != 0,
                grouped_data['total_billable'] / grouped_data['total_quantity'],
                0
            )

            grouped_data['estimated_billable_value_max'] = grouped_data['max_qty_used'] * grouped_data['avg_cost_per_unit']
            grouped_data['estimated_billable_value_min'] = grouped_data['min_qty_used'] * grouped_data['avg_cost_per_unit']
            grouped_data['estimated_billable_value_avg'] = grouped_data['avg_qty_used'] * grouped_data['max_price']#grouped_data['avg_cost_per_unit']
            
            
            # Create a DataFrame for task parts
            for _, part_row in grouped_data.iterrows():
                part_df = pd.DataFrame({
                    "task_number": [task_number],
                    "issued_part_number": [part_row["issued_part_number"]],
                    "part_description": [part_row["part_description"]],
                    "issued_unit_of_measurement": [part_row["issued_unit_of_measurement"]],
                    "used_quantity": [part_row['avg_qty_used']],
                    "max_price":[part_row["max_price"]],
                    "billable_value_usd": [part_row['estimated_billable_value_avg']]
                })
                all_task_parts_df = pd.concat([all_task_parts_df, part_df], ignore_index=True)
        
        return all_task_parts_df
    

    
    # Process tasks and get parts
    task_parts = get_sub_task_parts(mpd_task_data,no_of_task_packages)
    
    # Process each task and its parts
    processed_task_manhours = []
    
    for index, row in mpd_task_data.iterrows():
        task_number = row["TASK NUMBER"]
        description = row["DESCRIPTION"]
        
        # Get manhours information
        manhrs_result = get_manhrs(task_number)
        
        # Create a new row with manhours data added
        task_row = {
            "task_number": task_number,
            "description": description,
            "avg_actual_man_hours": manhrs_result['manhrs']['avg'],
            "max_actual_man_hours": manhrs_result['manhrs']['max'],
            "min_actual_man_hours": manhrs_result['manhrs']['min'],
            "skill_number": manhrs_result['skill_set'],
            "estimated_man_hours": manhrs_result['avg_est']
        }
        
        processed_task_manhours.append(task_row)
    
    # Convert to DataFrame for easier processing
    processed_task_manhours_df = pd.DataFrame(processed_task_manhours)
    
    processed_task_manhours_df.to_csv(f"{filepath}/{estID}_MPD_level_mh_result.csv")
    task_parts.to_csv(f"{filepath}/{estID}_MPD_level_parts_result.csv")
    

        
    print("completed the processing of the tasks")



    print("processing the defects")
        
    sub_task_description_defects= sub_task_description[sub_task_description['package_number'].isin(train_packages)]
    print(f"no of packages in sub_task_description_defects {len(sub_task_description_defects['package_number'].unique().tolist())}")

    
    #print(f"the shape of mpd_task_data{mpd_task_data.shape}")
    
    #print(f"the columns of mpd_task_data{mpd_task_data.columns}")
    
    print(f"the shape of sub_task_description_defects is {sub_task_description_defects.shape}")
    
    exdata=sub_task_description_defects[sub_task_description_defects["source_task_discrepancy_number_updated"].isin(mpd_task_data["TASK NUMBER"])]
    
    print(f"no of packages in exdata {len(exdata['package_number'].unique().tolist())} ")

    print(f"The shape of {exdata.shape} ")
    
    group_level_mh_result=pd.DataFrame()
    group_level_parts_result=pd.DataFrame()
    if len(exdata)>0:
        if "source_task_discrepancy_number_updated" in exdata.columns:
            exdata["source_task_discrepancy_number_updated"] = exdata["source_task_discrepancy_number_updated"].astype(str)
        
        if "source_task_discrepancy_number" in exdata.columns:
            exdata["source_task_discrepancy_number"] = exdata["source_task_discrepancy_number"].astype(str)
        
        
        def update(row):
            if row["source_task_discrepancy_number"] != row["source_task_discrepancy_number_updated"]:
                return row["source_task_discrepancy_number_updated"]
            return row["source_task_discrepancy_number"]  # Return the original value if no change
        
        # Apply function correctly
        exdata["source_task_discrepancy_number"] = exdata.apply(update, axis=1)
        
        exdata['full_description']= exdata["task_description"]+" "+exdata["corrective_action"]
        
        desc_correction_tf_idf_vec = compute_tfidf(exdata['full_description'].tolist(), preserve_symbols=['-', '/'])
        
        desc_correction_embeddings = pd.DataFrame(desc_correction_tf_idf_vec, index=exdata['log_item_number'].tolist())
        
        # Assuming desc_correction_embeddings is a pandas DataFrame
        desc_correction_embeddings = desc_correction_embeddings.T
        embeddings_array = desc_correction_embeddings.values
        
        # Calculate cosine similarity directly on the numpy array
        cos_sim_mat = cosine_similarity(embeddings_array.T)
        
        # Apply threshold directly to the numpy array
        cos_sim_mat = np.where(cos_sim_mat >= 0.5, cos_sim_mat, 0)
        
        # Create sparse representation
        rows, cols = np.where(cos_sim_mat > 0)
        values = cos_sim_mat[rows, cols]
        
        
        # Create the unpivoted dataframe directly from the sparse representation
        columns = desc_correction_embeddings.columns
        df_unpivoted = pd.DataFrame({
        'obsid_s': [columns[r] for r in rows],
        'obsid_d': [columns[c] for c in cols],
        'Value': values
        })
        
        # Set the index
        df_unpivoted.set_index('obsid_s', inplace=True)
        df_unpivot = df_unpivoted[df_unpivoted['obsid_d'] != 'level_0']
        
        df_unpivot.reset_index(inplace=True)
        
        combined_df = exdata.copy()
        
        # Merge df_unpivot with combined_df on 'Log Item #' to get 'sourcetask_s'
        df_unpivot = pd.merge(df_unpivot, combined_df[['log_item_number', 'source_task_discrepancy_number']], left_on='obsid_s', right_on='log_item_number', how='left')
        df_unpivot.rename(columns={'source_task_discrepancy_number': 'source_task_discrepancy_number_s'}, inplace=True)
        df_unpivot.drop(columns='log_item_number', inplace=True)
        
        # Merge df_unpivot with combined_df again on 'Log Item #' to get 'sourcetask_d'
        df_unpivot = pd.merge(df_unpivot, combined_df[['log_item_number', 'source_task_discrepancy_number']], left_on='obsid_d', right_on='log_item_number', how='left')
        df_unpivot.rename(columns={'source_task_discrepancy_number': 'source_task_discrepancy_number_d'}, inplace=True)
        df_unpivot.drop(columns='log_item_number', inplace=True)
        
        # Assuming df_unpivot is your original DataFrame
        # Splitting the DataFrame into three chunks
        chunk_size = len(df_unpivot) // 3
        chunks = [df_unpivot[i:i+chunk_size] for i in range(0, len(df_unpivot), chunk_size)]
        
        # Define the custom function to update the 'Value' column based on conditions
        def update_value(row):
            
            if row['Value'] == 0:
                return 0
            elif row['source_task_discrepancy_number_s'] == row['source_task_discrepancy_number_d']:
                return 1
            else:
                return 0
        
        # Process each chunk individually
        processed_chunks = []
        for chunk in chunks:
            # Create a copy of the chunk to work with
            chunk_copy = chunk.copy()
            # Apply the custom function row-wise to update the 'Value' column
            chunk_copy['Value'] = chunk_copy.apply(update_value, axis=1)
            # Append the processed chunk to the list
            processed_chunks.append(chunk_copy)
        
        # Concatenate the processed chunks into a single DataFrame
        df_unpivotchk = pd.concat(processed_chunks)
        df_sim = df_unpivotchk[df_unpivotchk['Value'] == 1].copy()
        df_sim1 = df_sim[df_sim['obsid_s'] != df_sim['obsid_d']].copy()
        # Assuming df_sim1 is your DataFrame
        
        # Create a directed graph
        G = nx.DiGraph()
        
        # Add edges based on connections between obsid_s and obsid_d
        for index, row in df_sim1.iterrows():
            G.add_edge(row['obsid_s'], row['obsid_d'])
        
        # Assign groups using strongly connected components
        groups = {node: i for i, component in enumerate(nx.strongly_connected_components(G), start=1) for node in component}
        
        # Map the groups to the DataFrame
        df_sim1['Group'] = df_sim1['obsid_s'].map(groups)
        
        # Merge combined_df with df_group on 'Log Item #' and 'obsid_s' to get 'group' values
        group_df = pd.merge(combined_df, df_sim1[['obsid_s', 'Group']], left_on='log_item_number', right_on='obsid_s', how='left')
        
        # Rename the 'Group' column to 'group'
        group_df.rename(columns={'Group': 'group'}, inplace=True)
        
        group_df = group_df.drop_duplicates(subset=['log_item_number']).copy()
        
        group_df = group_df.loc[:, ~group_df.columns.duplicated(keep='last')]
        
        exdata["group"] = float('nan')
        
        
        for i in group_df['log_item_number'].unique():  # Use unique values to avoid redundant operations
            group_values = group_df.loc[group_df['log_item_number'] == i, 'group'].values
        
            if len(group_values) > 0:  # Ensure at least one value exists
                group_value = group_values[0]  # Take the first value
        
            # Assign scalar value correctly to all matching rows
            exdata.loc[exdata['log_item_number'] == i, "group"] = group_value
        
        
        def fillnull(row):
            if pd.isna(row["group"]):  # Correct way to check NaN
                return row["log_item_number"]  # Return the new value
            return row["group"]  # Return original value if not NaN
        
        # Apply function to the 'group' column
        exdata["group"] = exdata.apply(fillnull, axis=1)
        print("clustering is computed")
        exdata=exdata[[ 'log_item_number',
            'task_description', 'corrective_action',
           'source_task_discrepancy_number', 'estimated_man_hours', 
           'actual_man_hours', 'skill_number','full_description', 'group',"package_number"]]
        exdata_parts_updated = exdata.merge(
            sub_task_parts[
                ['task_number', 'issued_part_number','part_description',
                 'issued_unit_of_measurement', 'used_quantity', 'base_price_usd',
                 'billable_value_usd']
            ],
            left_on="log_item_number",
            right_on="task_number",
            how="left"
        ).drop(columns=["task_number"])  # Drop duplicate column
        exdata_parts_updated.to_csv(f"{filepath}/{estID}_clustering.csv")
                
        def prob(row):
            prob = (len(row["packages_list"]) / len(all_package_numbers))*100
            
            return prob
        # Select required columns
        group_level_mh = exdata[[
        "source_task_discrepancy_number","full_description",
        "actual_man_hours",
        "skill_number",
        "group",
        "package_number"
        ]]
        group_level_mh.drop_duplicates(inplace=True)
        task_level_mh= group_level_mh.copy()
        #task_level
        task_level_mh=task_level_mh.groupby(
            ["source_task_discrepancy_number","package_number"]
        ).agg(
            avg_actual_man_hours=("actual_man_hours", "sum"),
            max_actual_man_hours=("actual_man_hours", "sum"),
            min_actual_man_hours=("actual_man_hours", "sum")
        
        ).reset_index()
        
        # Aggregate man-hour statistics
        # Get all unique package numbers once
        all_package_numbers =  task_level_mh["package_number"].unique()
        
        # Aggregate man-hour statistics
        # Aggregate man-hour statistics
        aggregated = task_level_mh.groupby(
            ["source_task_discrepancy_number"]
        ).agg(
            avg_actual_man_hours=("avg_actual_man_hours", "mean"),
            max_actual_man_hours=("max_actual_man_hours", "max"),
            min_actual_man_hours=("min_actual_man_hours", "min")
        ).reset_index()
        
        # Create a crosstab for package indicators (much faster than iterating)
        package_indicators = pd.crosstab(
            index=[task_level_mh["source_task_discrepancy_number"]],
            columns= task_level_mh["package_number"]
        ).clip(upper=1)  # Convert counts to binary indicators
        
        # Merge the aggregated data with package indicators
        task_level_mh_result = pd.merge(
            aggregated,
            package_indicators,
            on=["source_task_discrepancy_number"]
        )
        
        
        # If you still need the packages_list column
        if "packages_list" in aggregated.columns or True:  # Set to True if you need this column
            packages_by_group = task_level_mh.groupby(["source_task_discrepancy_number"])["package_number"].apply(lambda x: list(pd.unique(x)))
            task_level_mh_result["packages_list"] = task_level_mh_result.index.map(lambda idx: packages_by_group.get(idx, []))
            
        
        # Apply the function row-wise
        task_level_mh_result["prob"] =task_level_mh_result.apply(prob, axis=1)
        
        # Get all unique package numbers once
        all_package_numbers = group_level_mh["package_number"].unique()
        # First level aggregation
        group_level_mh = group_level_mh.groupby(
            ["source_task_discrepancy_number", "group", "package_number"]
        ).agg(
            avg_actual_man_hours=("actual_man_hours", "sum"),
            max_actual_man_hours=("actual_man_hours", "sum"),
            min_actual_man_hours=("actual_man_hours", "sum"),
            description=("full_description", "first"),
            skill_number=("skill_number", lambda x: list(set(x)))
        ).reset_index()
        
        # Second level aggregation
        aggregated = group_level_mh.groupby(
            ["source_task_discrepancy_number", "group"]
        ).agg(
            avg_actual_man_hours=("avg_actual_man_hours", "mean"),
            max_actual_man_hours=("max_actual_man_hours", "max"),
            min_actual_man_hours=("min_actual_man_hours", "min"),
            description=("description", "first"),
            skill_number=("skill_number", lambda x: list(set(sum(x, []))))  # Flatten list of lists and remove duplicates
        ).reset_index()
        
        
        # Create a crosstab for package indicators (much faster than iterating)
        package_indicators = pd.crosstab(
            index=[group_level_mh["source_task_discrepancy_number"], group_level_mh["group"]],
            columns=group_level_mh["package_number"]
        ).clip(upper=1)  # Convert counts to binary indicators
        
        # Merge the aggregated data with package indicators
        group_level_mh_result = pd.merge(
            aggregated,
            package_indicators,
            on=["source_task_discrepancy_number", "group"]
        )
        
        # If you still need the packages_list column
        if "packages_list" in aggregated.columns or True:  # Set to True if you need this column
            packages_by_group = group_level_mh.groupby(["source_task_discrepancy_number", "group"])["package_number"].apply(lambda x: list(pd.unique(x)))
            group_level_mh_result["packages_list"] = group_level_mh_result.index.map(lambda idx: packages_by_group.get(idx, []))
            
        
        # Apply the function row-wise
        group_level_mh_result["prob"] =group_level_mh_result.apply(prob, axis=1)
        #print(exdata_parts_updated.columns)
        group_level_parts=exdata_parts_updated[["log_item_number","source_task_discrepancy_number","group","package_number",
        "issued_part_number",'part_description','issued_unit_of_measurement',"used_quantity","billable_value_usd"]]
        #task_level_parts
        task_level_parts=group_level_parts.copy()
        all_package_numbers =  task_level_mh["package_number"].unique()
        task_level_parts= task_level_parts.groupby(["source_task_discrepancy_number", "issued_part_number","package_number"]).agg(
        billable_value_usd=("billable_value_usd","sum"),
        used_quantity=("used_quantity", "sum"),
        part_description=('part_description', "first"),
        issued_unit_of_measurement=('issued_unit_of_measurement', "first")
        ).reset_index()
        
        aggregated = task_level_parts.groupby(["source_task_discrepancy_number", "issued_part_number"]).agg(
            avg_used_qty=("used_quantity", 'mean'),  # Added the missing comma here
            max_used_qty=("used_quantity", "max"),
            min_used_qty=("used_quantity", "min"),
            total_billable_value_usd=("billable_value_usd", "sum"),
            total_used_qty=("used_quantity", "sum"),
            part_description=('part_description', "first"),
            issued_unit_of_measurement=('issued_unit_of_measurement', "first")
        ).reset_index()
        
        # Get all unique package numbers once
        #all_package_numbers = group_level_parts["package_number"].unique()
        
        task_level_parts["source_task_discrepancy_number"] = task_level_parts["source_task_discrepancy_number"].astype(str)
        task_level_parts["issued_part_number"] = task_level_parts["issued_part_number"].astype(str)
        
        
        # Create a crosstab for package indicators (much faster than iterating)
        package_indicators = pd.crosstab(
        index=[task_level_parts["source_task_discrepancy_number"], task_level_parts["issued_part_number"]],
        columns=task_level_parts["package_number"]
        ).clip(upper=1)  # Convert counts to binary indicators
        
        # Merge the aggregated data with package indicators
        task_level_parts_result = pd.merge(
        aggregated,
        package_indicators,
        on=["source_task_discrepancy_number","issued_part_number"]
        )
        # If you still need the packages_list column
        if "packages_list" in aggregated.columns or True:  # Set to True if you need this column
            packages_by_group = task_level_parts.groupby(["source_task_discrepancy_number","issued_part_number"])["package_number"].apply(lambda x: list(pd.unique(x)))
            task_level_parts_result["packages_list"] = task_level_parts_result.index.map(lambda idx: packages_by_group.get(idx, []))
            task_level_parts_result["prob"] =task_level_parts_result.apply(prob, axis=1)
        
        def float_round(value):
            if pd.notna(value):  # Better check for non-null values
                return round(float(value), 2)
            return 0
        
        def parts_price(row):
            if row["total_used_qty"] and row["total_used_qty"] > 0:
                return row["avg_used_qty"] * (row["total_billable_value_usd"]/row["total_used_qty"])
        
            else:
                return 0  # Better to return 0 than None
        # Apply the function row-wise
        task_level_parts_result["billable_value_usd"] = task_level_parts_result.apply(parts_price, axis=1)
        
        
        
        
        ##line item calculation
        
        
        #parts_line_items
        parts_line_items=group_level_parts.copy()
        all_package_numbers =  group_level_mh["package_number"].unique()
        parts_line_items= parts_line_items.groupby(["issued_part_number","package_number"]).agg(
        billable_value_usd=("billable_value_usd","sum"),
        used_quantity=("used_quantity", "sum"),
        part_description=('part_description', "first"),
        issued_unit_of_measurement=('issued_unit_of_measurement', "first")
        ).reset_index()
        
        aggregated = parts_line_items.groupby(["issued_part_number"]).agg(
            avg_used_qty=("used_quantity", 'mean'),  # Added the missing comma here
            max_used_qty=("used_quantity", "max"),
            min_used_qty=("used_quantity", "min"),
            total_billable_value_usd=("billable_value_usd", "sum"),
            total_used_qty=("used_quantity", "sum"),
            part_description=('part_description', "first"),
            issued_unit_of_measurement=('issued_unit_of_measurement', "first")
        ).reset_index()
        
        # Get all unique package numbers once
        #all_package_numbers = group_level_parts["package_number"].unique()
        
        parts_line_items["issued_part_number"] = parts_line_items["issued_part_number"].astype(str)
        
        
        # Create a crosstab for package indicators (much faster than iterating)
        package_indicators = pd.crosstab(
        index=[parts_line_items["issued_part_number"]],
        columns=parts_line_items["package_number"]
        ).clip(upper=1)  # Convert counts to binary indicators
        
        # Merge the aggregated data with package indicators
        parts_line_items_result = pd.merge(
        aggregated,
        package_indicators,
        on=["issued_part_number"]
        )
        # If you still need the packages_list column
        if "packages_list" in aggregated.columns or True:  # Set to True if you need this column
            packages_by_group = parts_line_items.groupby(["issued_part_number"])["package_number"].apply(lambda x: list(pd.unique(x)))
            parts_line_items_result["packages_list"] = parts_line_items_result.index.map(lambda idx: packages_by_group.get(idx, []))
            parts_line_items_result["prob"] =parts_line_items_result.apply(prob, axis=1)
        
        def float_round(value):
            if pd.notna(value):  # Better check for non-null values
                return round(float(value), 2)
            return 0
        
        def parts_price(row):
            if row["total_used_qty"] and row["total_used_qty"] > 0:
                return row["avg_used_qty"] * (row["total_billable_value_usd"]/row["total_used_qty"])
        
            else:
                return 0  # Better to return 0 than None
        # Apply the function row-wise
        parts_line_items_result["billable_value_usd"] =  parts_line_items_result.apply(parts_price, axis=1)
        
        
        
        
        
        
        
        
        
        #group_level_parts
        all_package_numbers =  group_level_mh["package_number"].unique()
        
        group_level_parts= group_level_parts.groupby(["source_task_discrepancy_number", "group","issued_part_number","package_number"]).agg(
        billable_value_usd=("billable_value_usd","sum"),
        used_quantity=("used_quantity", "sum"),
        part_description=('part_description', "first"),
        issued_unit_of_measurement=('issued_unit_of_measurement', "first")
        ).reset_index()
        
        aggregated = group_level_parts.groupby(["source_task_discrepancy_number", "group", "issued_part_number"]).agg(
            avg_used_qty=("used_quantity", 'mean'),  # Added the missing comma here
            max_used_qty=("used_quantity", "max"),
            min_used_qty=("used_quantity", "min"),
            total_billable_value_usd=("billable_value_usd", "sum"),
            total_used_qty=("used_quantity", "sum"),
            part_description=('part_description', "first"),
            issued_unit_of_measurement=('issued_unit_of_measurement', "first")
        ).reset_index()
        
        
        
        # Get all unique package numbers once
        #all_package_numbers = group_level_parts["package_number"].unique()
        
        group_level_parts["source_task_discrepancy_number"] = group_level_parts["source_task_discrepancy_number"].astype(str)
        group_level_parts["issued_part_number"] = group_level_parts["issued_part_number"].astype(str)
        
        
        # Create a crosstab for package indicators (much faster than iterating)
        package_indicators = pd.crosstab(
        index=[group_level_parts["source_task_discrepancy_number"], group_level_parts["group"],group_level_parts["issued_part_number"]],
        columns=group_level_parts["package_number"]
        ).clip(upper=1)  # Convert counts to binary indicators
        
        # Merge the aggregated data with package indicators
        group_level_parts_result = pd.merge(
        aggregated,
        package_indicators,
        on=["source_task_discrepancy_number", "group","issued_part_number"]
        )
        
        # If you still need the packages_list column
        if "packages_list" in aggregated.columns or True:  # Set to True if you need this column
            packages_by_group = group_level_parts.groupby(["source_task_discrepancy_number", "group","issued_part_number"])["package_number"].apply(lambda x: list(pd.unique(x)))
            group_level_parts_result["packages_list"] = group_level_parts_result.index.map(lambda idx: packages_by_group.get(idx, []))
            group_level_parts_result["prob"] =group_level_parts_result.apply(prob, axis=1)
        
        def float_round(value):
            if pd.notna(value):  # Better check for non-null values
                return round(float(value), 2)
            return 0
        
        def parts_price(row):
            if row["total_used_qty"] and row["total_used_qty"] > 0:
                return row["avg_used_qty"] * (row["total_billable_value_usd"]/row["total_used_qty"])
        
            else:
                return 0  # Better to return 0 than None
        
        # Apply the function row-wise
        group_level_parts_result["billable_value_usd"] = group_level_parts_result.apply(parts_price, axis=1)
        
        
        
        
        group_level_mh_result.to_csv(f"{filepath}/{estID}group_level_mh_result.csv")
        group_level_parts_result.to_csv(f"{filepath}/{estID}group_level_parts_result.csv")
        task_level_mh_result.to_csv(f"{filepath}/{estID}_task_level_mh_result.csv")
        task_level_parts_result.to_csv(f"{filepath}/{estID}_task_level_parts_result.csv")
        parts_line_items_result.to_csv(f"{filepath}/{estID}_parts_line_items_result.csv")
        group_level_mh_result = group_level_mh_result.drop(["packages_list"], axis=1)
        task_level_mh_result =task_level_mh_result.drop(["packages_list"], axis=1)

    print("tasks and defects json processing ")
    # Initialize variables
    tasks = []
    task_parts_list = []
    total_parts = []
    taskPartsCost = 0  # Was missing in original code
    #processed_task_manhours_df.fillna(None,inplace=True)
    #task_parts.fillna(None,inplace=True)
    # Process tasks and generate final output
    for index, task_row in processed_task_manhours_df.iterrows():
        spare_parts = []
        task_number = task_row["task_number"]
        
        # Filter task_parts where task_number matches
        task_parts_filtered = task_parts[task_parts["task_number"] == task_number]
    
        for _, part in task_parts_filtered.iterrows():
            taskPartsCost += float(part["billable_value_usd"]) if pd.notna(part["billable_value_usd"]) else 0
            spare_part = {
                "partId": part["issued_part_number"],
                "desc": part["part_description"],
                "unit": part["issued_unit_of_measurement"],
                "qty": float_round(part["used_quantity"]),
                "price": float_round(part["billable_value_usd"])
            }
            spare_parts.append(spare_part)
            task_parts_list.append(spare_part)
            total_parts.append(spare_part)
    
        task = {
            "sourceTask": task_row["task_number"],
            "description": task_row["description"],
            "skill": task_row["skill_number"],
            "mhs": {
                "max": float_round(task_row["max_actual_man_hours"]),
                "min": float_round(task_row["min_actual_man_hours"]),
                "avg": float_round(task_row["avg_actual_man_hours"]),
                "est": float_round(task_row["estimated_man_hours"])
            },
            "spare_parts": spare_parts
        }
    
        tasks.append(task)
    #group_level_parts_result.fillna(None,inplace=True)
    #group_level_mh_result.fillna(None,inplace=True)

    
    
    # Create findings list
    findings = []
    for _, row in group_level_mh_result.iterrows():
        spare_parts = []
    
        # Filter task_parts where task_number matches
        spare_filtered = group_level_parts_result[group_level_parts_result["group"] == row["group"]]
    
        for _, part in spare_filtered.iterrows():
            spare_parts.append({
                "partId": part["issued_part_number"],
                "desc": part["part_description"],
                "unit": part["issued_unit_of_measurement"],
                "qty": float_round(part["avg_used_qty"]),
                "price": float_round(part["billable_value_usd"]),
                "prob": float_round(part["prob"])
            })
            
        finding = {
            "taskId": row["source_task_discrepancy_number"],
            "details": [{
                "cluster": f"{row['source_task_discrepancy_number']}/{row['group']}",
                "description": row["description"],
                "skill": row["skill_number"],
                "mhs": {
                    "max": float_round(row["max_actual_man_hours"]),
                    "min": float_round(row["min_actual_man_hours"]),
                    "avg": float_round(row["avg_actual_man_hours"]),
                    "est": float_round(row["max_actual_man_hours"])
                },
                "prob": float_round(row["prob"]),
                "spare_parts": spare_parts
            }]
        }
        
        findings.append(finding)

    # Correct DataFrame creation for final_pred
    # Create a dictionary with the summaries
    tasks_summary = {
        "avg_mh": float_round(processed_task_manhours_df["avg_actual_man_hours"].sum()),
        "min_mh": float_round(processed_task_manhours_df["min_actual_man_hours"].sum()),
        "max_mh": float_round(processed_task_manhours_df["max_actual_man_hours"].sum()),
        "exp_cons": task_parts_list,
        "total_cons": float_round(taskPartsCost),
        "task_cat": "MPD",
        "est_mh": 0,
        "exp_skl": []
    }
    
    # Create a single-row DataFrame
    final_pred = pd.DataFrame([tasks_summary])
    
    # Initialize disc_pred if not defined (it wasn't defined in the original)
    print("group level disc final is processing")
    disc_pred = []
    disc_pred_list = []
    for finding in findings:
        if finding["details"]:
            disc_pred_list.append({
                "taskId": finding["taskId"],
                "avg_mh": finding["details"][0]["mhs"]["avg"]*(finding["details"][0]['prob']/100),
                "min_mh": finding["details"][0]["mhs"]["min"]*(finding["details"][0]['prob']/100),
                "max_mh": finding["details"][0]["mhs"]["max"]*(finding["details"][0]['prob']/100),
                "prob": finding["details"][0]["prob"],
                "exp_cons": finding["details"][0].get("spare_parts", []),
                "billable_value_usd": sum(
                    part.get("price", 0)*(part.get("prob", 0) / 100) for part in finding["details"][0].get("spare_parts", [])
                )
            })
    
    # Store the original list before converting to DataFrame
    original_disc_pred = disc_pred_list.copy()
            
    # Create DataFrame from the list
    disc_pred = pd.DataFrame(disc_pred_list)
    disc_pred.to_csv(f"{filepath}/{estID}__disc_final_result.csv")

    
    print("task level disc final is processing")

    # Create findings list
    task_level_findings = []
    for _, row in task_level_mh_result.iterrows():
        spare_parts = []
    
        # Filter task_parts where task_number matches
        spare_filtered = task_level_parts_result[task_level_parts_result["source_task_discrepancy_number"] == row["source_task_discrepancy_number"]]
    
        for _, part in spare_filtered.iterrows():
            spare_parts.append({
                "partId": part["issued_part_number"],
                "desc": part["part_description"],
                "unit": part["issued_unit_of_measurement"],
                "qty": float_round(part["avg_used_qty"]),
                "price": float_round(part["billable_value_usd"]),
                "prob": float_round(part["prob"])
            })
            
        finding = {
            "taskId": row["source_task_discrepancy_number"],
            "details": [{
                "mhs": {
                    "max": float_round(row["max_actual_man_hours"]),
                    "min": float_round(row["min_actual_man_hours"]),
                    "avg": float_round(row["avg_actual_man_hours"]),
                    "est": float_round(row["max_actual_man_hours"])
                },
                "prob": float_round(row["prob"]),
                "spare_parts": spare_parts
            }]
        }
        
        task_level_findings.append(finding)
        # Initialize disc_pred if not defined (it wasn't defined in the original)
    task_level_disc_pred = []
    for finding in task_level_findings:
        if finding["details"]:
            task_level_disc_pred.append({
                "taskId": finding["taskId"],
                "avg_mh": finding["details"][0]["mhs"]["avg"]*(finding["details"][0]['prob']/100),
                "min_mh": finding["details"][0]["mhs"]["min"]*(finding["details"][0]['prob']/100),
                "max_mh": finding["details"][0]["mhs"]["max"]*(finding["details"][0]['prob']/100),
                "prob": finding["details"][0]["prob"],
                "exp_cons": finding["details"][0].get("spare_parts", []),
                "billable_value_usd": sum(
                    part.get("price", 0)*(part.get("prob", 0) / 100) for part in finding["details"][0].get("spare_parts", [])
                )
            })
            
    task_level_disc_pred=pd.DataFrame(task_level_disc_pred)
    task_level_disc_pred.to_csv(f"{filepath}/{estID}__task_disc_final_result.csv")

    print("computations are completed")
    
    # Correctly create probability graph
    probability_graph = {}
    
    for i in range(10, 101, 10):
        key = f"prob({i})"
    
        # Base values from tasks
        total_mh = final_pred["avg_mh"].iloc[0] if not final_pred.empty else 0
        total_cost = final_pred["total_cons"].iloc[0] if not final_pred.empty else 0
    
        # Use the original list of dictionaries to avoid string conversion issues
        for item in original_disc_pred:
            if item.get("prob") is not None and item["prob"] > i:
                total_mh += float(item["avg_mh"]) if pd.notna(item["avg_mh"]) else 0
    
                # Sum costs from spare parts
                spare_parts_cost = 0
                exp_cons = item.get("exp_cons", [])
                
                if isinstance(exp_cons, list):
                    for part in exp_cons:
                        if isinstance(part, dict):
                            spare_parts_cost += part.get("price", 0) * (part.get("prob", 0) / 100)
    
                total_cost += spare_parts_cost
    
        probability_graph[key] = {
            "mh": float_round(total_mh),
            "spareCost": float_round(total_cost)
        }
    
    print("Probability graph is generated.")
    print("capping is computing")
    capping_values = {
    'cappingTypeManhrs': cappingDetails["cappingTypeManhrs"],
    'billableManhrs': 0.0,
    'unbillableManhrs': 0.0,
    'cappingTypeSpareCost': cappingDetails["cappingTypeSpareCost"],
    'billableSpareCost': 0.0,
    'unbillableSpareCost': 0.0
    }

    if cappingDetails["cappingTypeManhrs"] != "" and cappingDetails["cappingTypeSpareCost"] != "":
        # Create copies for processing
        task_level_mh_cap = task_level_mh_result.copy()
        task_level_parts_cap = task_level_parts_result.copy()
        
        # Aggregate task level parts
        task_level_parts_cap = task_level_parts_cap.groupby(["source_task_discrepancy_number"]).agg(
            billable_value_usd=("billable_value_usd", sum)
        ).reset_index()
        
        # Merge with probability data
        task_level_parts_cap = task_level_parts_cap.merge(
            task_level_mh_result[["source_task_discrepancy_number", "prob"]],
            on="source_task_discrepancy_number",
            how="left"
        )
        
        # Copy group level data
        group_level_mh_cap = group_level_mh_result.copy()
        group_level_parts_cap = group_level_parts_result.copy()
        
        # Aggregate group level parts
        group_level_parts_cap = group_level_parts_cap.groupby(["source_task_discrepancy_number", "group"]).agg(
            billable_value_usd=("billable_value_usd", sum)
        ).reset_index()
        
        # Merge with probability data
        group_level_parts_cap = group_level_parts_cap.merge(
            group_level_mh_result[["source_task_discrepancy_number", "group", "prob"]],
            on=["source_task_discrepancy_number", "group"],
            how="left"
        )
    
        # Get capping values from details
        mhs_cap_type = cappingDetails["cappingTypeManhrs"]
        mhs_cap_amt = cappingDetails["cappingManhrs"]
        spares_cap_type = cappingDetails["cappingTypeSpareCost"]
        spares_cap_amt = cappingDetails["cappingSpareCost"]
        
        def mhs_cap(mhs_cap_type, mhs_cap_amt):
            if mhs_cap_type == "per_source_card":
                # Calculate intermediate values (before applying probability)
                task_level_mh_cap["unbillable_mh_raw"] = task_level_mh_cap["avg_actual_man_hours"].apply(
                    lambda x: min(x, mhs_cap_amt)
                )
                task_level_mh_cap["billable_mh_raw"] = task_level_mh_cap["avg_actual_man_hours"].apply(
                    lambda x: max(0, x - mhs_cap_amt)
                )
                task_level_mh_cap["mhs_cap_amt"]=mhs_cap_amt
                
                # Save intermediate results to CSV
                task_level_mh_cap.to_csv(f"{filepath}/{estID}_task_level_mh_cap_intermediate.csv", index=False)
                
                # Apply probability to get final values
                task_level_mh_cap["unbillable_mh"] = task_level_mh_cap["unbillable_mh_raw"] * (task_level_mh_cap["prob"]/100)
                task_level_mh_cap["billable_mh"] = task_level_mh_cap["billable_mh_raw"] * (task_level_mh_cap["prob"]/100)
                
                # Save final results to CSV
                task_level_mh_cap.to_csv(f"{filepath}/{estID}_task_level_mh_cap_final.csv", index=False)
                
                return task_level_mh_cap["unbillable_mh"].sum(), task_level_mh_cap["billable_mh"].sum()
            
            elif mhs_cap_type == "per_IRC":
                # Calculate intermediate values (before applying probability)
                group_level_mh_cap["unbillable_mh_raw"] = group_level_mh_cap["avg_actual_man_hours"].apply(
                    lambda x: min(x, mhs_cap_amt)
                )
                group_level_mh_cap["billable_mh_raw"] = group_level_mh_cap["avg_actual_man_hours"].apply(
                    lambda x: max(0, x - mhs_cap_amt)
                )
                
                group_level_mh_cap["mhs_cap_amt"]=mhs_cap_amt
                # Save intermediate results to CSV
                group_level_mh_cap.to_csv(f"{filepath}/{estID}_group_level_mh_cap_intermediate.csv", index=False)
                
                # Apply probability to get final values
                group_level_mh_cap["unbillable_mh"] = group_level_mh_cap["unbillable_mh_raw"] * (group_level_mh_cap["prob"]/100)
                group_level_mh_cap["billable_mh"] = group_level_mh_cap["billable_mh_raw"] * (group_level_mh_cap["prob"]/100)
                
                # Save final results to CSV
                group_level_mh_cap.to_csv(f"{filepath}/{estID}_group_level_mh_cap_final.csv", index=False)
                
                return group_level_mh_cap["unbillable_mh"].sum(), group_level_mh_cap["billable_mh"].sum()
        
        # Calculate and set man-hours capping values
        if cappingDetails["cappingTypeManhrs"] != "":
            capping_values["unbillableManhrs"], capping_values["billableManhrs"] = mhs_cap(mhs_cap_type, mhs_cap_amt)
    
        def spares_cap(spares_cap_type, spares_cap_amt):
            if spares_cap_type == "per_source_card":
                # Calculate intermediate values (before applying probability)
                task_level_parts_cap["unbillable_spares_raw"] = task_level_parts_cap["billable_value_usd"].apply(
                    lambda x: min(x, spares_cap_amt)
                )
                task_level_parts_cap["billable_spares_raw"] = task_level_parts_cap["billable_value_usd"].apply(
                    lambda x: max(0, x - spares_cap_amt)
                )
                task_level_parts_cap["spares_cap_amt"]=spares_cap_amt
                
                # Save intermediate results to CSV
                task_level_parts_cap.to_csv(f"{filepath}/{estID}_task_level_parts_cap_intermediate.csv", index=False)
                
                # Apply probability to get final values
                task_level_parts_cap["unbillable_spares"] = task_level_parts_cap["unbillable_spares_raw"] * (task_level_parts_cap["prob"]/100)
                task_level_parts_cap["billable_spares"] = task_level_parts_cap["billable_spares_raw"] * (task_level_parts_cap["prob"]/100)
                
                # Save final results to CSV
                task_level_parts_cap.to_csv(f"{filepath}/{estID}_task_level_parts_cap_final.csv", index=False)
                
                return task_level_parts_cap["unbillable_spares"].sum(), task_level_parts_cap["billable_spares"].sum()
                
            elif spares_cap_type == "per_IRC":
                # Calculate intermediate values (before applying probability)
                group_level_parts_cap["unbillable_spares_raw"] = group_level_parts_cap["billable_value_usd"].apply(
                    lambda x: min(x, spares_cap_amt)
                )
                group_level_parts_cap["billable_spares_raw"] = group_level_parts_cap["billable_value_usd"].apply(
                    lambda x: max(0, x - spares_cap_amt)
                )
                
                group_level_parts_cap["spares_cap_amt"]=spares_cap_amt
                # Save intermediate results to CSV
                group_level_parts_cap.to_csv(f"{filepath}/{estID}_group_level_parts_cap_intermediate.csv", index=False)
                
                # Apply probability to get final values
                group_level_parts_cap["unbillable_spares"] = group_level_parts_cap["unbillable_spares_raw"] * (group_level_parts_cap["prob"]/100)
                group_level_parts_cap["billable_spares"] = group_level_parts_cap["billable_spares_raw"] * (group_level_parts_cap["prob"]/100)
                
                # Save final results to CSV
                group_level_parts_cap.to_csv(f"{filepath}/{estID}_group_level_parts_cap_final.csv", index=False)
                
                return group_level_parts_cap["unbillable_spares"].sum(), group_level_parts_cap["billable_spares"].sum()
                
            elif spares_cap_type == "per_line_item":
                # Calculate intermediate values (before applying probability)
                parts_line_items_result["unbillable_spares_raw"] = parts_line_items_result["billable_value_usd"].apply(
                    lambda x: min(x, spares_cap_amt)
                )
                parts_line_items_result["billable_spares_raw"] = parts_line_items_result["billable_value_usd"].apply(
                    lambda x: max(0, x - spares_cap_amt)
                )
                parts_line_items_result["spares_cap_amt"]=spares_cap_amt
                # Save intermediate results to CSV
                parts_line_items_result.to_csv(f"{filepath}/{estID}_line_item_parts_cap_intermediate.csv", index=False)
                
                # Apply probability to get final values
                parts_line_items_result["unbillable_spares"] = parts_line_items_result["unbillable_spares_raw"] * (parts_line_items_result["prob"]/100)
                parts_line_items_result["billable_spares"] = parts_line_items_result["billable_spares_raw"] * (parts_line_items_result["prob"]/100)
                
                # Save final results to CSV
                parts_line_items_result.to_csv(f"{filepath}/{estID}_line_item_parts_cap_final.csv", index=False)
                
                return parts_line_items_result["unbillable_spares"].sum(), parts_line_items_result["billable_spares"].sum()
    
        # Calculate and set spare costs capping values
        if cappingDetails["cappingTypeSpareCost"] != "":
            capping_values['unbillableSpareCost'], capping_values['billableSpareCost'] = spares_cap(spares_cap_type, spares_cap_amt)
        
    if not capping_values:
        capping_values = {
            'cappingTypeManhrs': cappingDetails["cappingTypeManhrs"],
            'billableManhrs': 0.0,
            'unbillableManhrs': 0.0,
            'cappingTypeSpareCost': cappingDetails["cappingTypeSpareCost"],
            'billableSpareCost': 0.0,
            'unbillableSpareCost': 0.0
        }
      
    print("capping is completed ")
    # Get tasks_list from tasks if not defined
    tasks_list = tasks
    task_level_findings
    # Properly calculate totals for JSON output
    tasks_total_mhs = sum(task["mhs"]["avg"] for task in tasks)
    tasks_total_parts_cost = sum(sum(part["price"] for part in task["spare_parts"]) for task in tasks)
    tasks_min_mhs = sum(task["mhs"]["min"] for task in tasks)
    tasks_max_mhs = sum(task["mhs"]["max"] for task in tasks)
    findings_total_mhs = sum((finding["details"][0]["mhs"]["avg"]*(finding["details"][0]['prob']/100)) for finding in findings if finding["details"]) if findings else 0
    findings_total_parts_cost = sum(sum(part["price"]*(part['prob']/100) for part in finding["details"][0].get("spare_parts", [])) for finding in findings if finding["details"]) if findings else 0
    findings_min_mhs = sum((finding["details"][0]["mhs"]["min"]*(finding["details"][0]['prob']/100)) for finding in findings if finding["details"]) if findings else 0
    findings_max_mhs = sum((finding["details"][0]["mhs"]["max"]*(finding["details"][0]['prob']/100)) for finding in findings if finding["details"]) if findings else 0

    
    task_findings_total_mhs = sum((finding["details"][0]["mhs"]["avg"]*(finding["details"][0]['prob']/100)) for finding in task_level_findings if finding["details"]) if task_level_findings else 0
    task_findings_total_parts_cost = sum(sum(part["price"]*(part['prob']/100) for part in finding["details"][0].get("spare_parts", [])) for finding in task_level_findings if finding["details"]) if task_level_findings else 0
    task_findings_min_mhs = sum((finding["details"][0]["mhs"]["min"]*(finding["details"][0]['prob']/100)) for finding in task_level_findings if finding["details"]) if task_level_findings else 0
    task_findings_max_mhs = sum((finding["details"][0]["mhs"]["max"]*(finding["details"][0]['prob']/100)) for finding in task_level_findings if finding["details"]) if task_level_findings else 0


    

    print("generating the output dict")
    # Construct output JSON data
    output_data = {
        "estID": estID,
        "description": f"Estimate for package {estID}",
        "tasks": tasks_list,
        "aggregatedTasks": {
            "totalMhs": float_round(tasks_total_mhs),
            "totalPartsCost": float_round(tasks_total_parts_cost),
            "mhs": {
                "avg_mh": float_round(tasks_total_mhs),
                "min_mh": float_round(tasks_min_mhs),
                "max_mh": float_round(tasks_max_mhs)
            }
        },
        "findings": findings,
        "aggregatedFindings": {
            "totalMhs": float_round(findings_total_mhs),
            "totalPartsCost": float_round(findings_total_parts_cost),
            
            "task_totalMhs": float_round(task_findings_total_mhs),
            "task_totalPartsCost": float_round(task_findings_total_parts_cost),
            
            "mhs": {
                "avg_mh": float_round(findings_total_mhs),
                "min_mh": float_round(findings_min_mhs),
                "max_mh": float_round(findings_max_mhs)
            },
            "task_mhs":{
                "avg_mh": float_round(task_findings_total_mhs),
                "min_mh": float_round(task_findings_min_mhs),
                "max_mh": float_round(task_findings_max_mhs)
                
            }

            
        },
        "totalConsumption": {
            "totalMhs": float_round(tasks_total_mhs + findings_total_mhs),
            "totalPartsCost": float_round(tasks_total_parts_cost + findings_total_parts_cost),
            "totalParts": total_parts,
            "mhs": {
                "avg_mh": float_round(tasks_total_mhs + findings_total_mhs),
                "min_mh": float_round(tasks_min_mhs + findings_min_mhs),
                "max_mh": float_round(tasks_max_mhs + findings_max_mhs)
            }
        },
        "probabilityGraph": probability_graph,
        "capping_values":capping_values,
        "cappingDetails":cappingDetails,
        "createdAt": datetime.datetime.fromisoformat(datetime.datetime.now().isoformat()),
        "lastUpdated": datetime.datetime.fromisoformat(datetime.datetime.now().isoformat()),
        "createdBy": "estimaai@evrides.live"
    }
            
    print("tasks and defects are processed")
    #output_data = json.dumps(output_data)
    #aggregatedTasks=json.dumps(output_data["aggregatedTasks"])
    #print(aggregatedTasks)
    return output_data


