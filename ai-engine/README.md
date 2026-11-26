# Hórus AI Engine (serviço de referência)

**Adaptador opcional legado.** O Laboratório e as análises principais agora usam a API hospedada Roboflow, sem depender deste serviço. Consulte [a migração serverless](../docs/roboflow-serverless.md). As capacidades abaixo descrevem o adaptador de referência, não modelos disponíveis na conta Roboflow.

Serviço Python/FastAPI que roda **fora** da plataforma web e implementa o contrato do Hórus.
Todas as análises usam **[roboflow/supervision](https://github.com/roboflow/supervision)** (MIT):
filtro de confiança e classes, NMS, contagens e ocupação por zona (`sv.PolygonZone`).
O detector é o RF-DETR (Apache-2.0, Roboflow), com pesos COCO baixados automaticamente.

| Análise | Endpoint | Situação |
| --- | --- | --- |
| Objetos, louças e pessoas | `POST /detect/objects` | Pronto (COCO) |
| Ocupação por zona | `POST /detect/objects` com `zones` | Pronto |
| Alimentos | `POST /detect/food` | Pronto, limitado às 10 classes de comida do COCO |
| Desperdício | `POST /detect/waste` | Responde 503 até haver checkpoint treinado |

## Executar

```bash
pip install -r requirements.txt
export HORUS_AI_ENGINE_KEY="mesma-chave-configurada-no-hórus"
# opcional: checkpoint RF-DETR treinado com pratos do buffet
export HORUS_RFDETR_WEIGHTS=/models/horus.pth
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Todas as rotas exigem `X-Horus-Key`. `bbox` é normalizado `[x1,y1,x2,y2]`; `zones` são polígonos normalizados.
Licenças: Supervision MIT e RF-DETR Apache-2.0 — permitem uso comercial.
