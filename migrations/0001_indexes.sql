-- Performance indexes for hot query paths.
-- Idempotent: IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" ("expires_at");
CREATE INDEX IF NOT EXISTS "orders_user_id_idx" ON "orders" ("user_id");
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" ("created_at");
CREATE INDEX IF NOT EXISTS "favorites_user_id_idx" ON "favorites" ("user_id");
CREATE INDEX IF NOT EXISTS "favorites_product_id_idx" ON "favorites" ("product_id");
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "personal_data_consents_user_id_idx" ON "personal_data_consents" ("user_id");
CREATE INDEX IF NOT EXISTS "login_attempts_email_idx" ON "login_attempts" ("email");
CREATE INDEX IF NOT EXISTS "login_attempts_created_at_idx" ON "login_attempts" ("created_at");
CREATE INDEX IF NOT EXISTS "commercial_proposal_files_user_id_idx" ON "commercial_proposal_files" ("user_id");
CREATE INDEX IF NOT EXISTS "commercial_proposal_files_proposal_id_idx" ON "commercial_proposal_files" ("proposal_id");
CREATE INDEX IF NOT EXISTS "contact_submissions_email_idx" ON "contact_submissions" ("email");
CREATE INDEX IF NOT EXISTS "contact_submissions_created_at_idx" ON "contact_submissions" ("created_at");
