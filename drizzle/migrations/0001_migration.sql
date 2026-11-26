
create table public.ai_engine_config (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  base_url text,
  timeout_ms int not null default 15000,
  default_model_id uuid,
  min_confidence numeric(4,3) not null default 0.5,
  sync_interval_s int not null default 60,
  last_health_status text,
  last_health_at timestamptz,
  last_health_latency_ms int,
  updated_at timestamptz not null default now()
);
create table public.ai_models (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null,
  name text not null,
  task text not null check (task in ('food','waste','objects','segment','count')),
  architecture text not null,
  version text not null default 'v1',
  source_repo text,
  license text,
  license_notes text,
  classes text[] not null default '{}',
  weights_status text not null default 'indisponivel' check (weights_status in ('disponivel','indisponivel','treinamento_necessario')),
  endpoint text not null,
  min_confidence numeric(4,3) not null default 0.5,
  requirements text,
  status text not null default 'inativo' check (status in ('ativo','inativo','pendente')),
  metrics jsonb,
  metrics_source text,
  created_at timestamptz not null default now(),
  unique (organization_id, slug, version)
);
create table public.cameras (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  code text not null,
  name text not null,
  sector text not null,
  connection_type text not null check (connection_type in ('webcam','ip','rtsp','webrtc','hls','mp4','imagem','demo')),
  stream_ref text,
  resolution text,
  fps int,
  model_id uuid references public.ai_models(id) on delete set null,
  schedule text default '11:00-15:00',
  enabled boolean not null default true,
  status text not null default 'desconhecido' check (status in ('online','offline','erro','desconhecido')),
  last_latency_ms int,
  last_event_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (unit_id, code)
);
create table public.inference_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  camera_id uuid references public.cameras(id) on delete set null,
  model_id uuid references public.ai_models(id) on delete set null,
  task text not null,
  source text not null default 'laboratorio',
  status text not null check (status in ('sucesso','erro','indisponivel')),
  processing_ms int,
  detections jsonb,
  summary jsonb,
  error_message text,
  idempotency_key text unique,
  created_by uuid,
  created_at timestamptz not null default now()
);

grant select on public.ai_engine_config to authenticated;
grant insert, update on public.ai_engine_config to authenticated;
grant select, insert, update, delete on public.ai_models, public.cameras to authenticated;
grant select, insert on public.inference_runs to authenticated;
grant all on public.ai_engine_config, public.ai_models, public.cameras, public.inference_runs to service_role;

alter table public.ai_engine_config enable row level security;
alter table public.ai_models enable row level security;
alter table public.cameras enable row level security;
alter table public.inference_runs enable row level security;

create policy "engine read" on public.ai_engine_config for select to authenticated using (organization_id = public.current_org());
create policy "engine insert" on public.ai_engine_config for insert to authenticated with check (organization_id = public.current_org() and public.has_role(auth.uid(),'admin'));
create policy "engine update" on public.ai_engine_config for update to authenticated using (organization_id = public.current_org() and public.has_role(auth.uid(),'admin'));

create policy "models read" on public.ai_models for select to authenticated using (organization_id = public.current_org());
create policy "models insert" on public.ai_models for insert to authenticated with check (organization_id = public.current_org() and public.can_manage());
create policy "models update" on public.ai_models for update to authenticated using (organization_id = public.current_org() and public.can_manage());
create policy "models delete" on public.ai_models for delete to authenticated using (organization_id = public.current_org() and public.has_role(auth.uid(),'admin'));

create policy "cameras read" on public.cameras for select to authenticated using (public.can_access_unit(unit_id));
create policy "cameras insert" on public.cameras for insert to authenticated with check (public.can_access_unit(unit_id) and public.can_manage());
create policy "cameras update" on public.cameras for update to authenticated using (public.can_access_unit(unit_id) and public.can_manage());
create policy "cameras delete" on public.cameras for delete to authenticated using (public.can_access_unit(unit_id) and public.can_manage());

create policy "runs read" on public.inference_runs for select to authenticated using (organization_id = public.current_org());
create policy "runs insert" on public.inference_runs for insert to authenticated with check (organization_id = public.current_org() and created_by = auth.uid());

