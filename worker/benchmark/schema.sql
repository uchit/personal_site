-- Tallies only. There is deliberately no submissions table: nothing here
-- represents a person, a session, or an event — only counts.
--
-- dimension is one of:
--   'meta'    bucket 'runs'        total completed submissions
--   'band'    bucket '1'..'5'      overall maturity band
--   'sector'  bucket sector key    self-selected sector
--   'day'     bucket YYYY-MM-DD    submissions per day
--   'cap:N'   bucket '1'..'5'      level chosen for capability N
CREATE TABLE IF NOT EXISTS tally (
  diagnostic TEXT NOT NULL,
  dimension  TEXT NOT NULL,
  bucket     TEXT NOT NULL,
  n          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (diagnostic, dimension, bucket)
);
