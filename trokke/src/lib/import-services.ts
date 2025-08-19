'use server';

import { createClient } from "@/utils/supabase/server";
import * as XLSX from 'xlsx';
import { type Database } from "@/types/supabase";

type ServiceInsert = Database['public']['Tables']['services']['Insert'];

// --- Helper Functions ---

function cleanAndParseFloat(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return NaN;
  if (typeof value === 'number') return value;
  // Updated to handle currency symbols and other non-numeric characters
  const cleanedValue = String(value).replace(/[R$,"',A-Z]/gi, "").trim();
  return parseFloat(cleanedValue);
}

function parseDate(dateValue: unknown): Date | null {
    if (!dateValue) return null;

    if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) return null;
        const d = dateValue;
        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    
    if (typeof dateValue === 'number' && dateValue > 0) {
        const d = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    }

    if (typeof dateValue === 'string') {
        const dateStr = dateValue.trim();
        const delimiter = dateStr.includes('/') ? '/' : (dateStr.includes('.') ? '.' : (dateStr.includes('-') ? '-' : null));
        
        if (delimiter) {
            const parts = dateStr.split(delimiter);
            if (parts.length === 3) {
                let day: number, month: number, year: number;

                if (parts[0].length === 4) { // yyyy/mm/dd or yyyy-mm-dd
                    year = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10);
                    day = parseInt(parts[2], 10);
                } else { // dd/mm/yyyy or dd.mm.yyyy
                    day = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10);
                    year = parseInt(parts[2], 10);
                }

                if (year < 100) year += 2000;

                if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
                    return new Date(Date.UTC(year, month - 1, day));
                }
            }
        }
        
        const localDate = new Date(dateStr);
        if (isNaN(localDate.getTime())) return null;
        return new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()));
    }
    
    return null;
}


function findHeaderRow(rows: (string | number | null)[][]): { headerRow: (string|number|null)[], dataStartIndex: number } {
  for (let i = 0; i < rows.length; i++) {
    const lowercasedRow = rows[i].map(h => String(h || '').trim().toLowerCase());
    if (lowercasedRow.includes("date") && (lowercasedRow.includes("supplier") || lowercasedRow.includes("opening km"))) {
      return { headerRow: rows[i], dataStartIndex: i + 1 };
    }
  }
  return { headerRow: [], dataStartIndex: -1 };
}

// --- Main Import Handler ---

export async function handleBulkServiceImport(formData: FormData): Promise<{ success: boolean; message: string }> {
    'use server';
    const file = formData.get('file') as File;
    if (!file) {
        return { success: false, message: "No file uploaded." };
    }

    try {
        const supabase = await createClient();
        const bytes = await file.arrayBuffer();
        const workbook = XLSX.read(bytes, { type: 'buffer', cellDates: true });

        let totalServicesImported = 0;
        let sheetsProcessed = 0;
        const importStartDate = new Date('2024-01-01T00:00:00.000Z');

        for (const sheetName of workbook.SheetNames) {
            const license_plate = sheetName.trim();
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;

            const { data: truck, error: truckError } = await supabase
                .from('trucks')
                .select('id')
                .eq('license_plate', license_plate)
                .single();

            if (truckError || !truck) {
                console.warn(`Skipping sheet: ${sheetName}. Truck with this license plate not found.`);
                continue;
            }
            
            sheetsProcessed++;
            const truckIdNum = truck.id;

            const jsonData: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            if (jsonData.length < 2) continue;

            const { headerRow, dataStartIndex } = findHeaderRow(jsonData);
            if (dataStartIndex === -1) continue;

            const headers = headerRow.map(h => String(h || '').trim().toLowerCase());
            const expenseDateIndex = headers.lastIndexOf('date');
            const openingKmIndex = headers.indexOf('opening km');
            const supplierIndex = headers.indexOf('supplier');
            const commentsIndex = headers.indexOf('comments');
            const expenseIndex = headers.indexOf('expense');
            const nextServiceIndex = headers.indexOf('next service');

            const servicesToInsert: ServiceInsert[] = [];
            const truckUpdatePayload: { next_service_km?: number, service_interval_km?: number } = {};

            for (let i = dataStartIndex; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0 || row.every(cell => cell === null)) continue;
                
                // --- NEW: Extract Service Interval ---
                const serviceIntervalRow = row.find(cell => typeof cell === 'string' && cell.toUpperCase().includes('SERVICE INTERVAL'));
                if (serviceIntervalRow) {
                    const interval = cleanAndParseFloat(serviceIntervalRow);
                    if (!isNaN(interval)) {
                        truckUpdatePayload.service_interval_km = interval;
                    }
                }
                // --- End of new section ---

                const expenseDate = parseDate(row[expenseDateIndex]);
                if (!expenseDate || expenseDate < importStartDate) continue;

                const expense = cleanAndParseFloat(row[expenseIndex]);
                const supplier = row[supplierIndex];
                const comments = row[commentsIndex];

                if (!isNaN(expense) && expense > 0 && (supplier || comments)) {
                    const searchText = `${String(supplier || '').toLowerCase()} ${String(comments || '').toLowerCase()}`;
                    const odoValue = cleanAndParseFloat(row[openingKmIndex]);
                    servicesToInsert.push({
                        truck_id: truckIdNum,
                        service_date: expenseDate.toISOString(),
                        odo_reading: isNaN(odoValue) ? null : odoValue,
                        supplier: String(supplier || ''),
                        comments: String(comments || ''),
                        expense_amount: expense,
                        oil_filter: searchText.includes('oil'),
                        diesel_filter: searchText.includes('diesel'),
                        air_filter: searchText.includes('air'),
                        tires: searchText.includes('tyre') || searchText.includes('tire'),
                        brakes: searchText.includes('brake') || searchText.includes('skim'),
                    });
                }
            }
            
            if (nextServiceIndex !== -1) {
                for (let i = jsonData.length - 1; i >= dataStartIndex; i--) {
                    const row = jsonData[i];
                    const nextServiceValue = cleanAndParseFloat(row[nextServiceIndex]);
                    if (!isNaN(nextServiceValue) && nextServiceValue > 0) {
                        truckUpdatePayload.next_service_km = nextServiceValue;
                        break;
                    }
                }
            }

            if (Object.keys(truckUpdatePayload).length > 0) {
                 const { error: updateError } = await supabase
                    .from('trucks')
                    .update(truckUpdatePayload)
                    .eq('id', truckIdNum);
                
                if (updateError) {
                    console.error(`Failed to update truck data for ${license_plate}:`, updateError);
                }
            }

            if (servicesToInsert.length > 0) {
                const { data: existingServices } = await supabase
                    .from('services')
                    .select('service_date, odo_reading, expense_amount')
                    .eq('truck_id', truckIdNum);

                const existingSet = new Set(existingServices?.map(s => `${new Date(s.service_date!).toISOString().split('T')[0]}_${s.odo_reading}_${s.expense_amount}`) || []);

                const newServices = servicesToInsert.filter(service => {
                    const serviceKey = `${new Date(service.service_date!).toISOString().split('T')[0]}_${service.odo_reading}_${service.expense_amount}`;
                    return !existingSet.has(serviceKey);
                });

                if (newServices.length > 0) {
                    const { error } = await supabase.from("services").insert(newServices);
                    if (error) {
                        console.error(`Error inserting services for ${license_plate}:`, error.message);
                    } else {
                        totalServicesImported += newServices.length;
                    }
                }
            }
        }

        return { success: true, message: `Import complete! Processed ${sheetsProcessed} sheets and imported ${totalServicesImported} new service records.` };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Import failed: ${errorMessage}` };
    }
}
