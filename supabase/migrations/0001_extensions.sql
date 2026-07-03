-- GRYD — 0001 extensions
-- pgcrypto : gen_random_bytes (codes referral), gen_random_uuid (natif pg13+ mais on garde l'extension pour digest/hmac futurs).
-- postgis : géométrie des city_zones (les hexes eux-mêmes sont en H3 BIGINT, cf. DISCOVERY D13).

create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;
