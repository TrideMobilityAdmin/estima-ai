import pandas as pd
import numpy as np

def clean_data(data):
    """
    Clean and prepare the dataframe for database insertion.
    """
    try:
        if data.empty:
            print("The dataframe is empty. No cleaning performed.")
            return data

        # Ensure all column names are strings
        data.columns = data.columns.astype(str)

        # Remove special characters and unwanted spaces from column names
        data.columns = data.columns.str.replace(r'[^\w]', '', regex=True).str.strip()

        # Drop columns with purely numeric names
        data = data.loc[:, ~data.columns.str.isnumeric()]

        # Drop duplicate rows
        #cleaned_data = data.drop_duplicates()


        # Iterate over columns and clean based on data type
        for column in cleaned_data.columns:
            try:
                col_data = cleaned_data[column]

                if isinstance(col_data, pd.DataFrame):
                    print(f"⚠️ Warning: Column '{column}' contains a DataFrame. Converting to string representation.")
                    cleaned_data[column] = col_data.astype(str)

                elif isinstance(col_data, pd.Series):  # Ensure we are working with a Series
                    if pd.api.types.is_datetime64_any_dtype(col_data):
                        # Convert datetime columns to ISO format strings
                        cleaned_data[column] = col_data.apply(
                            lambda x: x.isoformat() if pd.notnull(x) else None
                        )

                    elif pd.api.types.is_timedelta64_dtype(col_data):
                        # Convert timedelta columns to total seconds
                        cleaned_data[column] = col_data.dt.total_seconds()

                    elif np.issubdtype(col_data.dtype, np.number):
                        # Convert numeric columns to float
                        cleaned_data[column] = pd.to_numeric(col_data, errors='coerce')

                else:
                    print(f"⚠️ Warning: Column '{column}' is not a Series and will be skipped.")

            except AttributeError as attr_err:
                print(f"❌ Column '{column}' type processing error: {attr_err}")
            except Exception as col_error:
                print(f"❌ Error processing column '{column}': {col_error}")


        # Replace infinities with None
        cleaned_data = cleaned_data.replace([np.inf, -np.inf], None)

        # Replace NaN values with None
        cleaned_data = cleaned_data.where(pd.notnull(cleaned_data), None)

        return cleaned_data

    except Exception as e:
        print(f"Data cleaning failed: {e}")
        return data
