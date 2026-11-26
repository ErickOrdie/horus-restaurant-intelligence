ALTER TABLE public.roboflow_config ADD COLUMN enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.roboflow_config ADD COLUMN timeout_ms integer NOT NULL DEFAULT 60000 CHECK (timeout_ms BETWEEN 5000 AND 120000);
ALTER TABLE public.roboflow_config ADD COLUMN cleaning_goal_s integer NOT NULL DEFAULT 600 CHECK (cleaning_goal_s BETWEEN 30 AND 7200);
ALTER TABLE public.cleaning_events ADD COLUMN confirmed boolean NOT NULL DEFAULT false;
CREATE TABLE public.occupancy_metrics (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id), unit_id uuid NOT NULL REFERENCES public.units(id), camera_id uuid REFERENCES public.cameras(id), run_id uuid NOT NULL UNIQUE REFERENCES public.inference_runs(id), people_count integer CHECK (people_count>=0), table_count integer CHECK(table_count>=0), occupied_count integer NOT NULL DEFAULT 0, available_count integer NOT NULL DEFAULT 0, awaiting_count integer NOT NULL DEFAULT 0, unknown_count integer, occupancy_percent numeric, processing_ms integer, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.occupancy_metrics TO authenticated; GRANT ALL ON public.occupancy_metrics TO service_role;
ALTER TABLE public.occupancy_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "occupancy unit read" ON public.occupancy_metrics FOR SELECT TO authenticated USING (organization_id=public.current_org() AND public.can_access_unit(unit_id));
CREATE INDEX occupancy_unit_time ON public.occupancy_metrics(organization_id,unit_id,camera_id,created_at DESC);
CREATE TABLE public.table_regions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id), camera_id uuid NOT NULL REFERENCES public.cameras(id), table_id uuid NOT NULL REFERENCES public.dining_tables(id), points jsonb NOT NULL CHECK(jsonb_typeof(points)='array' AND jsonb_array_length(points) BETWEEN 3 AND 30), UNIQUE(camera_id,table_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.table_regions TO authenticated; GRANT ALL ON public.table_regions TO service_role;
ALTER TABLE public.table_regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regions read" ON public.table_regions FOR SELECT TO authenticated USING (organization_id=public.current_org() AND EXISTS(SELECT 1 FROM public.cameras c JOIN public.dining_tables t ON t.unit_id=c.unit_id WHERE c.id=camera_id AND t.id=table_id AND public.can_access_unit(c.unit_id)));
CREATE POLICY "regions manage" ON public.table_regions FOR ALL TO authenticated USING(organization_id=public.current_org() AND public.has_role(auth.uid(),'admin')) WITH CHECK(organization_id=public.current_org() AND public.has_role(auth.uid(),'admin') AND EXISTS(SELECT 1 FROM public.cameras c JOIN public.dining_tables t ON t.unit_id=c.unit_id WHERE c.id=camera_id AND t.id=table_id AND public.can_access_unit(c.unit_id)));
CREATE TABLE public.table_state_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES public.organizations(id),unit_id uuid NOT NULL REFERENCES public.units(id),camera_id uuid REFERENCES public.cameras(id),table_id uuid NOT NULL REFERENCES public.dining_tables(id),run_id uuid REFERENCES public.inference_runs(id),state text NOT NULL CHECK(state IN('disponivel','ocupada','aguardando_limpeza','em_limpeza','indeterminada','reservada','bloqueada')),source text NOT NULL CHECK(source IN('estimativa','manual')),created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.table_state_events TO authenticated; GRANT ALL ON public.table_state_events TO service_role;
ALTER TABLE public.table_state_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "table states read" ON public.table_state_events FOR SELECT TO authenticated USING(organization_id=public.current_org() AND public.can_access_unit(unit_id));
CREATE INDEX table_states_time ON public.table_state_events(organization_id,table_id,created_at DESC);
CREATE OR REPLACE FUNCTION public.record_manual_table_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE org uuid;
BEGIN
 IF NEW.status=OLD.status THEN RETURN NEW; END IF;
 SELECT organization_id INTO org FROM public.units WHERE id=NEW.unit_id;
 INSERT INTO public.table_state_events(organization_id,unit_id,table_id,state,source) VALUES(org,NEW.unit_id,NEW.id,NEW.status,'manual');
 IF NEW.status='disponivel' AND OLD.status IN('em_limpeza','aguardando_limpeza') THEN
 INSERT INTO public.cleaning_events(unit_id,table_id,started_at,duration_seconds,confirmed) VALUES(NEW.unit_id,NEW.id,OLD.status_since,greatest(0,extract(epoch from now()-OLD.status_since)::integer),true);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_manual_table_state() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER manual_table_state AFTER UPDATE ON public.dining_tables FOR EACH ROW EXECUTE FUNCTION public.record_manual_table_state();
CREATE OR REPLACE FUNCTION public.reserve_roboflow_request(p_unit uuid,p_model uuid,p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.roboflow_config; m public.ai_models; r public.roboflow_requests; org uuid; d bigint; mo bigint; minute_count bigint;
BEGIN
 org:=public.current_org();
 IF auth.uid() IS NULL OR org IS NULL OR NOT public.can_access_unit(p_unit) OR length(p_key)<8 OR length(p_key)>80 THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO c FROM public.roboflow_config WHERE organization_id=org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Configuration required'; END IF;
 SELECT * INTO r FROM public.roboflow_requests WHERE organization_id=org AND idempotency_key=p_key;
 IF FOUND THEN RETURN jsonb_build_object('id',r.id,'duplicate',true,'status',r.status); END IF;
 IF NOT c.enabled THEN RETURN jsonb_build_object('blocked','Integração desativada pelo administrador.'); END IF;
 IF EXISTS(SELECT 1 FROM public.roboflow_requests WHERE organization_id=org AND status='processando' AND created_at>now()-make_interval(secs=>c.timeout_ms/1000+30)) THEN RETURN jsonb_build_object('blocked','Uma análise já está em andamento nesta organização.'); END IF;
 SELECT * INTO m FROM public.ai_models WHERE id=p_model AND organization_id=org AND provider='roboflow' AND status='ativo';
 IF NOT FOUND THEN RAISE EXCEPTION 'Model unavailable'; END IF;
 SELECT count(*) FILTER(WHERE created_at>=date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'),count(*) FILTER(WHERE created_at>=date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'),count(*) FILTER(WHERE created_at>now()-interval '1 minute') INTO d,mo,minute_count FROM public.roboflow_requests WHERE organization_id=org AND created_at>=date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
 IF d>=c.daily_limit THEN RETURN jsonb_build_object('blocked','Limite diário de inferências atingido.'); END IF;
 IF mo>=c.monthly_limit THEN RETURN jsonb_build_object('blocked','Limite mensal de inferências atingido.'); END IF;
 IF minute_count>=c.requests_per_minute THEN RETURN jsonb_build_object('blocked','Limite de requisições por minuto atingido.'); END IF;
 IF EXISTS(SELECT 1 FROM public.roboflow_requests WHERE organization_id=org AND created_by=auth.uid() AND created_at>now()-make_interval(secs=>c.min_frame_interval_s)) THEN RETURN jsonb_build_object('blocked','Aguarde o intervalo mínimo entre análises.'); END IF;
 INSERT INTO public.roboflow_requests(organization_id,unit_id,model_id,created_by,idempotency_key,estimated_cost,currency) VALUES(org,p_unit,p_model,auth.uid(),p_key,coalesce(m.price_per_inference,c.price_per_inference),c.currency) RETURNING * INTO r;
 RETURN jsonb_build_object('id',r.id,'duplicate',false,'status',r.status);
END $$;
REVOKE ALL ON FUNCTION public.reserve_roboflow_request(uuid,uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.reserve_roboflow_request(uuid,uuid,text) TO authenticated;
COMMENT ON TABLE public.occupancy_metrics IS 'Anonymous frame snapshots, never distinct customer visits; no cross-camera summation.';
COMMENT ON TABLE public.table_state_events IS 'Automatic estimates mapped only through fixed camera regions; manual confirmations are separate.';