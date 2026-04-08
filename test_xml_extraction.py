#!/usr/bin/env python3
"""
Test the XML extraction on the problematic Excel file.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'data_pipeline'))

from extract.extract import read_excel_from_xml

file_path = r"D:\Projects\gmr-mro\test_data_pipeline\Data\Data\2025\INCREMENTAL DATA-3\2025\HMV250001260825\Material_8Q-IAZ HMV25-000126-0825.xlsx"

print(f"Testing XML extraction for: {file_path}")
print("=" * 80)

df = read_excel_from_xml(file_path, 'PRICING')

print(f"\nResult shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print(f"\nFirst few rows:")
print(df.head(10))

if df.empty:
    print("\n⚠️ DataFrame is empty!")
else:
    print(f"\n✅ Successfully extracted {len(df)} rows of data!")
