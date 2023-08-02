INSERT INTO storage.buckets (id, name, owner, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('map_tiles', 'map_tiles', null, true, false, null, null)
ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, owner, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('route_uploads', 'route_uploads', null, false, false, null, '{video/mp4}')
ON CONFLICT DO NOTHING;
