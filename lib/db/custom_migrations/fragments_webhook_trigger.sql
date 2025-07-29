-- Migration: Add webhook trigger for fragments table
-- This trigger will notify the frontend when fragments are inserted or updated

-- Drop existing triggers if they exist
drop trigger if exists "fragments_insert_webhook" on "public"."fragments";
drop trigger if exists "fragments_update_webhook" on "public"."fragments";

-- Create trigger for INSERT operations
create trigger "fragments_insert_webhook" 
after insert on "public"."fragments" 
for each row
execute function "supabase_functions"."http_request"(
  'https://a49b06ea353a.ngrok-free.app/api/webhooks/fragments',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '1000'
);

-- Create trigger for UPDATE operations
create trigger "fragments_update_webhook" 
after update on "public"."fragments" 
for each row
execute function "supabase_functions"."http_request"(
  'https://a49b06ea353a.ngrok-free.app/api/webhooks/fragments',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '1000'
); 