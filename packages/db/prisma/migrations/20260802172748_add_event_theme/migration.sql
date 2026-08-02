-- Vrije-vorm huisstijl per event (kleuren/logo), zie docs/architectuurvoorstel.md
-- ("Per-event huisstijl").
ALTER TABLE "events" ADD COLUMN     "theme" JSONB;
