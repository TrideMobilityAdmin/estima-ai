import os
from prefect import task

@task
def get_excel_files(path, extensions=('.xlsx', '.xls')):
    """
    Get a list of Excel files in the specified directory.
    """
    return [
        os.path.join(path, f)
        for f in os.listdir(path)
        if f.endswith(extensions)
    ]
