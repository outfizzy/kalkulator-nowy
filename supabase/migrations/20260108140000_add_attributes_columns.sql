-- Add Attribute Columns to pricing_base
alter table "public"."pricing_base" add column if not exists "fields_count" integer;
alter table "public"."pricing_base" add column if not exists "posts_count" integer;
alter table "public"."pricing_base" add column if not exists "area_m2" numeric;

-- Add Variant Note (for asterisks/structural details)
alter table "public"."pricing_base" add column if not exists "variant_note" text;

-- Update RLS if necessary
