import { supabase } from "@/integrations/supabase/client";

interface StudentRecord {
  firstName: string;
  lastName: string;
  phone: string;
  grade: string;
}

export const parseCSVData = (csvText: string): StudentRecord[] => {
  const lines = csvText.split('\n');
  const records: StudentRecord[] = [];
  
  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma and handle potential edge cases
    const parts = line.split(',');
    if (parts.length >= 5) {
      const firstName = parts[1]?.trim();
      const lastName = parts[2]?.trim() || null;
      const phone = parts[3]?.trim() || null;
      const grade = parts[4]?.trim();
      
      if (firstName) {
        records.push({
          firstName,
          lastName: lastName || '',
          phone: phone || '',
          grade: grade || ''
        });
      }
    }
  }
  
  return records;
};

export const getUniqueStudents = (records: StudentRecord[]): StudentRecord[] => {
  const uniqueMap = new Map<string, StudentRecord>();
  
  for (const record of records) {
    // Create a unique key based on first name, last name, and phone
    // Use normalized phone (remove non-digits) for better matching
    const normalizedPhone = record.phone.replace(/\D/g, '');
    const key = `${record.firstName.toLowerCase()}-${record.lastName.toLowerCase()}-${normalizedPhone}`;
    
    // If we haven't seen this combination before, or if the current record has more complete data
    if (!uniqueMap.has(key) || 
        (record.lastName && !uniqueMap.get(key)?.lastName) ||
        (record.phone && !uniqueMap.get(key)?.phone)) {
      uniqueMap.set(key, {
        ...record,
        phone: normalizedPhone // Store normalized phone
      });
    }
  }
  
  return Array.from(uniqueMap.values());
};

export const insertStudentsIntoDB = async (students: StudentRecord[]) => {
  const results = [];
  
  console.log(`Inserting ${students.length} unique students into database...`);
  
  for (const student of students) {
    try {
      const { data, error } = await supabase
        .from('students')
        .insert({
          first_name: student.firstName,
          last_name: student.lastName || null,
          phone_number: student.phone || null,
          grade: student.grade || null,
          user_type: 'student'
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Error inserting student ${student.firstName} ${student.lastName}:`, error);
        results.push({ 
          student: `${student.firstName} ${student.lastName}`, 
          success: false, 
          error: error.message 
        });
      } else {
        console.log(`Successfully inserted: ${student.firstName} ${student.lastName}`);
        results.push({ 
          student: `${student.firstName} ${student.lastName}`, 
          success: true, 
          id: data.id 
        });
      }
    } catch (err) {
      console.error(`Unexpected error inserting student ${student.firstName} ${student.lastName}:`, err);
      results.push({ 
        student: `${student.firstName} ${student.lastName}`, 
        success: false, 
        error: 'Unexpected error' 
      });
    }
  }
  
  return results;
};

export const importStudentsFromCSV = async (csvText: string) => {
  console.log('Starting student import process...');
  
  // Step 1: Parse CSV data
  const allRecords = parseCSVData(csvText);
  console.log(`Parsed ${allRecords.length} total records from CSV`);
  
  // Step 2: Get unique students
  const uniqueStudents = getUniqueStudents(allRecords);
  console.log(`Found ${uniqueStudents.length} unique students`);
  
  // Step 3: Insert into database
  const results = await insertStudentsIntoDB(uniqueStudents);
  
  // Step 4: Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Import complete: ${successful} successful, ${failed} failed`);
  
  return {
    total: uniqueStudents.length,
    successful,
    failed,
    results
  };
};