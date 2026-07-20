-- 003 — make the geography tables able to hold the whole country.
--
-- 001 shipped with two regions in mind, and three of its choices only work
-- at that size. Each is fixed here, and none of them touches a figure.
--
--   1. `states.kind` allowed 'state' and 'ut_with_legislature'. That covers
--      31 of the 36 entries. The other five — Andaman and Nicobar Islands,
--      Chandigarh, Dadra and Nagar Haveli and Daman and Diu, Ladakh,
--      Lakshadweep — have no legislature and therefore no budget of their
--      own to vote. Filing them as 'state' would say they do, so they get
--      their own value. The distinction is load-bearing rather than
--      decorative: it is exactly the set of regions for which no
--      state_sector_budgets row will ever exist, and the page has to be able
--      to say why the money blocks are empty.
--
--   2. `districts.slug` was globally UNIQUE. India has 780-odd districts and
--      the names collide freely — Aurangabad is in both Bihar and
--      Maharashtra, Hamirpur in both Himachal Pradesh and Uttar Pradesh,
--      Bilaspur in both Himachal Pradesh and Chhattisgarh. A global unique
--      index would have made the second one of each pair unloadable. Slugs
--      are now unique per state, which is what the URL already assumed:
--      /uttarakhand/dehradun names the state before the district.
--
--   3. Neither table had a stable identifier, so the only handle on a row was
--      its name. District names change (Allahabad → Prayagraj) and districts
--      are created by bifurcation several times a year. `lgd_code` is the
--      Local Government Directory's own code, which survives a rename, so a
--      re-fetch updates the row it should instead of orphaning it and
--      inserting a twin.
--
-- Nothing here destroys data: the existing 2 states and 18 areas keep their
-- ids, names and slugs, and their lgd_code is filled in by the geography
-- loader rather than by this file.

-- ------------------------------------------------------------ states.kind

ALTER TABLE states DROP CONSTRAINT IF EXISTS states_kind_check;

ALTER TABLE states ADD CONSTRAINT states_kind_check
  CHECK (kind IN ('state', 'ut_with_legislature', 'ut_without_legislature'));

-- ------------------------------------------------------------- lgd codes

ALTER TABLE states    ADD COLUMN IF NOT EXISTS lgd_code INTEGER;
ALTER TABLE districts ADD COLUMN IF NOT EXISTS lgd_code INTEGER;

-- Nullable, because the two seeded states predate the loader and are matched
-- into by slug on its first run, and because Delhi's urban local bodies are
-- not LGD districts and never get a code. Unique so that a code cannot be
-- attached to two rows, which is the failure that would silently merge two
-- districts.
--
-- Not partial. `WHERE lgd_code IS NOT NULL` would read as the tighter
-- statement of intent, but Postgres will not infer a partial index as an
-- ON CONFLICT target, and the geography loader's upsert is the entire reason
-- these exist. A plain unique index gives the same guarantee here anyway:
-- NULLs are distinct from one another, so the ULB rows are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS states_lgd_code_idx    ON states (lgd_code);
CREATE UNIQUE INDEX IF NOT EXISTS districts_lgd_code_idx ON districts (lgd_code);

-- ------------------------------------------------------- district vintage

-- The date the district came into existence, as LGD records it. Districts are
-- created constantly — Goa gained Kushavati and Delhi gained three units in
-- December 2025 — and a district younger than a document cannot appear in it.
-- Without this column, "no figures for Kushavati" and "we failed to load
-- Kushavati's figures" look identical on the page.
ALTER TABLE districts ADD COLUMN IF NOT EXISTS effective_from DATE;

-- ------------------------------------------------- district slug scoping

-- The dropped name is what CREATE TABLE would have generated in 001. The
-- second DROP makes the pair re-runnable, which every other statement in this
-- file already is via IF NOT EXISTS.
ALTER TABLE districts DROP CONSTRAINT IF EXISTS districts_slug_key;
ALTER TABLE districts DROP CONSTRAINT IF EXISTS districts_state_slug_key;

ALTER TABLE districts
  ADD CONSTRAINT districts_state_slug_key UNIQUE (state_id, slug);
