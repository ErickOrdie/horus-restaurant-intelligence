# Hórus — AI Restaurant Intelligence

Plataforma de inteligência operacional para restaurantes: visão computacional aplicada ao salão,
controle de mesas, desperdício alimentar, atendimento e indicadores de gestão.
Primeiro cliente: Bovinu'S Grill & Beer — unidade Augusta (buffet de almoço).

Interface em português (pt-BR), tema claro, autenticação por e-mail e senha.

## O que está aqui

| Pasta | Conteúdo |
| --- | --- |
| `src/routes/` | Páginas: dashboard, salão, alertas, alimentos, auditoria, câmeras, modelos, laboratório, integrações, consumo e módulos |
| `src/components/horus/` | Componentes próprios do Hórus (cabecalho, menu, gráficos, webcam, painéis de visão) |
| `src/lib/` | Regras de negócio: indicadores (`metrics.ts`), parser do workflow de restaurante (`restaurant.ts`), normalização das detecções (`roboflow.ts`), funções de servidor |
| `drizzle/migrations/` | Histórico de migrações do banco (multiempresa, RLS, visão, ocupação, regiões de mesa) |
| `supabase/` | Configuração do backend |
| `ai-engine/` | Adaptador Python opcional (Supervision + RF-DETR) para quem preferir rodar a visão localmente |
| `docs/` | Documentação da integração de visão hospedada |

## Requisitos

- Node.js 20+ e Bun (ou npm)
- Um backend Lovable Cloud (Supabase) para banco, autenticação e storage
- Uma conta Roboflow com um projeto publicado, para as análises de imagem

## Rodando localmente

```sh
git clone https://github.com/ErickOrdie/horus-restaurant-intelligence.git
cd horus-restaurant-intelligence
bun install
bun run dev
```

Depois, crie um arquivo `.env` na raiz com os valores do seu backend:

```text
VITE_SUPABASE_URL=<url do seu backend>
VITE_SUPABASE_PUBLISHABLE_KEY=<chave pública do seu backend>
SUPABASE_URL=<url do seu backend>
SUPABASE_PUBLISHABLE_KEY=<chave pública do seu backend>
ROBOFLOW_API_KEY=<chave da sua conta Roboflow>
```

As variáveis sem o prefixo `VITE_` só existem no servidor. A chave da Roboflow nunca vai para o
navegador: as análises partem de funções de servidor autenticadas.

Para aplicar o banco, use as migrações em `drizzle/migrations/` na ordem em que aparecem.

## Testes

```sh
bunx vitest run
```

Cobrem as fórmulas dos indicadores, o parser do workflow de restaurante e a normalização das
detecções (nada de valores inventados: detecção ausente vira "não conectado", nunca uma lista vazia
aparentemente válida).

## Avisos antes de usar com clientes reais

- O repositório contém **dados fictícios de demonstração** (análises, alertas, pratos, atendimentos).
  Apague-os antes de operar com clientes reais.
- Os números do cartão "Agora no salão" e de "32 mesas" na página inicial são fixos e não vêm do banco.
- Estados de mesa vindos do workflow são **estimativas** por imagem; só viram registro confirmado
  quando há confirmação operacional.
- A leitura de desperdício e a identificação dos pratos do buffet dependem de um modelo treinado com
  fotos do próprio restaurante.

## Documentação

- [docs/roboflow-serverless.md](docs/roboflow-serverless.md) — integração de visão hospedada, custos e limites
- [AGENTS.md](AGENTS.md) — decisões técnicas e regras do projeto
- [roadmap.md](roadmap.md) — o que já foi entregue e o que falta

## Tecnologias

TanStack Start · React 19 · TypeScript · Tailwind CSS v4 · Lovable Cloud (Supabase) · Roboflow
(Supervision e RF-DETR, ambos com licença que permite uso comercial).

##Vídeo

https://github.com/user-attachments/assets/9838e0a2-627e-4c5a-bc5a-dcf19c40c393

##Prints

https://horustechnology.lovable.app/
