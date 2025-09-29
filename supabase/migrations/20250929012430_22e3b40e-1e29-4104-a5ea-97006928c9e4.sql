-- First make last_name nullable to support single names
ALTER TABLE students ALTER COLUMN last_name DROP NOT NULL;

-- Add index on phone_number for better lookup performance
CREATE INDEX IF NOT EXISTS idx_students_phone_number ON students(phone_number);

-- Now import the data with proper NULL handling for single names
DO $$
DECLARE
  csv_rows text[] := ARRAY[
    '9/14/2025 10:45,Julian,14084220238,6',
    '9/14/2025 10:50,Zia Taylor,4085317120,11',
    '9/14/2025 10:50,Mary Tyshchenko,6693027581,6',
    '9/14/2025 10:51,Allison Smith,4082035453,6',
    '9/14/2025 10:54,Danica,4086648961,7',
    '9/14/2025 11:01,Dillon,4087726472,10',
    '9/14/2025 11:01,mica,4083872875,6',
    '9/14/2025 11:02,Karl,4152794429,11',
    '9/14/2025 11:03,Roman bracamontes,6692121266,6',
    '9/14/2025 11:12,Liam Trinh,6692628834,12',
    '9/14/2025 11:12,Josh Brady,9493399346,10',
    '9/14/2025 11:13,Jacob,6692200150,7',
    '9/14/2025 11:17,Erin Sonu,6507728231,12',
    '9/14/2025 11:17,Asher,8178512450,6',
    '9/14/2025 11:18,Lucca,4084422592,9',
    '9/14/2025 11:18,Noah Ozel,4084998660,7',
    '9/14/2025 11:18,Tyler Santiago,6504047091,8',
    '9/14/2025 11:19,Emi,4089639476,10',
    '9/14/2025 11:19,Zachary santiago,6504047091,6',
    '9/14/2025 11:19,Olivia,6509246206,12',
    '9/14/2025 11:19,Julietta,4088169359,12',
    '9/14/2025 11:20,Mia,6504770615,8',
    '9/14/2025 11:21,Kai darnell,4084315708,8',
    '9/17/2025 18:28,Gracelyn,4085285401,6',
    '9/17/2025 18:29,Roman,6692121266,6',
    '9/17/2025 18:29,Karl,4152794429,11',
    '9/17/2025 18:29,Julietta,4088169359,12',
    '9/17/2025 18:31,Julian,4084220238,6',
    '9/17/2025 18:31,Mary tyshchenko,6693027581,6',
    '9/17/2025 18:32,Zia Taylor,4085317120,11',
    '9/17/2025 18:32,Liam t,6692628834,12',
    '9/17/2025 18:34,Ava,4088593801,8',
    '9/17/2025 18:34,Amaya,6693493901,7',
    '9/17/2025 18:34,Cydney,4086686194,8',
    '9/17/2025 18:35,Samuel,4087182424,11',
    '9/17/2025 18:38,Mica,4083872875,6',
    '9/17/2025 18:38,Dillon,4087726472,10',
    '9/17/2025 18:45,Aidan,4084894634,12',
    '9/17/2025 18:45,Hannah,6503873186,9',
    '9/17/2025 18:47,Michael Silva,6692825798,9',
    '9/17/2025 18:50,Sophia Watkins,4086409224,12',
    '9/17/2025 18:53,Emily,6692859855,9',
    '9/17/2025 18:59,Asher,8178512450,6',
    '9/21/2025 10:46,Julian,4084220238,6',
    '9/21/2025 10:51,Jeremy,4089648303,0',
    '9/21/2025 10:54,Zia Taylor,4085317120,11',
    '9/21/2025 10:57,Roman,6692121266,6',
    '9/21/2025 10:58,Benjamin,4082058433,6',
    '9/21/2025 11:02,Tyler Santiago,6504047091,8',
    '9/21/2025 11:02,Zach,6502075474,6',
    '9/21/2025 11:04,Kaylee,6692889329,10',
    '9/21/2025 11:05,Lucca Mohanrao,4084422592,9',
    '9/21/2025 11:05,Emi,4089639476,10',
    '9/21/2025 11:09,Asher,8178512450,6',
    '9/21/2025 11:10,Mica,4083872875,6',
    '9/21/2025 11:10,Dillon Dagelet,4087726472,10',
    '9/21/2025 11:16,Mili,6506603204,6',
    '9/21/2025 11:17,Joshua,9493399346,10',
    '9/21/2025 11:18,Quiocho,6504770615,8',
    '9/21/2025 11:19,Olivia Quiocho,6509246206,12',
    '9/21/2025 11:22,Erin Sonu,6507728231,12',
    '9/21/2025 11:25,Kyle Kang,6692889329,10',
    '9/21/2025 11:25,Hannah,6503873186,9',
    '9/21/2025 11:26,Joshua,9493399346,10',
    '9/21/2025 11:27,Aubrey,6503873186,9',
    '9/21/2025 11:29,Zachary santiago,6504047091,6',
    '9/21/2025 11:30,Rachel,4088445966,12',
    '9/21/2025 11:30,Aidan,4084894634,12',
    '9/21/2025 11:31,David Valderrama,4089648303,0',
    '9/21/2025 11:32,Jase,6692889329,10',
    '9/21/2025 11:33,Mia,6504770615,8',
    '9/21/2025 11:35,Leo,8169154056,11',
    '9/21/2025 11:36,Ezra,9257301779,12',
    '9/21/2025 11:37,Sophia Watkins,4086409224,12',
    '9/21/2025 11:39,Benjamin,4082058433,6',
    '9/21/2025 11:41,Amelia Kang,6692889329,10',
    '9/21/2025 11:42,Luke,4088445966,12',
    '9/21/2025 11:44,Noah Ozel,4084998660,7',
    '9/21/2025 11:44,Amaya,6693493901,7',
    '9/21/2025 11:45,Emily,6692859855,9',
    '9/21/2025 11:46,Samuel,4087182424,11',
    '9/21/2025 11:47,Cydney,4086686194,8',
    '9/21/2025 11:48,Michael Silva,6692825798,9',
    '9/21/2025 18:32,Caleb,4083390734,10',
    '9/21/2025 18:33,Caleb,4083390734,10',
    '9/21/2025 18:45,Nathan,6502075474,10',
    '9/24/2025 18:26,Roman,6692121266,6',
    '9/24/2025 18:27,Julian,4084220238,6',
    '9/24/2025 18:27,Zia Taylor,4085317120,11',
    '9/24/2025 18:28,Dillon,4087726472,10',
    '9/24/2025 18:28,Mica,4083872875,6',
    '9/24/2025 18:29,Asher,8178512450,6',
    '9/24/2025 18:29,Karl,4152794429,11',
    '9/24/2025 18:30,Lucca,4084422592,9',
    '9/24/2025 18:30,Mary tyshchenko,6693027581,6',
    '9/24/2025 18:31,Julietta,4088169359,12',
    '9/24/2025 18:31,Tyler Santiago,6504047091,8',
    '9/24/2025 18:31,Liam t,6692628834,12',
    '9/24/2025 18:32,Nathan,6502075474,10',
    '9/24/2025 18:32,Zachary santiago,6504047091,6',
    '9/24/2025 18:32,Olivia,6509246206,12',
    '9/24/2025 18:33,Kai darnell,4084315708,8',
    '9/24/2025 18:34,Mia,6504770615,8',
    '9/24/2025 18:35,Erin Sonu,6507728231,12',
    '9/24/2025 18:36,Jeremy,4089648303,0',
    '9/24/2025 18:38,Benjamin,4082058433,6',
    '9/24/2025 18:39,Josh Brady,9493399346,10',
    '9/24/2025 18:40,Ava,4088593801,8',
    '9/24/2025 18:41,Amaya,6693493901,7',
    '9/24/2025 18:41,Cydney,4086686194,8',
    '9/24/2025 18:42,Samuel,4087182424,11',
    '9/24/2025 18:43,Hannah,6503873186,9',
    '9/24/2025 18:44,Michael Silva,6692825798,9',
    '9/24/2025 18:45,Sophia Watkins,4086409224,12',
    '9/24/2025 18:46,Aidan,4084894634,12',
    '9/24/2025 18:48,Emily,6692859855,9',
    '9/24/2025 18:49,Aubrey,6503873186,9',
    '9/24/2025 18:50,Rachel,4088445966,12',
    '9/24/2025 18:51,Luke,4088445966,12',
    '9/24/2025 18:52,Noah Ozel,4084998660,7',
    '9/24/2025 18:53,Leo,8169154056,11',
    '9/24/2025 18:54,Ezra,9257301779,12',
    '9/24/2025 18:55,Caleb,4083390734,10'
  ];
  
  row_data text;
  row_parts text[];
  clean_phone text;
  name_parts text[];
  first_name_val text;
  last_name_val text;
  student_id_val uuid;
  checkin_timestamp timestamp;
  grade_val text;
