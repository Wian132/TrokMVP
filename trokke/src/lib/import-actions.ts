// src/lib/import-actions.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import * as XLSX from 'xlsx'
import { type Database } from '@/types/supabase'

// A more flexible type for a row from the Excel sheet.
type ExcelRow = (string | number | Date | null | undefined)[];

/**
 * Parses a date string or Excel serial number from various formats.
 * @param dateValue The value from the cell.
 * @returns A Date object or null if parsing fails.
 */
const parseFlexibleDate = (dateValue: unknown): Date | null => {
    if (!dateValue) return null;

    // Handle Excel's numeric serial date format first
    if (typeof dateValue === 'number' && dateValue > 0) {
        // Excel's epoch starts on 1899-12-30. 25569 is the diff between Excel and Unix epochs.
        return new Date(Math.round((dateValue - 25569) * 86400 * 1000));
    }

    if (typeof dateValue !== 'string') return null;

    const dateStr = dateValue.trim();
    // Regex for various formats like YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY, YYYY/MM/DD etc.
    const regex = /(\d{1,4})[\-.\/](\d{1,2})[\-.\/](\d{1,4})/;
    const parts = dateStr.match(regex);

    if (!parts) return null;

    let year, month, day;

    // Check for YYYY at the start
    if (parts[1].length === 4) {
        year = parseInt(parts[1], 10);
        month = parseInt(parts[2], 10) - 1; // JS months are 0-indexed
        day = parseInt(parts[3], 10);
    }
    // Check for YYYY at the end
    else if (parts[3].length === 4) {
        day = parseInt(parts[1], 10);
        month = parseInt(parts[2], 10) - 1;
        year = parseInt(parts[3], 10);
    }
    else {
        return null; // Ambiguous format
    }

    const date = new Date(Date.UTC(year, month, day));
    // Validate the parsed date
    if (isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
        return null;
    }

    return date;
};


/**
 * Creates a map from header names to column indices.
 * @param headerRow The first row of the Excel sheet.
 * @returns A map where keys are lowercased header names and values are their indices.
 */
const createHeaderMap = (headerRow: ExcelRow): Record<string, number> => {
    const map: Record<string, number> = {};
    headerRow.forEach((cell, index) => {
        if (typeof cell === 'string') {
            // Standardize header names for reliable mapping
            const cleanHeader = cell.trim().toLowerCase().replace(/\s+/g, ' ');
            map[cleanHeader] = index;
        }
    });
    return map;
};

// Helper to safely get a numeric value from a row
const getNumericValue = (row: ExcelRow, map: Record<string, number>, key: string): number | null => {
    const value = row[map[key]];
    return typeof value === 'number' ? value : null;
};


export async function handleImport(formData: FormData): Promise<{ message?: string; error?: string }> {
  const file = formData.get('file') as File
  if (!file) {
    return { error: 'No file uploaded.' }
  }

  try {
    const supabase = await createClient();
    const bytes = await file.arrayBuffer()
    const workbook = XLSX.read(bytes, { type: 'buffer' })
    
    const importStartDate = new Date('2024-01-01');
    let trucksImported = 0;
    let tripsImported = 0;
    let tripsSkipped = 0;

    for (const sheetName of workbook.SheetNames) {
        const license_plate = sheetName.trim();
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        const rawData: ExcelRow[] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

        if (jsonData.length < 2) continue; // Skip empty or header-only sheets

        const headerRow = jsonData[0];
        const headerMap = createHeaderMap(headerRow);
        
        // --- Find Truck or Create it ---
        const { data: truck, error: truckError } = await supabase
            .from('trucks')
            .upsert({ license_plate }, { onConflict: 'license_plate' })
            .select('id')
            .single();
        
        if (truckError || !truck) {
            console.error(`Error upserting truck ${license_plate}:`, truckError);
            continue;
        }
        trucksImported++;
        const truck_id = truck.id;

        const tripsToInsert: Database['public']['Tables']['truck_trips']['Insert'][] = [];

        // --- Process Trips ---
        for (let i = 1; i < jsonData.length; i++) {
            const stringRow = jsonData[i];
            const rawRow = rawData[i];
            
            if (!stringRow || stringRow.length === 0 || !stringRow.some(cell => cell)) continue;

            const tripDateValue = rawRow[headerMap['date']];
            const tripDate = parseFlexibleDate(tripDateValue);

            if (!tripDate || tripDate < importStartDate) {
                if (tripDate) tripsSkipped++;
                continue; // Skip if date is invalid or before 2024
            }
            
            const opening_km = getNumericValue(rawRow, headerMap, 'opening km') ?? getNumericValue(rawRow, headerMap, 'openingkm');
            const total_km = getNumericValue(rawRow, headerMap, 'km');
            
            const tripDataObject = {
                truck_id,
                trip_date: tripDate.toISOString(),
                worker_name: (stringRow[headerMap['driver']] as string | null) ?? null,
                opening_km,
                total_km,
                closing_km: (opening_km !== null && total_km !== null) ? opening_km + total_km : null,
                liters_filled: getNumericValue(rawRow, headerMap, 'liters') ?? getNumericValue(rawRow, headerMap, 'litres'),
                km_per_liter: getNumericValue(rawRow, headerMap, 'km / l'),
                notes: (stringRow[headerMap['notes']] as string | null) ?? null,
                supplier: (stringRow[headerMap['supplier']] as string | null) ?? null,
                comments: (stringRow[headerMap['comments']] as string | null) ?? null,
                expense_amount: getNumericValue(rawRow, headerMap, 'expense'),
                expense_date: parseFlexibleDate(rawRow[headerMap['date 2']])?.toISOString() ?? null,
                next_service_km: getNumericValue(rawRow, headerMap, 'next service') ?? getNumericValue(rawRow, headerMap, 'next service km'),
            };

            tripsToInsert.push(tripDataObject);
        }

        if (tripsToInsert.length > 0) {
            // To ensure idempotency, we delete old trips within the date range before inserting new ones.
            const { error: deleteError } = await supabase.from('truck_trips')
                .delete()
                .eq('truck_id', truck_id)
                .gte('trip_date', importStartDate.toISOString());

            if (deleteError) {
                console.error(`Could not delete old trips for ${license_plate}:`, deleteError.message);
            }

            const { error: tripsError } = await supabase.from('truck_trips').insert(tripsToInsert);
            if (tripsError) {
                console.error(`Error inserting trips for ${license_plate}:`, tripsError.message);
                return { error: `Failed to insert trips for ${license_plate}: ${tripsError.message}` };
            } else {
                tripsImported += tripsToInsert.length;
            }
        }
    }

    return { 
        message: `Import complete! Processed ${trucksImported} trucks. Imported ${tripsImported} new trip records and skipped ${tripsSkipped} records from before 2024.` 
    };

  } catch (error: unknown) {
    console.error('Import failed:', error);
    if (error instanceof Error) {
        return { error: `Import failed: ${error.message}` };
    }
    return { error: 'An unknown error occurred during import.' };
  }
}