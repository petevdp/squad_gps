drop policy "allow insert for authenticated" on "public"."route_uploads";

drop policy "allow select for authenticated" on "public"."route_uploads";

alter table "public"."route_uploads" drop constraint "route_uploads_route_id_fkey";

alter table "public"."route_uploads" drop constraint "route_upload_details_pkey";

drop index if exists "public"."route_upload_details_pkey";

drop table "public"."route_uploads";

alter table "public"."routes" add column "status" text default ''::text;



