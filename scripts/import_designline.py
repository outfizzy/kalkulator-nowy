#!/usr/bin/env python3
"""
Script to import Designline price tables from xlsx to Supabase.
Designline only has Glass (no Poly), only Wall-mounted (no Freestanding).
"""

import openpyxl
import os
from supabase import create_client
import uuid

# Supabase connection
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://whgjsppyuvglhbdgdark.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set")
    print("Please run: export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

XLSX_PATH = "/Users/tomaszfijolek/Desktop/Program do ofert /offer-app/imports/Aluxe Preisliste UPE 2026_DE.xlsx"

# Zone mapping
ZONE_SHEETS = {
    1: "Designline Zone 1R",
    2: "Designline Zone 1a+2R",
    3: "Designline Zone 2a+3R"
}

def parse_dimension(dim_str):
    """Parse '3000x2500' to (3000, 2500)"""
    if not dim_str or not isinstance(dim_str, str):
        return None, None
    dim_str = dim_str.replace('**', '').strip()
    parts = dim_str.lower().split('x')
    if len(parts) != 2:
        return None, None
    try:
        return int(parts[0]), int(parts[1])
    except ValueError:
        return None, None

def get_or_create_table(name: str) -> str:
    """Get existing table ID or create new one"""
    result = supabase.table('price_tables').select('id').eq('name', name).execute()
    if result.data:
        return result.data[0]['id']
    
    new_id = str(uuid.uuid4())
    supabase.table('price_tables').insert({
        'id': new_id,
        'name': name,
        'type': 'matrix',
        'is_active': True
    }).execute()
    print(f"Created table: {name}")
    return new_id

def import_designline_zone(wb, zone: int):
    """Import Designline pricing for a specific zone"""
    sheet_name = ZONE_SHEETS[zone]
    ws = wb[sheet_name]
    
    table_name = f"Aluxe V2 - Designline Glass (Zone {zone})"
    table_id = get_or_create_table(table_name)
    
    # Clear existing entries
    supabase.table('price_matrix_entries').delete().eq('price_table_id', table_id).execute()
    
    entries = []
    
    # Parse rows - data starts from row 5
    for row in ws.iter_rows(min_row=5, max_row=100, max_col=10, values_only=True):
        dim_str = row[0]  # Column A: Dimension
        price_incl_glass = row[3]  # Column D: Price including glass cover
        
        if not dim_str or not price_incl_glass:
            continue
            
        width, projection = parse_dimension(str(dim_str))
        if width is None or projection is None:
            continue
            
        try:
            price = float(price_incl_glass)
        except (ValueError, TypeError):
            continue
            
        entries.append({
            'price_table_id': table_id,
            'width_mm': width,
            'projection_mm': projection,
            'price': round(price, 2)
        })
    
    if entries:
        # Batch insert
        supabase.table('price_matrix_entries').insert(entries).execute()
        print(f"Imported {len(entries)} entries for {table_name}")
    else:
        print(f"No entries found for {table_name}")

def main():
    print("Loading workbook...")
    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)
    
    print("\nImporting Designline price tables...")
    for zone in [1, 2, 3]:
        import_designline_zone(wb, zone)
    
    print("\nDone!")

if __name__ == "__main__":
    main()
