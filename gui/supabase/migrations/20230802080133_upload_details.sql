alter table "public"."route_uploads"
    drop constraint "route_uploads_pkey";

drop index if exists "public"."route_uploads_pkey";

CREATE UNIQUE INDEX route_upload_details_pkey ON public.route_uploads USING btree (upload_id);

alter table "public"."route_uploads"
    add constraint "route_upload_details_pkey" PRIMARY KEY using index "route_upload_details_pkey";



