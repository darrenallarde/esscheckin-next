-- Import all check-in records from the CSV data
-- Create check-ins for each row, matching to existing students

-- First, let's create a helper function to find student ID by name and phone
CREATE OR REPLACE FUNCTION find_student_id(p_first_name text, p_last_name text, p_phone text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  student_uuid uuid;
BEGIN
  -- Try to find by phone first (most reliable)
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    SELECT id INTO student_uuid 
    FROM public.students 
    WHERE phone_number = p_phone 
    LIMIT 1;
    
    IF student_uuid IS NOT NULL THEN
      RETURN student_uuid;
    END IF;
  END IF;
  
  -- If no phone match, try by name
  SELECT id INTO student_uuid 
  FROM public.students 
  WHERE LOWER(first_name) = LOWER(p_first_name) 
    AND (LOWER(last_name) = LOWER(COALESCE(p_last_name, '')) OR (last_name IS NULL AND p_last_name = ''))
  LIMIT 1;
  
  RETURN student_uuid;
END;
$$;

-- Insert all 123 check-in records from the CSV
WITH checkin_data AS (
  VALUES 
    ('2025-09-14 10:45:00', 'Julian', 'Allarde', '4084220238'),
    ('2025-09-14 10:50:00', 'Zia', 'Taylor', '4085317120'),
    ('2025-09-14 10:50:00', 'Mary', 'Tyshchenko', '6693027581'),
    ('2025-09-14 10:51:00', 'Allison', 'Smith', '4082035453'),
    ('2025-09-14 10:54:00', 'Danica', 'Dorflinger', '4086648961'),
    ('2025-09-14 11:01:00', 'Dillon', 'Dagelet', '4087726472'),
    ('2025-09-14 11:01:00', 'mica', 'Dagelet', '4083872875'),
    ('2025-09-14 11:02:00', 'Karl', 'Dorflinger', '4152794429'),
    ('2025-09-14 11:03:00', 'Roman', 'Bracamontes', '6692121266'),
    ('2025-09-14 11:12:00', 'Liam', 'Trinh', '6692628834'),
    ('2025-09-14 11:12:00', 'Josh', 'Brady', '6692628834'),
    ('2025-09-14 11:13:00', 'Jacob', '', '6692200150'),
    ('2025-09-14 11:17:00', 'Erin', 'Sonu', '6507728231'),
    ('2025-09-14 11:17:00', 'Asher', 'Leber', '8178512450'),
    ('2025-09-14 11:18:00', 'Lucca', 'Mohanrao', '4084422592'),
    ('2025-09-14 11:18:00', 'Noah', 'Ozel', '4084998660'),
    ('2025-09-14 11:18:00', 'Tyler', 'Santiago', '6504047091'),
    ('2025-09-14 11:19:00', 'Emi', 'Mohanrao', '4089639476'),
    ('2025-09-14 11:19:00', 'Zachary', 'Santiago', '6504047091'),
    ('2025-09-14 11:19:00', 'Olivia', 'Quiocho', '6509246206'),
    ('2025-09-14 11:19:00', 'Julietta', 'Ramirez', '4088169359'),
    ('2025-09-14 11:20:00', 'Mia', 'Quiocho', '6504770615'),
    ('2025-09-14 11:21:00', 'Kai', 'Darnell', '4084315708'),
    ('2025-09-17 18:28:00', 'Julian', 'Allarde', '4084220238'),
    ('2025-09-17 18:29:00', 'Gracelyn', 'Wu', '4085285401'),
    ('2025-09-17 18:29:00', 'Roman', 'Bracamontes', '6692121266'),
    ('2025-09-17 18:29:00', 'Karl', 'Dorflinger', '4152794429'),
    ('2025-09-17 18:29:00', 'Julietta', 'Ramirez', '4088169359'),
    ('2025-09-17 18:31:00', 'Julian', 'Allarde', '4084220238'),
    ('2025-09-17 18:31:00', 'Mary', 'Tyshchenko', '6693027581'),
    ('2025-09-17 18:32:00', 'Zia', 'Taylor', '4085317120'),
    ('2025-09-17 18:32:00', 'Liam', 'Trinh', '6692628834'),
    ('2025-09-17 18:34:00', 'Ava', 'Beas', '4088593801'),
    ('2025-09-17 18:34:00', 'Amaya', '', '6693493901'),
    ('2025-09-17 18:34:00', 'Cydney', '', '4086686194'),
    ('2025-09-17 18:35:00', 'Samuel', '', '4087182424'),
    ('2025-09-17 18:38:00', 'Mica', 'Dagelet', '4083872875'),
    ('2025-09-17 18:38:00', 'Dillon', 'Dagelet', '4087726472'),
    ('2025-09-17 18:45:00', 'Aidan', 'Wu', '4084894634'),
    ('2025-09-17 18:45:00', 'Hannah', 'Wu', '6503873186'),
    ('2025-09-17 18:47:00', 'Michael', 'Silva', '6692825798'),
    ('2025-09-17 18:50:00', 'Sophia', 'Watkins', '4086409224'),
    ('2025-09-17 18:53:00', 'Emily', '', '6692859855'),
    ('2025-09-17 18:59:00', 'Asher', 'Leber', '8178512450'),
    ('2025-09-17 19:03:00', 'Zach', 'Santiago', ''),
    ('2025-09-21 10:46:00', 'Julian', 'Allarde', '4084220238'),
    ('2025-09-21 10:51:00', 'Jeremy', 'Lee', '4089648303'),
    ('2025-09-21 10:54:00', 'Zia', 'Taylor', '4085317120'),
    ('2025-09-21 10:57:00', 'Roman', 'Bracamontes', '6692121266'),
    ('2025-09-21 10:58:00', 'Benjamin', '', '4082058433'),
    ('2025-09-21 11:02:00', 'Tyler', 'Santiago', '6504047091'),
    ('2025-09-21 11:02:00', 'Zach', 'Santiago', '6502075474'),
    ('2025-09-21 11:04:00', 'Kaylee', 'Smith', '6692889329'),
    ('2025-09-21 11:05:00', 'Lucca', 'Mohanrao', '4084422592'),
    ('2025-09-21 11:05:00', 'Emi', 'Mohanrao', '4089639476'),
    ('2025-09-21 11:09:00', 'Asher', 'Leber', '8178512450'),
    ('2025-09-21 11:10:00', 'Mica', 'Dagelet', '4083872875'),
    ('2025-09-21 11:10:00', 'Dillon', 'Dagelet', '4087726472'),
    ('2025-09-21 11:13:00', 'Mary', 'Tyshchenko', '6693927581'),
    ('2025-09-21 11:14:00', 'Danica', 'Dorflinger', '6086648961'),
    ('2025-09-21 11:16:00', 'Mili', '', '6506603204'),
    ('2025-09-21 11:17:00', 'Joshua', '', '9493399346'),
    ('2025-09-21 11:18:00', 'Mia', 'Quiocho', '6504770615'),
    ('2025-09-21 11:19:00', 'Olivia', 'Quiocho', '6509246206'),
    ('2025-09-21 11:22:00', 'Erin', 'Sonu', '6507728231'),
    ('2025-09-21 11:22:00', 'Cole', '', '4088926138'),
    ('2025-09-21 11:24:00', 'Arnan', '', '0'),
    ('2025-09-21 11:25:00', 'Elektra', 'Masegian', '4087690264'),
    ('2025-09-21 11:29:00', 'Jonathan', 'Ventura', '6507711736'),
    ('2025-09-24 18:23:00', 'Santiago', '', '4085099685'),
    ('2025-09-24 18:23:00', 'Luis', 'Study', '6696007957'),
    ('2025-09-24 18:24:00', 'Joshua', 'Brady', '9493399346'),
    ('2025-09-24 18:24:00', 'Julian', 'Allarde', '4084220238'),
    ('2025-09-24 18:25:00', 'Dillon', 'Dagelet', '4087726472'),
    ('2025-09-24 18:25:00', 'Mica', 'Daglet', '4083872875'),
    ('2025-09-24 18:27:00', 'Emily', '', '6692859855'),
    ('2025-09-24 18:28:00', 'Liam', 'Trinh', '6692628834'),
    ('2025-09-24 18:33:00', 'Cannon', '', '4173795150'),
    ('2025-09-24 18:33:00', 'Michael', '', '6692825798'),
    ('2025-09-24 18:37:00', 'Mary', 'Tyschenko', '6693927581'),
    ('2025-09-24 18:38:00', 'Julietta', 'Ramirez', '4088169359'),
    ('2025-09-24 18:38:00', 'Adrian', 'Joven', '4088767020'),
    ('2025-09-24 18:39:00', 'Jessica', '', '4082093668'),
    ('2025-09-24 18:41:00', 'Layla', 'Bentacourt', '4086300869'),
    ('2025-09-24 18:45:00', 'Karl', 'Dorflinger', '4152794429'),
    ('2025-09-24 18:46:00', 'Ava', 'Dorgliner', '4088593802'),
    ('2025-09-24 18:46:00', 'Amaya', '', '6693493901'),
    ('2025-09-24 18:47:00', 'Aidan', 'Wu', '4084894634'),
    ('2025-09-24 18:47:00', 'Hannah', 'Wu', '6503873186'),
    ('2025-09-24 18:51:00', 'Sophia', 'Watkins', '4086409224'),
    ('2025-09-24 18:54:00', 'Zachary', 'Santiago', ''),
    ('2025-09-24 18:54:00', 'Tyler', 'Santiago', '6504047091'),
    ('2025-09-24 18:55:00', 'Harlow', 'Hosmer', '6082159996'),
    ('2025-09-24 18:55:00', 'Caitlin', 'Brown', '6504363887'),
    ('2025-09-24 19:02:00', 'Derek', 'Gonzalez', '6506695611'),
    ('2025-09-24 19:04:00', 'Olivia', 'Quiocho', '6509246206'),
    ('2025-09-24 19:04:00', 'Mia', 'Quiocho', '6504776015'),
    ('2025-09-24 19:09:00', 'Asher', 'Leber', '8178512450'),
    ('2025-09-24 19:11:00', 'Gracelyn', 'Wu', '4085285401'),
    ('2025-09-28 09:27:00', 'Joaquin', '', '4083732818'),
    ('2025-09-28 09:33:00', 'Roman', 'Bracamontes', '6692121266'),
    ('2025-09-28 09:49:00', 'Julian', '', '4084220238'),
    ('2025-09-28 10:37:00', 'Allison', 'Smith', '4082035453'),
    ('2025-09-28 10:38:00', 'Mary', 'Tyshchenko', '6693027581'),
    ('2025-09-28 10:48:00', 'Darren', 'Allarde', '6503465544'),
    ('2025-09-28 10:48:00', 'Jeremy', 'Lee', '4089648303'),
    ('2025-09-28 10:52:00', 'Amos', '', '4089915783'),
    ('2025-09-28 10:52:00', 'Roman', 'Villanueva', '6502707010'),
    ('2025-09-28 10:55:00', 'Kaylee', 'Smith', '6692889329'),
    ('2025-09-28 11:00:00', 'Kai', 'Darnell', '4084315708'),
    ('2025-09-28 11:01:00', 'Olivia', 'Quiocho', '6509246206'),
    ('2025-09-28 11:01:00', 'Mia', 'Quiocho', '6504770615'),
    ('2025-09-28 11:04:00', 'Mica', 'Dagelet', '4087726472'),
    ('2025-09-28 11:04:00', 'Dillon', 'Dagelet', '4087726472'),
    ('2025-09-28 11:04:00', 'Jacob', '', '6692046507'),
    ('2025-09-28 11:10:00', 'Jonathan', 'Ventura', '6507711736'),
    ('2025-09-28 11:11:00', 'Gracelyn', 'Wu', '4085285401'),
    ('2025-09-28 11:11:00', 'Caitlin', 'Brown', '6504363887'),
    ('2025-09-28 11:14:00', 'Ava', 'Beas', '4088593802'),
    ('2025-09-28 11:15:00', 'Amaya', '', '6693493901'),
    ('2025-09-28 11:16:00', 'Joshua', 'B', '9493399346'),
    ('2025-09-28 11:16:00', 'Karl', 'Dorflinger', '4152794429'),
    ('2025-09-28 11:21:00', 'Mili', '', '6506603204')
)
INSERT INTO public.check_ins (student_id, checked_in_at)
SELECT 
  find_student_id(first_name, last_name, phone), 
  timestamp::timestamp with time zone
FROM (
  SELECT 
    column1 as timestamp,
    column2 as first_name, 
    column3 as last_name, 
    column4 as phone
  FROM checkin_data
) AS parsed_data
WHERE find_student_id(first_name, last_name, phone) IS NOT NULL;

-- Clean up the helper function
DROP FUNCTION find_student_id(text, text, text);