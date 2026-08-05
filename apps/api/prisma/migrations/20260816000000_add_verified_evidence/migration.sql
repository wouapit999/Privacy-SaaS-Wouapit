-- Evidence-based verification: mark discovered profiles as confirmed (identifier
-- found in content or authoritative API) and store the evidence snippet.
ALTER TABLE "discovered_profiles" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "discovered_profiles" ADD COLUMN "evidence" TEXT;
