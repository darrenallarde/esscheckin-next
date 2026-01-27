import { supabase } from "@/integrations/supabase/client";

// Default organization ID from the SQL migration
const DEFAULT_ORG_ID = "a0000000-0000-0000-0000-000000000001";

interface CheckinRecord {
  date: string; // M/D/YYYY format
  firstName: string;
  lastName: string;
  phone: string;
  grade: string;
}

interface ImportResult {
  student: string;
  success: boolean;
  action?: string; // 'created_student', 'found_student', 'checked_in', 'student_not_found'
  error?: string;
  checkinDate?: string;
  studentData?: CheckinRecord; // Keep original data for creating new students
}

/**
 * Parse check-in CSV data
 * Format: Proper time,First name,Last name,Phone,Grade
 */
export const parseCheckinCSV = (csvText: string): CheckinRecord[] => {
  const lines = csvText.split('\n');
  const records: CheckinRecord[] = [];

  // Skip header row (index 0) and BOM if present
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length >= 5) {
      const date = parts[0]?.trim();
      const firstName = parts[1]?.trim();
      const lastName = parts[2]?.trim() || '';
      const phone = parts[3]?.trim() || '';
      const grade = parts[4]?.trim() || '';

      if (date && firstName) {
        records.push({
          date,
          firstName,
          lastName,
          phone,
          grade
        });
      }
    }
  }

  return records;
};

/**
 * Normalize phone number - remove all non-digits
 */
const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Parse date from M/D/YYYY format to ISO timestamp
 * Assumes check-ins happen at 6:30 PM Pacific
 */
const parseCheckinDate = (dateStr: string): string => {
  const [month, day, year] = dateStr.split('/').map(n => parseInt(n));
  // Create date at 6:30 PM Pacific (18:30)
  const date = new Date(year, month - 1, day, 18, 30, 0);
  return date.toISOString();
};

/**
 * Find student record (does NOT create new students)
 * Priority: Phone number first, then fallback to name matching
 */
const findStudent = async (record: CheckinRecord): Promise<{ studentId: string | null; action: string; error?: string }> => {
  const normalizedPhone = normalizePhone(record.phone);

  // FIRST: Try to find by phone number only (most reliable)
  if (normalizedPhone) {
    const { data: phoneMatch, error: phoneError } = await supabase
      .from('students')
      .select('id, first_name')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (phoneError) {
      console.error('Error searching by phone:', phoneError);
      return { studentId: null, action: 'error', error: phoneError.message };
    }

    if (phoneMatch) {
      // Found by phone - log if name doesn't match (possible data issue)
      if (!phoneMatch.first_name.toLowerCase().includes(record.firstName.toLowerCase())) {
        console.warn(`Phone match found but name mismatch: CSV says "${record.firstName}", DB has "${phoneMatch.first_name}"`);
      }
      return { studentId: phoneMatch.id, action: 'found_student' };
    }
  }

  // FALLBACK: Try to find by first name only (less reliable, but better than nothing)
  const { data: nameMatch, error: nameError } = await supabase
    .from('students')
    .select('id')
    .ilike('first_name', record.firstName)
    .maybeSingle();

  if (nameError) {
    console.error('Error searching by name:', nameError);
    return { studentId: null, action: 'error', error: nameError.message };
  }

  if (nameMatch) {
    console.warn(`Found student by name only (no phone match): ${record.firstName}`);
    return { studentId: nameMatch.id, action: 'found_student' };
  }

  // Student doesn't exist - skip them
  return { studentId: null, action: 'student_not_found', error: 'Student not found in database' };
};

/**
 * Create check-in record for a student
 * Uses the import_historical_checkin function for importing past check-ins
 */
const createCheckin = async (studentId: string, checkinDate: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Call the import_historical_checkin function with the specific timestamp
    const { data, error } = await supabase.rpc('import_historical_checkin', {
      p_student_id: studentId,
      p_checkin_timestamp: checkinDate
    });

    if (error) {
      console.error('Error creating check-in:', error);
      return { success: false, error: error.message };
    }

    // Check the result
    if (data && data.length > 0) {
      const result = data[0];
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error creating check-in:', err);
    return { success: false, error: err.message || 'Unexpected error' };
  }
};

/**
 * Create a new student and check them in
 */
export const createStudentAndCheckin = async (record: CheckinRecord): Promise<{ success: boolean; error?: string; studentId?: string }> => {
  const normalizedPhone = normalizePhone(record.phone);

  try {
    // Create new student
    const { data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert({
        organization_id: DEFAULT_ORG_ID,
        first_name: record.firstName,
        last_name: record.lastName || '', // Empty string if no last name
        phone_number: normalizedPhone || null,
        grade: record.grade || null,
        user_type: 'student'
      })
      .select('id')
      .single();

    if (insertError || !newStudent) {
      return { success: false, error: insertError?.message || 'Failed to create student' };
    }

    // Create check-in for the new student
    const checkinDate = parseCheckinDate(record.date);
    const { success: checkinSuccess, error: checkinError } = await createCheckin(newStudent.id, checkinDate);

    if (!checkinSuccess) {
      return { success: false, error: `Student created but check-in failed: ${checkinError}`, studentId: newStudent.id };
    }

    return { success: true, studentId: newStudent.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected error' };
  }
};

/**
 * Import check-ins from CSV
 */
export const importCheckinsFromCSV = async (csvText: string) => {
  console.log('Starting check-in import process...');

  // Step 1: Parse CSV data
  const records = parseCheckinCSV(csvText);
  console.log(`Parsed ${records.length} check-in records from CSV`);

  const results: ImportResult[] = [];
  let studentsFound = 0;
  let studentsNotFound = 0;
  let checkinsCreated = 0;
  let errors = 0;

  // Step 2: Process each check-in record
  for (const record of records) {
    const studentName = `${record.firstName} ${record.lastName}`.trim();

    try {
      // Find student (skip if not found)
      const { studentId, action, error: studentError } = await findStudent(record);

      if (!studentId) {
        // Student not found - save for potential creation
        if (action === 'student_not_found') {
          results.push({
            student: studentName,
            success: false,
            action: 'student_not_found',
            error: 'Student not found - could be created',
            checkinDate: record.date,
            studentData: record
          });
          studentsNotFound++;
          continue;
        }

        // Actual error
        results.push({
          student: studentName,
          success: false,
          error: studentError || 'Failed to find student'
        });
        errors++;
        continue;
      }

      studentsFound++;

      // Create check-in with the date from CSV
      const checkinDate = parseCheckinDate(record.date);
      const { success: checkinSuccess, error: checkinError } = await createCheckin(studentId, checkinDate);

      if (!checkinSuccess) {
        results.push({
          student: studentName,
          success: false,
          action: 'found_student',
          error: `Student found but check-in failed: ${checkinError}`
        });
        errors++;
        continue;
      }

      checkinsCreated++;
      results.push({
        student: studentName,
        success: true,
        action: 'found_student',
        checkinDate: record.date
      });

    } catch (err: any) {
      console.error(`Error processing ${studentName}:`, err);
      results.push({
        student: studentName,
        success: false,
        error: err.message || 'Unexpected error'
      });
      errors++;
    }
  }

  console.log(`Import complete:`);
  console.log(`- Total records: ${records.length}`);
  console.log(`- Students found: ${studentsFound}`);
  console.log(`- Students not found (skipped): ${studentsNotFound}`);
  console.log(`- Check-ins created: ${checkinsCreated}`);
  console.log(`- Errors: ${errors}`);

  return {
    total: records.length,
    studentsFound,
    studentsNotFound,
    checkinsCreated,
    errors,
    results
  };
};
