-- Add video_url directly to submissions.
-- Previously this was stored in opt_ins.video_url (tied to catalog opt-in).
-- Now decoupled: reviewer always needs the URL regardless of catalog intent.
-- Nullable so existing submissions are not broken.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Backfill from opt_ins for any submissions that have one
UPDATE submissions s
SET video_url = o.video_url
FROM opt_ins o
WHERE o.submission_id = s.id
  AND o.video_url IS NOT NULL
  AND s.video_url IS NULL;
