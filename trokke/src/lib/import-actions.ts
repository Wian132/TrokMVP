// src/lib/import-actions.ts

"use server";

import { type Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/server";
import * as XLSX from 'xlsx';

type TripInsert = Database['public']['Tables']['truck_trips']['Insert'];

// --- Helper Functions ---

function cleanAndParseFloat(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return NaN;
  if (typeof value === 'number') return value;
  const cleanedValue = String(value).replace(/["',]/g, "").trim();
  return parseFloat(cleanedValue);
}

// MODIFIED: Corrected date parsing to be timezone-neutral (UTC).
function parseDate(dateValue: unknown): Date | null {
    if (!dateValue) return null;

    let localDate: Date;

    // Handle case where xlsx library already converted it to a Date object.
    // This is the most common case and the source of the previous error.
    if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) return null;
        localDate = dateValue;
    }
    // Handle Excel serial number format.
    else if (typeof dateValue === 'number' && dateValue > 0) {
        // Convert Excel serial date to a JS Date. 25569 is the day difference between Excel's 1900 epoch and Unix's 1970 epoch.
        localDate = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
    }
    // Handle string dates.
    else if (typeof dateValue === 'string') {
        const dateStr = dateValue.trim();
        // The `new Date()` constructor can be unreliable, but we can use it to get the components.
        // A string like '2024-07-24' is parsed as UTC, but '07/24/2024' is parsed as local.
        // By creating a UTC date from the components, we standardize the result.
        localDate = new Date(dateStr);
    }
    // If it's not a recognized type, return null.
    else {
        return null;
    }

    if (isNaN(localDate.getTime())) return null;

    // FIX: The core of the solution.
    // We take the year, month, and day from the potentially timezone-affected "localDate"
    // and use them to create a new Date object that is explicitly at midnight UTC.
    // This neutralizes the timezone of the server where the code is running.
    return new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()));
}


function findHeaderRow(rows: (string | number | null)[][]): { headerRow: (string|number|null)[], dataStartIndex: number } {
  for (let i = 0; i < rows.length; i++) {
    const lowercasedRow = rows[i].map(h => String(h || '').trim().toLowerCase());
    if (lowercasedRow.includes("date") && (lowercasedRow.includes("litres") || lowercasedRow.includes("driver") || lowercasedRow.includes("km") || lowercasedRow.includes("hrs") || lowercasedRow.includes("opening km"))) {
      return {
        headerRow: rows[i],
        dataStartIndex: i + 1,
      };
    }
  }
  return { headerRow: [], dataStartIndex: -1 };
}

// --- Specialized Parsers (No changes below this line) ---

function parseStandardKmSheet(jsonData: (string | number | null)[][], truckIdNum: number): TripInsert[] {
    const { headerRow, dataStartIndex } = findHeaderRow(jsonData);
    if (dataStartIndex === -1) return [];

    const headers = headerRow.map(h => String(h || '').trim().toLowerCase());
    const dateIndex = headers.indexOf('date');
    const odoIndex = headers.indexOf('opening km');
    const distanceIndex = headers.indexOf('km');
    const litresIndex = headers.indexOf('litres');
    const driverIndex = headers.indexOf('driver');

    const validRows: { date: Date; opening_km: number; distance_from_sheet: number; litres: number; driver: string; }[] = [];
    for (let i = dataStartIndex; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0 || row.every(cell => cell === null)) continue;
        
        const date = parseDate(row[dateIndex]);
        const odometer = cleanAndParseFloat(row[odoIndex]);
        const litres = cleanAndParseFloat(row[litresIndex]);

        if (date && (!isNaN(odometer) || !isNaN(litres))) {
            validRows.push({
                date,
                opening_km: odometer,
                distance_from_sheet: cleanAndParseFloat(row[distanceIndex]),
                litres: litres,
                driver: String(row[driverIndex] || 'N/A').trim(),
            });
        }
    }

    if (validRows.length === 0) return [];

    validRows.sort((a, b) => {
        if (a.date.getTime() !== b.date.getTime()) return a.date.getTime() - b.date.getTime();
        return a.opening_km - b.opening_km;
    });

    const trips: TripInsert[] = [];
    for (let i = 0; i < validRows.length; i++) {
        const currentRow = validRows[i];
        let totalKm = currentRow.distance_from_sheet;
        
        if (isNaN(currentRow.opening_km) && i > 0) {
            const prevRow = trips[i - 1];
            if (prevRow.closing_km) {
                currentRow.opening_km = prevRow.closing_km;
            }
        }

        if (isNaN(totalKm) || totalKm <= 0) {
            if (i < validRows.length - 1) {
                const nextRow = validRows[i + 1];
                if (!isNaN(nextRow.opening_km) && !isNaN(currentRow.opening_km)) {
                    totalKm = nextRow.opening_km - currentRow.opening_km;
                }
            } else {
                totalKm = 0;
            }
        }
        
        if (totalKm < 0) totalKm = 0;

        trips.push({
            truck_id: truckIdNum,
            trip_date: currentRow.date.toISOString(),
            opening_km: isNaN(currentRow.opening_km) ? null : currentRow.opening_km,
            total_km: totalKm,
            closing_km: isNaN(currentRow.opening_km) ? null : currentRow.opening_km + totalKm,
            liters_filled: isNaN(currentRow.litres) ? null : currentRow.litres,
            worker_name: currentRow.driver,
            is_hours_based: false,
        });
    }
    return trips;
}

