import pandas as pd
from prefect import task

@task
def clean_data(data):
    """
    Clean and preprocess data.
    """
    # Example transformation: Remove duplicates
    cleaned_data = data.drop_duplicates()
    return cleaned_data
