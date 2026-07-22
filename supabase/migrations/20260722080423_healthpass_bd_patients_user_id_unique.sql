/*
# HealthPass BD — Add unique constraint on patients.user_id

## Overview
Prevents duplicate patient rows for the same user. The Dashboard's auto-create
logic was inserting a new row on every load when the query returned multiple
rows (because .maybeSingle() errors on >1 row, causing the code to think no
row existed). A unique constraint makes this impossible.

## Security
No policy changes. The existing insert_own_patient RLS policy still applies.
*/

-- Add unique constraint on user_id to prevent duplicate patient rows
CREATE UNIQUE INDEX IF NOT EXISTS patients_user_id_unique ON patients(user_id);