BEGIN
  -- Process each row
  FOREACH row_data IN ARRAY csv_rows
  LOOP
    -- Split CSV line by comma
    row_parts := string_to_array(row_data, ',');
    
    -- Clean phone number - extract only digits
    clean_phone := regexp_replace(row_parts[3], '[^0-9]', '', 'g');
    
    -- Skip if phone number is invalid (less than 10 digits)
    IF length(clean_phone) < 10 THEN
      CONTINUE;
    END IF;
    
    -- Parse name - split on space for first/last name
    name_parts := string_to_array(trim(row_parts[2]), ' ');
    
    IF array_length(name_parts, 1) >= 2 THEN
      -- Has space - split into first and last name
      first_name_val := trim(name_parts[1]);
      last_name_val := trim(name_parts[2]);
    ELSE
      -- Single name - put in first_name, leave last_name null
      first_name_val := trim(row_parts[2]);
      last_name_val := NULL;
    END IF;
    
    -- Parse grade
    grade_val := CASE 
      WHEN row_parts[4] = '0' THEN 'Adult'
      ELSE row_parts[4]
    END;
    
    -- Parse timestamp (M/d/yyyy H:mm format)
    BEGIN
      checkin_timestamp := to_timestamp(row_parts[1], 'MM/DD/YYYY HH24:MI');
    EXCEPTION
      WHEN OTHERS THEN
        checkin_timestamp := now();
    END;
    
    -- Insert or update student record
    INSERT INTO students (first_name, last_name, phone_number, grade, user_type)
    VALUES (first_name_val, last_name_val, clean_phone, grade_val, 'student')
    ON CONFLICT (phone_number) 
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      grade = EXCLUDED.grade,
      updated_at = now()
    RETURNING id INTO student_id_val;
    
    -- Get student ID if it was an update
    IF student_id_val IS NULL THEN
      SELECT id INTO student_id_val FROM students WHERE phone_number = clean_phone;
    END IF;
    
    -- Insert check-in record with original timestamp
    INSERT INTO check_ins (student_id, checked_in_at)
    VALUES (student_id_val, checkin_timestamp);
    
  END LOOP;
  
  RAISE NOTICE 'Successfully imported % student check-in records', array_length(csv_rows, 1);
END $$;