# Imports 
import pandas as pd
import numpy as np
import string
import nltk
import spacy
import dask.dataframe as dd
import networkx as nx
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import inflect
from typing import List, Dict, Set
import duckdb

import matplotlib.pyplot as plt
import seaborn as sns

# Initialize necessary components
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')
nlp = spacy.load("en_core_web_sm")
le = LabelEncoder()
q = inflect.engine()
vectorizer = TfidfVectorizer()

# Connect to DuckDB and load data
def load_data():
    """Load data from DuckDB."""
    con = duckdb.connect("Mro_warehouse.db")
    exdata = con.execute("SELECT * FROM Mro_data").fetchdf()
    con.close()
    return exdata

# Preprocessing functions
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
def compute_tfidf(corpus: list, preserve_symbols=['-', '/']) -> np.ndarray:
    """Preprocess corpus and compute TF-IDF embeddings."""
    preprocessed_corpus = [preprocess_text(text, preserve_symbols) for text in corpus]
    embeddings = vectorizer.fit_transform(preprocessed_corpus)
    return embeddings.toarray()

# Threshold transformation
def threshold_transform(data, threshold=0.5, above_value=1, below_value=0):
    """Apply a threshold transformation to data."""
    data = np.array(data)
    transformed_data = np.where(data > threshold, above_value, below_value)
    return transformed_data

# Calculate probabilities
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

# Group and Similarity Calculation
def calculate_similarity_and_grouping(exdata: pd.DataFrame) -> pd.DataFrame:
    """Compute similarity and group information."""
    mro_data = exdata.copy()
    mro_data["group"] = float('nan')
    mro_data["prob"] = float('nan')

    for task in exdata['SourceTask'].unique():
        temp = exdata[exdata['SourceTask'] == task]
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
        df_unpivoted = pd.merge(df_unpivoted, combined_df[['Log Item #', 'SourceTask']], 
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
        group_df['group'].fillna(0, inplace=True)
        group_df['group'] = group_df['group'].astype(int)

        # Fill probabilities
        sheet_name = list(group_df["sheet_name"])
        group = list(group_df["group"])
        probabilities = calculate_probability(group, sheet_name)
        group_df["probabilities"] = probabilities

        # Update mro_data
        for i in group_df['Log Item #']:
            group_value = group_df.loc[group_df['Log Item #'] == i, 'group'].values[0]
            prob_value = group_df.loc[group_df['Log Item #'] == i, "probabilities"].values[0]
            mro_data.loc[mro_data['Log Item #'] == i, "group"] = group_value
            mro_data.loc[mro_data['Log Item #'] == i, "prob"] = prob_value

    return mro_data, group_df

# Write updated data to DuckDB
def write_to_duckdb(group_df: pd.DataFrame):
    """Write the updated DataFrame to DuckDB."""
    con = duckdb.connect("Mro_warehouse.db")
    con.execute("DROP TABLE IF EXISTS Mro_data")
    con.register("updated_mro_data", group_df)
    con.execute("CREATE TABLE Mro_data AS SELECT * FROM updated_mro_data")
    con.execute('PRAGMA force_checkpoint;')
    con.close()

# Main pipeline execution
def main_pipeline():
    """Run the entire pipeline."""
    # Step 1: Load data
    exdata = load_data()

    # Step 2: Compute similarity and group information
    mro_data, group_df = calculate_similarity_and_grouping(exdata)

    # Step 3: Write updated data to DuckDB
    write_to_duckdb(group_df)

    print("Updated table successfully written to DuckDB.")
    return mro_data

# Execute the pipeline
if __name__ == "__main__":
    result_data = main_pipeline()
