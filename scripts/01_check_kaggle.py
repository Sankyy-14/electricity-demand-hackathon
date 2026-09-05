import pandas as pd
import os

file_path = "data/delhi_demand.csv"

print("Checking file...")

if not os.path.exists(file_path):
    print("❌ File not found!")
    print("Make sure the CSV is inside the data folder.")
    exit()

df = pd.read_csv(file_path)

print("\n✅ Dataset loaded successfully!")

print("\nNumber of rows:")
print(len(df))

print("\nNumber of columns:")
print(len(df.columns))

print("\nColumn names:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head())

print("\nDataset information:")
print(df.info())

print("\nMissing values:")
print(df.isnull().sum())
