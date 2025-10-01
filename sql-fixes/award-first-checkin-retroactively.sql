-- Award "Welcome to the Family" achievement to all students who have checked in but don't have it
-- This is a one-time retroactive fix for existing students

DO $$
DECLARE
  v_student RECORD;
  v_awarded BOOLEAN;
BEGIN
  -- Loop through all students who have at least one check-in
  FOR v_student IN
    SELECT DISTINCT s.id
    FROM students s
    INNER JOIN check_ins ci ON ci.student_id = s.id
    WHERE NOT EXISTS (
      -- Only students who don't already have this achievement
      SELECT 1 FROM student_achievements sa
      WHERE sa.student_id = s.id
      AND sa.achievement_id = 'first_checkin'
    )
  LOOP
    -- Award the achievement
    SELECT unlock_achievement(
      v_student.id,
      'first_checkin',
      'Welcome to the Family!',
      'Your very first check-in',
      '🎉',
      50,
      'common'
    ) INTO v_awarded;

    -- Log if awarded
    IF v_awarded THEN
      RAISE NOTICE 'Awarded "Welcome to the Family" to student: %', v_student.id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Retroactive achievement award complete!';
END $$;

-- Check how many students now have the achievement
SELECT COUNT(*) as students_with_first_checkin
FROM student_achievements
WHERE achievement_id = 'first_checkin';
