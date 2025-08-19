-- Database dump created on 2025-08-19T02:49:58.473Z
-- Environment: Development
-- Admin email: haochenhowardyang@gmail.com

-- Table: user (1 rows)
INSERT INTO user (id, email, name, emailVerified, image, phone, role, strikes, is_active) VALUES ('d9cc879c-7813-4a62-80e5-b26c213ab8cf', 'haochenhowardyang@gmail.com', 'Haochen Yang', NULL, 'https://lh3.googleusercontent.com/a/ACg8ocJEwCvALy7JZO8UBeH703kMjEwnKCUWet-eACB4UHr4xkabKw=s96-c', NULL, 'admin', 0, 1);

-- Table: users (1 rows)
INSERT INTO users (email, name, image, phone, role, strikes, is_active, created_at, updated_at) VALUES ('haochenhowardyang@gmail.com', 'Haochen Yang', 'https://lh3.googleusercontent.com/a/ACg8ocJEwCvALy7JZO8UBeH703kMjEwnKCUWet-eACB4UHr4xkabKw=s96-c', NULL, 'admin', 0, 1, 1755571714, 1755571714);

-- Table: email_whitelist (1 rows)
INSERT INTO email_whitelist (id, email, phone, added_by, is_phone_verified, marketing_opt_in, created_at, updated_at) VALUES (1, 'haochenhowardyang@gmail.com', NULL, 'admin', 0, 1, 1755571651958, 1755571651958);

