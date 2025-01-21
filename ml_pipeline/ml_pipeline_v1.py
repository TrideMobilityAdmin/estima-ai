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
from prefect import task, Flow
from motor.motor_asyncio import AsyncIOMotorClient
from prefect import flow

# Initialize necessary components
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')
nlp = spacy.load("en_core_web_sm")
le = LabelEncoder()
q = inflect.engine()
vectorizer = TfidfVectorizer()


# Connect to MongoDB
@task
async def connect_to_database(db_name="gmr-mro"):
    try:
        client = AsyncIOMotorClient("mongodb://admin:Tride%401234@telematics-mongo1.evrides.in:22022,telematics-mongo2.evrides.in:22022,telematics-mongo3.evrides.in:22022/?authSource=admin&replicaSet=trideRepl")
        db = client[db_name]
        collection = db["sub_task_description"]
        # Test the connection
        await client.admin.command('ping')
        print(f"Connected to database: {db_name}, Collection: {collection.name}")
        return collection
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None

@task(cache_policy=None)
async def fetch_data(collection=None):
    """Fetch data from MongoDB collection."""
    # Return an empty DataFrame if no collection is provided
    if collection is None:
        return pd.DataFrame()

    # Retrieve documents from the collection
    documents = []
    async for doc in collection.find():
        documents.append(doc)

    # Return the documents as a DataFrame
    return pd.DataFrame(documents)



# Preprocessing functions
@task
def preprocess_text(text: str, preserve_symbols=[], words_to_remove=['DURING', 'INSPECTION', 'OBSERVED']) -> str:
    """Perform text preprocessing."""
    if isinstance(text, float) and np.isnan(text):
        return ''
    
    preserve_symbols = set(preserve_symbols)
    for word in words_to_remove:
        text = text.replace(word, ' ')
    custom_translation = str.maketrans('', '', ''.join(set(string.punctuation) - preserve_symbols))
    text = text.translate(custom_translation)
    
    return text

@task
def tokenization(preprocessed_text: str) -> list:
    """Perform text tokenization."""
    preprocessed_text = preprocessed_text.lower()
    sentences = nltk.sent_tokenize(preprocessed_text)
    preprocessed_tokens = []
    stop_words = set(nltk.corpus.stopwords.words('english'))
    lemmatizer = nltk.WordNetLemmatizer()

    for sentence in sentences:
        tokens = nltk.word_tokenize(sentence)
        tokens = [token for token in tokens if token.lower() not in stop_words]
        tokens = [lemmatizer.lemmatize(token) for token in tokens]
        preprocessed_tokens.append(tokens)
    
    return preprocessed_tokens

@task
def calculate_embeddings(preprocessed_tokens: list) -> list:
    """Calculate embeddings from preprocessed tokens."""
    embeddings = []
    for token in preprocessed_tokens:
        sentence = ' '.join(token)
        doc = nlp(sentence)
        sentence_embedding = doc.vector
        embeddings.append(sentence_embedding)
    return embeddings

# TF-IDF and Embedding Computation
@task
def compute_tfidf(corpus: list, preserve_symbols=['-', '/']) -> np.ndarray:
    """Preprocess corpus and compute TF-IDF embeddings."""
    preprocessed_corpus = [preprocess_text(text, preserve_symbols) for text in corpus]
    embeddings = vectorizer.fit_transform(preprocessed_corpus)
    return embeddings.toarray()

# Threshold transformation
@task
def threshold_transform(data, threshold=0.5, above_value=1, below_value=0):
    """Apply a threshold transformation to data."""
    data = np.array(data)
    transformed_data = np.where(data > threshold, above_value, below_value)
    return transformed_data

@task
def calculate_probability(x: List[int], y: List[str]) -> List[float]:
    """Calculate probabilities based on frequency and scaling."""
    result = []
    ns = len(set(y))
    ps = 100 / ns
    frequency_map = {element: x.count(element) for element in set(x)}
    probability_map = {element: count * ps for element, count in frequency_map.items()}
    
    for element in x:
        result.append(probability_map[element])
    
    return result

