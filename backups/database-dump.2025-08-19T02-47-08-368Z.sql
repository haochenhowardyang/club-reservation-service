-- Database dump created on 2025-08-19T02:47:08.375Z
-- Environment: Development
-- Admin email: haochenhowardyang@gmail.com

-- Table: email_whitelist (1 rows)
INSERT INTO email_whitelist (id, email, phone, created_at, updated_at) VALUES (1, 'haochenhowardyang@gmail.com', NULL, 1755464406, 1755464406);

-- Table: users (1 rows)
INSERT INTO users (email, name, image, phone, role, strikes, is_active, created_at, updated_at) VALUES ('haochenhowardyang@gmail.com', 'Haochen Yang', 'https://lh3.googleusercontent.com/a/ACg8ocJEwCvALy7JZO8UBeH703kMjEwnKCUWet-eACB4UHr4xkabKw=s96-c', NULL, 'admin', 0, 1, 1755570547000, 1755570547000);

-- Table: user (1 rows)
INSERT INTO user (id, email, name, image, role, phone, strikes, is_active, emailVerified) VALUES ('haochenhowardyang@gmail.com', 'haochenhowardyang@gmail.com', 'Haochen Yang', 'https://lh3.googleusercontent.com/a/ACg8ocJEwCvALy7JZO8UBeH703kMjEwnKCUWet-eACB4UHr4xkabKw=s96-c', 'admin', NULL, 0, 1, NULL);