function parseHoursSheet(jsonData: (string | number | null)[][], truckIdNum: number): TripInsert[] {
    const { headerRow, dataStartIndex } = findHeaderRow(jsonData);
    if (dataStartIndex === -1) return [];

    const headers = headerRow.map(h => String(h || '').trim().toLowerCase());
    const dateIndex = headers.indexOf('date');
    const odoIndex = headers.indexOf('opening hrs');
    const litresIndex = headers.indexOf('litres');
    const driverIndex = headers.indexOf('driver');

    const processedRows: { date: Date; odometer: number; originalRow: (string | number | null)[] }[] = [];
    for (let i = dataStartIndex; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0 || row.every(cell => cell === null)) continue;

        const date = parseDate(row[dateIndex]);
        const odometer = cleanAndParseFloat(row[odoIndex]);

        if (date && !isNaN(odometer)) {
            processedRows.push({ date, odometer, originalRow: row });
        }
    }

    if (processedRows.length < 2) return [];
    processedRows.sort((a, b) => a.date.getTime() - b.date.getTime());

    const trips: TripInsert[] = [];
    for (let i = 1; i < processedRows.length; i++) {
        const currentRow = processedRows[i];
        const previousRow = processedRows[i - 1];
        const distance = currentRow.odometer - previousRow.odometer;

        if (distance > 0) {
            const litres = cleanAndParseFloat(currentRow.originalRow[litresIndex]);
            const driver = driverIndex !== -1 ? String(currentRow.originalRow[driverIndex] || 'N/A').trim() : 'N/A';
            
            trips.push({
                truck_id: truckIdNum,
                trip_date: currentRow.date.toISOString(),
                opening_km: previousRow.odometer,
                total_km: distance,
                liters_filled: isNaN(litres) ? null : litres,
                worker_name: driver,
                is_hours_based: true,
            });
        }
    }
    return trips;
}

// --- Main Import Function ---

export async function handleImport(formData: FormData): Promise<{ success: boolean; message: string }> {
  'use server';

  const file = formData.get('file') as File;
  if (!file) {
    return { success: false, message: "No file uploaded." };
  }

  try {
    const supabase = await createClient();
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'buffer', cellDates: true });
    
    const importStartDate = new Date('2024-01-01');
    let totalTripsImported = 0;
    let trucksProcessed = 0;

    for (const sheetName of workbook.SheetNames) {
        const license_plate = sheetName.trim();
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const jsonData: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
        if (jsonData.length < 2) continue;

        const { data: truck, error: truckError } = await supabase
            .from('trucks')
            .upsert({ license_plate }, { onConflict: 'license_plate' })
            .select('id')
            .single();
        
        if (truckError || !truck) {
            console.error(`Error upserting truck ${license_plate}:`, truckError);
            continue;
        }
        trucksProcessed++;
        const truckIdNum = truck.id;

        let tripsToInsert: TripInsert[] = [];
        const lowerCaseReg = license_plate.toLowerCase();
        
        if (lowerCaseReg.includes('forklift') || lowerCaseReg.includes('lxc821mp')) {
            tripsToInsert = parseHoursSheet(jsonData, truckIdNum);
        } else {
            tripsToInsert = parseStandardKmSheet(jsonData, truckIdNum);
        }
        
        const finalTrips = tripsToInsert.filter(trip => trip.trip_date && new Date(trip.trip_date) >= importStartDate);

        if (finalTrips.length > 0) {
            const { data: existingTrips } = await supabase.from("truck_trips").select("trip_date, opening_km").eq("truck_id", truckIdNum);
            const existingTripSet = new Set(existingTrips?.map(t => `${new Date(t.trip_date!).toISOString().split('T')[0]}_${t.opening_km}`) || []);
            const newTrips = finalTrips.filter(trip => {
                const tripKey = `${new Date(trip.trip_date!).toISOString().split('T')[0]}_${trip.opening_km}`;
                return !existingTripSet.has(tripKey);
            });

            if (newTrips.length > 0) {
                const { error } = await supabase.from("truck_trips").insert(newTrips);
                if (error) {
                    console.error(`Error inserting trips for ${license_plate}:`, error.message);
                } else {
                    totalTripsImported += newTrips.length;
                }
            }
        }
    }

    return { success: true, message: `Import complete! Processed ${trucksProcessed} sheets and imported ${totalTripsImported} new trip records.` };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Import failed: ${errorMessage}` };
  }
}