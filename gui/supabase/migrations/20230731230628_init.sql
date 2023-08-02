create extension if not exists "pgaudit" with schema "extensions";


create table "public"."route_uploads"
(
    "route_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "upload_id" uuid not null,
    "original_filename" text not null,
    "status" text not null default 'in_progress'::text
);


alter table "public"."route_uploads" enable row level security;

create table "public"."routes" (
    "id" uuid not null,
    "created_at" timestamp with time zone default now(),
    "name" text not null,
    "category" text not null,
    "map_name" text not null,
    "path" jsonb,
    "author" uuid not null,
    "vehicle" text not null
);


alter table "public"."routes" enable row level security;

CREATE UNIQUE INDEX route_uploads_pkey ON public.route_uploads USING btree (route_id, upload_id);

CREATE UNIQUE INDEX routes_pkey ON public.routes USING btree (id);

alter table "public"."route_uploads"
    add constraint "route_uploads_pkey" PRIMARY KEY using index "route_uploads_pkey";

alter table "public"."routes" add constraint "routes_pkey" PRIMARY KEY using index "routes_pkey";

alter table "public"."route_uploads"
    add constraint "route_uploads_route_id_fkey" FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE not valid;

alter table "public"."route_uploads" validate constraint "route_uploads_route_id_fkey";

alter table "public"."routes" add constraint "routes_author_fkey" FOREIGN KEY (author) REFERENCES auth.users(id) not valid;

alter table "public"."routes" validate constraint "routes_author_fkey";

create or replace view "public"."categories" as  SELECT DISTINCT routes.category
   FROM routes;


create policy "Enable insert for authenticated users only"
on "public"."route_uploads"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable read access for all users"
on "public"."route_uploads"
as permissive
for select
to public
using (true);


create policy "Enable delete for authenticated users only"
on "public"."routes"
as permissive
for delete
to authenticated
using (true);


create policy "Enable insert for authenticated users only"
on "public"."routes"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable read access for all users"
on "public"."routes"
as permissive
for select
to anon, authenticated
using (true);


create policy "Enable selecto for all users"
on "public"."routes"
as permissive
for select
to authenticated, anon
using (true);


create policy "Enable update for authenticated users only"
on "public"."routes"
as permissive
for update
to authenticated
using (true)
with check (true);




