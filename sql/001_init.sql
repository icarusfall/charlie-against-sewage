create table if not exists beaches (
  id             bigserial primary key,
  source         text not null,
  source_id      text not null,
  name           text not null,
  country        text not null,
  lat            double precision not null,
  lng            double precision not null,
  status         text not null default 'unclassified',
  status_year    int,
  source_url     text,
  updated_at     timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists beaches_lng_idx on beaches (lng);
create index if not exists beaches_lat_idx on beaches (lat);
create index if not exists beaches_country_idx on beaches (country);