insert into public.ai_engine_config (organization_id) values ('00000000-0000-0000-0000-000000000001');

insert into public.ai_models (organization_id, slug, name, task, architecture, version, source_repo, license, license_notes, classes, weights_status, endpoint, min_confidence, requirements, status, metrics, metrics_source) values
('00000000-0000-0000-0000-000000000001','food-waste-yolov11','Hórus Waste — Sobras no prato','waste','YOLOv11-x (segmentação)','v6',
 'https://github.com/joaopferreira19/Food-Waste-Detection-using-YOLOv11',
 'Não declarada','Repositório sem arquivo LICENSE: todos os direitos reservados aos autores (IPVC, artigo MDPI Applied Sciences 15(13):7137). Uso comercial exige autorização. Depende de Ultralytics (AGPL-3.0).',
 '{}','indisponivel','/detect/waste',0.5,'GPU NVIDIA recomendada (YOLOv11-x). Pesos yolov11-x-weights-v6.pt não publicados; dataset público no Roboflow (proj3-food-waste-detection).','pendente',null,null),
('00000000-0000-0000-0000-000000000001','realtime-food-yolov8','Hórus Food — Reconhecimento de alimentos','food','YOLOv8-s (detecção)','small',
 'https://github.com/enricollen/RealTimeFoodDetection',
 'Não declarada','Repositório sem arquivo LICENSE. Pesos model/food_detector_small.pt publicados (22,5 MB). Uso comercial exige autorização do autor. Depende de Ultralytics (AGPL-3.0). Lógica de preço/cobrança do original não é utilizada.',
 '{banana,"black beans","grilled chicken breast",milk,"orange juice",pizza,potato,salad,spaghetti,"white rice"}','disponivel','/detect/food',0.5,'CPU suficiente; GPU opcional.','inativo',null,null),
('00000000-0000-0000-0000-000000000001','restaurant-objects-yolov11','Hórus Vision — Louças e objetos','objects','YOLOv11-n (detecção) + GroundingDINO para rotulagem','exp-1750973996',
 'https://github.com/amir2628/restaurant-object-detection',
 'MIT (declarada no README)','README declara MIT, mas o repositório não contém arquivo LICENSE. Pesos best.pt não publicados (precisam ser treinados novamente com o pipeline do repositório). Depende de Ultralytics (AGPL-3.0).',
 '{person,chair,"dining table",cup,fork,knife,spoon,bowl,bottle,"wine glass",sandwich,pizza}','treinamento_necessario','/detect/objects',0.5,'GPU NVIDIA para treino (~87 min, 500 épocas no original).','pendente',
 '{"precision":0.6923,"recall":0.7673,"map50":0.7478,"map50_95":0.7055}','Relatório de treino do autor (outputs/experiments/yolo_restaurant_detection_1750973996/training_results.json). Não validado em imagens do Hórus.');

insert into public.cameras (unit_id, code, name, sector, connection_type, stream_ref, resolution, fps, enabled, status) values
('00000000-0000-0000-0000-000000000011','CAM-01','Entrada principal','Entrada','rtsp',null,'1920x1080',15,true,'desconhecido'),
('00000000-0000-0000-0000-000000000011','CAM-02','Buffet quente','Buffet','rtsp',null,'1920x1080',15,true,'desconhecido'),
('00000000-0000-0000-0000-000000000011','CAM-03','Balança','Balança','rtsp',null,'1280x720',10,true,'desconhecido'),
('00000000-0000-0000-0000-000000000011','CAM-04','Salão principal','Salão','rtsp',null,'1920x1080',10,true,'desconhecido'),
('00000000-0000-0000-0000-000000000011','CAM-05','Devolução de pratos','Devolução','rtsp',null,'1280x720',10,true,'desconhecido');

update public.cameras set model_id = (select id from public.ai_models where slug='realtime-food-yolov8') where code in ('CAM-02','CAM-03');
update public.cameras set model_id = (select id from public.ai_models where slug='restaurant-objects-yolov11') where code in ('CAM-04','CAM-01');
update public.cameras set model_id = (select id from public.ai_models where slug='food-waste-yolov11') where code = 'CAM-05';
update public.ai_engine_config set default_model_id = (select id from public.ai_models where slug='realtime-food-yolov8');
