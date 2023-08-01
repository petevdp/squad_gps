drop
policy "Enable insert for authenticated users only" on "public"."route_upload_details";

drop
policy "Enable read access for all users" on "public"."route_upload_details";

alter table "public"."route_upload_details" drop constraint "route_upload_details_route_id_fkey";

alter table "public"."route_upload_details" drop constraint "route_uploads_pkey";

drop index if exists "public"."route_uploads_pkey";

drop table "public"."route_upload_details";

create table "public"."route_uploads"
(
    "upload_id"         uuid not null,
    "created_at"        timestamp with time zone default now(),
    "route_id"          uuid not null,
    "original_filename" text not null,
    "status"            text not null            default 'in_progress'::text
);


alter table "public"."route_uploads" enable row level security;

CREATE UNIQUE INDEX route_upload_details_pkey ON public.route_uploads USING btree (upload_id);

alter table "public"."route_uploads"
    add constraint "route_upload_details_pkey" PRIMARY KEY using index "route_upload_details_pkey";

alter table "public"."route_uploads"
    add constraint "route_uploads_route_id_fkey" FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE not valid;

alter table "public"."route_uploads" validate constraint "route_uploads_route_id_fkey";

create
policy "allow insert for authenticated"
on "public"."route_uploads"
as permissive
for insert
to authenticated
with check (true);


create
policy "allow select for authenticated"
on "public"."route_uploads"
as permissive
for
select
    to authenticated
    using (true);


