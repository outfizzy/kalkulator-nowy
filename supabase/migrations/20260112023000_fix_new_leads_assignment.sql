-- Migration: Fix New Leads Assignment
-- Date: 2026-01-12 02:30:00
-- Purpose: Ensure that all leads with status 'new' do not have an assigned owner (assigned_to = NULL).

UPDATE leads
SET assigned_to = NULL
WHERE status = 'new' AND assigned_to IS NOT NULL;