@task
async def calculate_similarity_and_grouping(exdata: pd.DataFrame) -> tuple:
    """Compute similarity and group information."""
    if exdata.empty:
        return pd.DataFrame(), pd.DataFrame()
        
    mro_data = exdata.copy()
    mro_data["group"] = float('nan')
    mro_data["prob"] = float('nan')


    for task in exdata['Source Task/Discrep. #'].unique():
        temp = exdata[exdata['Source Task/Discrep. #'] == task]
        exdata_Description = compute_tfidf(temp['Description'].tolist(), preserve_symbols=['-', '/'])
        exdata_Description_embeddings = pd.DataFrame(exdata_Description, index=temp['Log Item #'].tolist()).T
        
        # Cosine Similarity Matrix
        cos_sim_desc_correction_mat = cosine_similarity(exdata_Description_embeddings.T)
        cosine_sim_desc_correction_df = pd.DataFrame(cos_sim_desc_correction_mat, 
                                                     index=exdata_Description_embeddings.columns, 
                                                     columns=exdata_Description_embeddings.columns)

        # Apply threshold to similarity matrix
        df_des = threshold_transform(cosine_sim_desc_correction_df, threshold=0.5)
        df1 = pd.DataFrame(df_des, index=exdata_Description_embeddings.columns, columns=exdata_Description_embeddings.columns)

        # Convert to Dask DataFrame and unpivot
        df1_dd = dd.from_pandas(df1, npartitions=4).reset_index()
        df_unpivoted_dd = df1_dd.melt(id_vars='index', var_name='obsid_d', value_name='Value').compute()
        df_unpivoted = df_unpivoted_dd.rename(columns={'index': 'obsid_s'})
        
        # Filter and merge data
        df_unpivoted = df_unpivoted[df_unpivoted['obsid_d'] != 'level_0']
        df_unpivoted.reset_index(inplace=True)
        combined_df = temp
        df_unpivoted = pd.merge(df_unpivoted, combined_df[['Log Item #', 'Source Task/Discrep. #']], 
                                left_on='obsid_s', right_on='Log Item #', how='left').drop(columns='Log Item #')
        
        # Process the value column based on conditions
        df_unpivoted['Value'] = df_unpivoted.apply(lambda row: 1 if row['obsid_s'] == row['obsid_d'] else 0, axis=1)

        # Filter similar items
        df_sim = df_unpivoted[df_unpivoted['Value'] == 1].copy()
        df_sim1 = df_sim[df_sim['obsid_s'] != df_sim['obsid_d']]

        # Build a graph to find strongly connected components
        G = nx.DiGraph()
        for index, row in df_sim1.iterrows():
            G.add_edge(row['obsid_s'], row['obsid_d'])
        
        groups = {node: i for i, component in enumerate(nx.strongly_connected_components(G), start=1) for node in component}
        df_sim1['Group'] = df_sim1['obsid_s'].map(groups)

        # Merge group info with original dataframe
        group_df = pd.merge(combined_df, df_sim1[['obsid_s', 'Group']].drop_duplicates(subset=['obsid_s']), 
                            left_on='Log Item #', right_on='obsid_s', how='left').drop(columns='obsid_s')
        
        group_df.rename(columns={'Group': 'group'}, inplace=True)
        group_df['group'] = group_df['group'].fillna(0)
        group_df['group'] = group_df['group'].astype(int)

        # Fill probabilities
        Folder_Name = list(group_df["Folder_Name"])
        group = list(group_df["group"])
        probabilities = calculate_probability(group, Folder_Name)
        group_df["probabilities"] = probabilities

        # Update mro_data
        for i in group_df['Log Item #']:
            group_value = group_df.loc[group_df['Log Item #'] == i, 'group'].values[0]
            prob_value = group_df.loc[group_df['Log Item #'] == i, "probabilities"].values[0]
            mro_data.loc[mro_data['Log Item #'] == i, "group"] = group_value
            mro_data.loc[mro_data['Log Item #'] == i, "prob"] = prob_value
            
            

    return mro_data, group_df


    

# Write updated data to MongoDB

@task
async def write_to_mongodb(mro_data: pd.DataFrame, db_name="gmr-mro", collection_name="Predicted_data"):
    """Write the updated DataFrame to MongoDB."""
    if mro_data.empty:
        print("No data to write to MongoDB")
        return
        
    try:
        # Log the number of rows being written
        print(f"Group DataFrame contains {len(mro_data)} rows")
        records = mro_data.to_dict(orient="records")
        print(f"Number of records to write: {len(records)}")

        client = AsyncIOMotorClient("mongodb://admin:Tride%401234@telematics-mongo1.evrides.in:22022,telematics-mongo2.evrides.in:22022,telematics-mongo3.evrides.in:22022/?authSource=admin&replicaSet=trideRepl")
        db = client[db_name]
        collection = db[collection_name]

        # Insert all records
        result = await collection.insert_many(records)
        print(f"Inserted {len(result.inserted_ids)} documents into MongoDB")
    except Exception as e:
        print(f"Error writing to MongoDB: {e}")

async def verify_mongodb_collection(db_name="gmr-mro", collection_name="Predicted_data"):
    """Verify the total number of documents in MongoDB."""
    try:
        client = AsyncIOMotorClient("mongodb://admin:Tride%401234@telematics-mongo1.evrides.in:22022,telematics-mongo2.evrides.in:22022,telematics-mongo3.evrides.in:22022/?authSource=admin&replicaSet=trideRepl")
        db = client[db_name]
        collection = db[collection_name]
        
        count = await collection.count_documents({})
        print(f"Total documents in MongoDB: {count}")
    except Exception as e:
        print(f"Error verifying MongoDB collection: {e}")

@flow(name="MRO_Pipeline")
async def run_flow():
    """Run the Prefect flow with proper async handling."""
    # Connect and fetch data
    collection = await connect_to_database()
    exdata = await fetch_data(collection)
    print("Fetched data shape:", exdata.shape)
    
    # Process data
    mro_data, group_df = await calculate_similarity_and_grouping(exdata)
    
    # Write results
    await write_to_mongodb(mro_data)
    
    # Verify MongoDB
    await verify_mongodb_collection()
    
    return mro_data, group_df


def main():
    """Main function to run the pipeline"""
    try:
        # Create a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Run the flow
        mro_data, group_df = loop.run_until_complete(run_flow())
        
        # Print results
        print("\nResults:")
        if not mro_data.empty:
            print("MRO Data shape:", mro_data.shape)
        else:
            print("MRO Data is Empty")
        if not group_df.empty:
            print(f"Group DataFrame shape: {group_df.shape}")
        else:
            print("Group DataFrame is Empty")

        # Verify and log group_df rows
        print(f"Group DataFrame contains {len(group_df)} rows:")
        print(group_df.head())

    finally:
        # Clean up
        loop.close()


if __name__ == "__main__":
    main()
