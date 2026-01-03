-- Add representative and signer tracking to customers
ALTER TABLE "public"."customers" 
ADD COLUMN IF NOT EXISTS "representative_id" uuid REFERENCES "auth"."users"("id"),
ADD COLUMN IF NOT EXISTS "contract_signer_id" uuid REFERENCES "auth"."users"("id");

-- Create customer_costs table
CREATE TABLE IF NOT EXISTS "public"."customer_costs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE CASCADE,
    "type" text NOT NULL CHECK (type IN ('measurement', 'commission', 'material', 'installation', 'delivery', 'other')),
    "amount" numeric NOT NULL,
    "currency" text NOT NULL DEFAULT 'PLN',
    "description" text,
    "date" date NOT NULL DEFAULT CURRENT_DATE,
    "source_ref" text, -- e.g., "measurement:ID" or "offer:ID"
    "created_at" timestamptz DEFAULT now(),
    "created_by" uuid REFERENCES "auth"."users"("id"),
    PRIMARY KEY ("id")
);

-- RLS Policies for customer_costs
ALTER TABLE "public"."customer_costs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."customer_costs";
CREATE POLICY "Enable read access for authenticated users" 
ON "public"."customer_costs" FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON "public"."customer_costs";
CREATE POLICY "Enable insert access for authenticated users" 
ON "public"."customer_costs" FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON "public"."customer_costs";
CREATE POLICY "Enable update access for authenticated users" 
ON "public"."customer_costs" FOR UPDATE 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON "public"."customer_costs";
CREATE POLICY "Enable delete access for authenticated users" 
ON "public"."customer_costs" FOR DELETE 
TO authenticated 
USING (true);
