UPDATE public.ai_models SET status='inativo' WHERE slug NOT LIKE 'supervision-%';
INSERT INTO public.ai_models (organization_id, name, slug, version, task, architecture, endpoint, classes, source_repo, license, license_notes, weights_status, status, min_confidence, requirements)
SELECT o.id, m.name, m.slug, '0.27', m.task, 'Roboflow Supervision + RF-DETR (COCO)', m.endpoint, m.classes, 'https://github.com/roboflow/supervision', 'MIT (Supervision) · Apache-2.0 (RF-DETR)', 'Licenças permissivas para uso comercial.', 'disponivel', 'ativo', 0.5, 'Pesos COCO baixados automaticamente pelo pacote rfdetr.'
FROM public.organizations o CROSS JOIN (VALUES
 ('Hórus Vision — objetos e pessoas','supervision-objects','objects','/detect/objects', ARRAY['person','cup','fork','knife','spoon','bowl','bottle','wine glass','dining table','chair']),
 ('Hórus Food — alimentos (COCO)','supervision-food','food','/detect/food', ARRAY['banana','apple','sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake']),
 ('Hórus Occupancy — contagem por zona','supervision-count','count','/detect/objects', ARRAY['person'])
) AS m(name,slug,task,endpoint,classes)
ON CONFLICT (organization_id, slug, version) DO NOTHING;