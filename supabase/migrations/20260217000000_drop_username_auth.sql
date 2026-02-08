-- Drop username/password auth infrastructure
-- Username/password auth has been removed in favor of Phone OTP + Email OTP only.
-- Existing username/password users can still sign in via phone or email OTP.

DROP FUNCTION IF EXISTS check_username_available(UUID, TEXT);
DROP FUNCTION IF EXISTS find_profile_for_signup(UUID, TEXT);
DROP TABLE IF EXISTS student_auth_usernames;
