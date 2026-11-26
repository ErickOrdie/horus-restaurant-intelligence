ALTER TABLE public.ai_models ADD COLUMN provider text NOT NULL DEFAULT 'legacy' CHECK (provider IN ('legacy','roboflow'));
ALTER TABLE public.ai_models ADD COLUMN workspace_id text;
ALTER TABLE public.ai_models ADD COLUMN roboflow_model_id text;
ALTER TABLE public.ai_models ADD COLUMN workflow_id text;
ALTER TABLE public.ai_models ADD COLUMN image_input text NOT NULL DEFAULT 'image';
ALTER TABLE public.ai_models ADD COLUMN output_key text NOT NULL DEFAULT 'predictions';
ALTER TABLE public.ai_models ADD COLUMN purpose text;
ALTER TABLE public.ai_models ADD COLUMN price_per_inference numeric(12,6) CHECK (price_per_inference >= 0);
ALTER TABLE public.inference_runs ADD COLUMN image_path text;
CREATE TABLE public.roboflow_config (
 organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
 workspace_id text NOT NULL DEFAULT '', model_id text NOT NULL DEFAULT '', workflow_id text NOT NULL DEFAULT '', model_version text NOT NULL DEFAULT '',
 endpoint text NOT NULL DEFAULT 'https://serverless.roboflow.com',
 daily_limit int NOT NULL DEFAULT 100 CHECK (daily_limit >= 0), monthly_limit int NOT NULL DEFAULT 1000 CHECK (monthly_limit >= 0),
 requests_per_minute int NOT NULL DEFAULT 6 CHECK (requests_per_minute BETWEEN 1 AND 60),
 min_frame_interval_s int NOT NULL DEFAULT 10 CHECK (min_frame_interval_s BETWEEN 5 AND 3600),
 price_per_inference numeric(12,6) CHECK (price_per_inference >= 0), currency text NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL','USD')),
 last_status text, last_test_at timestamptz, last_latency_ms int, last_error text, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.roboflow_config TO authenticated;
GRANT ALL ON public.roboflow_config TO service_role;
ALTER TABLE public.roboflow_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roboflow config read" ON public.roboflow_config FOR SELECT TO authenticated USING (organization_id = public.current_org());
CREATE POLICY "roboflow config insert" ON public.roboflow_config FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "roboflow config update" ON public.roboflow_config FOR UPDATE TO authenticated USING (organization_id = public.current_org() AND public.has_role(auth.uid(),'admin')) WITH CHECK (organization_id = public.current_org() AND public.has_role(auth.uid(),'admin'));
INSERT INTO public.roboflow_config (organization_id) SELECT id FROM public.organizations;
CREATE TABLE public.roboflow_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id), unit_id uuid NOT NULL REFERENCES public.units(id),
 model_id uuid NOT NULL REFERENCES public.ai_models(id), created_by uuid NOT NULL, idempotency_key text NOT NULL,
 status text NOT NULL DEFAULT 'processando' CHECK (status IN ('processando','sucesso','erro','indisponivel')),
 processing_ms int, http_status int, error_message text, run_id uuid REFERENCES public.inference_runs(id), result jsonb,
 estimated_cost numeric(12,6), currency text NOT NULL DEFAULT 'BRL', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (organization_id, idempotency_key)
);
GRANT SELECT ON public.roboflow_requests TO authenticated;
GRANT ALL ON public.roboflow_requests TO service_role;
ALTER TABLE public.roboflow_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roboflow requests read" ON public.roboflow_requests FOR SELECT TO authenticated USING (organization_id = public.current_org() AND public.can_access_unit(unit_id));
CREATE INDEX roboflow_requests_usage ON public.roboflow_requests (organization_id, created_at);
CREATE OR REPLACE FUNCTION public.reserve_roboflow_request(p_unit uuid, p_model uuid, p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.roboflow_config; m public.ai_models; r public.roboflow_requests; org uuid; d bigint; mo bigint; minute_count bigint;
BEGIN
 org := public.current_org();
 IF auth.uid() IS NULL OR org IS NULL OR NOT public.can_access_unit(p_unit) OR length(p_key) < 8 OR length(p_key) > 80 THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO c FROM public.roboflow_config WHERE organization_id=org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Configuration required'; END IF;
 SELECT * INTO r FROM public.roboflow_requests WHERE organization_id=org AND idempotency_key=p_key;
 IF FOUND THEN RETURN jsonb_build_object('id',r.id,'duplicate',true,'status',r.status); END IF;
 SELECT * INTO m FROM public.ai_models WHERE id=p_model AND organization_id=org AND provider='roboflow' AND status='ativo';
 IF NOT FOUND THEN RAISE EXCEPTION 'Model unavailable'; END IF;
 SELECT count(*) FILTER (WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'), count(*) FILTER (WHERE created_at >= date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'), count(*) FILTER (WHERE created_at > now()-interval '1 minute') INTO d,mo,minute_count FROM public.roboflow_requests WHERE organization_id=org AND created_at >= date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
 IF d >= c.daily_limit THEN RETURN jsonb_build_object('blocked','Limite diário de inferências atingido.'); END IF;
 IF mo >= c.monthly_limit THEN RETURN jsonb_build_object('blocked','Limite mensal de inferências atingido.'); END IF;
 IF minute_count >= c.requests_per_minute THEN RETURN jsonb_build_object('blocked','Limite de requisições por minuto atingido.'); END IF;
 IF EXISTS(SELECT 1 FROM public.roboflow_requests WHERE organization_id=org AND created_by=auth.uid() AND created_at > now()-make_interval(secs=>c.min_frame_interval_s)) THEN RETURN jsonb_build_object('blocked','Aguarde o intervalo mínimo entre análises.'); END IF;
 INSERT INTO public.roboflow_requests (organization_id,unit_id,model_id,created_by,idempotency_key,estimated_cost,currency) VALUES (org,p_unit,p_model,auth.uid(),p_key,coalesce(m.price_per_inference,c.price_per_inference),c.currency) RETURNING * INTO r;
 RETURN jsonb_build_object('id',r.id,'duplicate',false,'status',r.status);
END $$;
REVOKE ALL ON FUNCTION public.reserve_roboflow_request(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_roboflow_request(uuid,uuid,text) TO authenticated;
CREATE POLICY "vision image read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='vision-images' AND (storage.foldername(name))[1] = public.current_org()::text AND ((storage.foldername(name))[2]=auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "vision image insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='vision-images' AND (storage.foldername(name))[1] = public.current_org()::text AND (storage.foldername(name))[2]=auth.uid()::text);
CREATE POLICY "vision image delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='vision-images' AND (storage.foldername(name))[1] = public.current_org()::text AND ((storage.foldername(name))[2]=auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE OR REPLACE FUNCTION public.ring_vision_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE org uuid;
BEGIN
 FOR org IN SELECT DISTINCT organization_id FROM new_rows LOOP
 PERFORM realtime.send('{}'::jsonb,'vision_changed','vision:'||org::text,true);
 END LOOP;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.ring_vision_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER vision_requests_insert AFTER INSERT ON public.roboflow_requests REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.ring_vision_change();
CREATE TRIGGER vision_requests_update AFTER UPDATE ON public.roboflow_requests REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.ring_vision_change();
CREATE POLICY "vision private broadcast" ON realtime.messages FOR SELECT TO authenticated USING (realtime.topic()='vision:'||public.current_org()::text);
COMMENT ON TABLE public.ai_engine_config IS 'Optional legacy Python adapter configuration. Hosted vision uses roboflow_config.';