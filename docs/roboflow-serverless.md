# Hórus — visão computacional hospedada

## Entrega e validação

- Integração Roboflow com chave privada nos segredos do servidor e teste real de conectividade: **validado com HTTP 200**, também pelo botão da plataforma em uma conta temporária de teste.
- Configuração salva e relida pela interface: workspace `ordies-workspace`, projeto `restaurant-operations`, API `https://serverless.roboflow.com`.
- Cadastro independente de modelos/workflows: nome, finalidade, identificadores, versão, classes, licença, confiança, tarifa e status. Projeto real cadastrado como **pendente**, sem inventar versão, classes ou licença.
- Laboratório: upload de JPG/PNG/WEBP até 10 MB, webcam autorizada sem áudio, captura manual, monitoramento em intervalos limitados, regiões poligonais, seleção de unidade/câmera/modelo, exportação JSON/CSV e histórico.
- Resultados hospedados são normalizados em TypeScript para bounding boxes, polígonos e contagem anônima por região. Nenhuma identidade ou rastreamento persistente é produzido.
- Consumo: requisições por modelo, unidade, dia e mês; média de latência; erros; tarifa opcional; exportação do histórico. Limites diários/mensais e por minuto são reservados transacionalmente antes da chamada externa; falhas também ocupam a reserva por prudência.
- Imagens não são armazenadas por padrão. Com autorização explícita, ficam em armazenamento privado isolado por organização/usuário, com acesso temporário e exclusão pela interface.
- Atualização por eventos privados sem imagens/payloads e recarregamento dos indicadores de uso. O dashboard operacional existente permanece baseado nos seus registros, não em estimativas inventadas a partir de caixas.
- Adaptador Python anterior e webhook autenticado preservados como opção futura, sem dependência para análises hospedadas.

## Modelos disponíveis agora

A API da sua conta identifica **Restaurant Operations**, do tipo detecção de objetos, mas informa **nenhuma versão e nenhuma classe**. Portanto **nenhum modelo hospedado está pronto para inferência nesta conta**. A plataforma mantém esse projeto pendente e não tenta apresentar resultados fictícios.

Alimentos específicos, sobras, desperdício, pratos/copos/louças, pessoas, segmentação e cubas podem ter modelos independentes. Cada finalidade exige um modelo realmente publicado com as classes correspondentes; um projeto de detecção de objetos não substitui automaticamente um modelo de segmentação ou de desperdício.

## Próximos passos na Roboflow

1. Crie uma conta em [roboflow.com](https://roboflow.com/) (sua chave atual já foi validada).
2. No workspace, abra **Restaurant Operations**, envie imagens autorizadas do restaurante e rotule as classes de interesse. Evite rostos e dados identificáveis.
3. Gere uma versão do conjunto de dados, treine o modelo e publique-o na **Serverless Cloud API**. Verifique a licença, as permissões de uso e o plano.
4. Copie o identificador e a versão numérica apresentados na opção de implantação. No Hórus, edite o modelo pendente, informe a versão, classes e licença reais e altere para **Ativo**.
5. Se usar um Workflow, copie seu ID e os nomes reais da entrada de imagem e da saída de detecções. A saída configurada precisa conter `image: {width,height}` e `predictions` com coordenadas em pixels da imagem original. Pipelines com saídas diferentes precisam de um adaptador específico; a plataforma rejeita formatos incompatíveis.
6. Abra o Laboratório, selecione o modelo e envie uma foto. Só então será possível validar a inferência completa e a visualização real das detecções.

## API Key

A chave privada é obtida nas configurações do workspace da Roboflow, na seção de API keys. Ela já foi salva em `ROBOFLOW_API_KEY` pelo formulário seguro do Lovable. Para substituí-la, use os segredos do projeto; nunca a coloque no cadastro de modelos, em URLs de câmeras ou no navegador.

As chamadas usam `Authorization: Bearer` somente no servidor. Endpoints de inferência ficam restritos a `serverless.roboflow.com` ou a um subdomínio dedicado `*.roboflow.cloud`; destinos locais, credenciais em URL e redirecionamentos não são aceitos.

## Custos e limites

- Roboflow pode cobrar treinamento, inferência, Workflows, implantação dedicada, streaming e processamento em lote conforme o plano/modelo.
- Lovable Cloud pode cobrar hospedagem, execução do backend, armazenamento e atualizações em tempo real conforme o plano.
- As tarifas no Hórus são valores inseridos pelo administrador, não uma consulta à fatura Roboflow. Um Workflow pode gastar mais de uma inferência/crédito por requisição. O painel mostra **requisições enviadas pelo Hórus**, não um extrato oficial de créditos do provedor.
- Configuração inicial editável: 100 requisições/dia, 1.000/mês, 6/minuto, intervalo mínimo de 10 segundos. Zero em uma cota diária/mensal bloqueia análises. Períodos usam o fuso `America/Sao_Paulo`.
- Requisições repetidas com a mesma chave de idempotência não são reenviadas. Não há repetição automática de falhas, evitando cobranças duplicadas.

## Limitações e infraestrutura adicional

- **Inferência completa não validada:** o projeto real ainda não tem versão treinada. Upload e regiões foram verificados na interface; não foram usados resultados simulados.
- Webcam funciona enquanto a página está aberta e autorizada. A captura é interrompida ao sair da página, esconder a aba ou desligar a webcam. Monitoramento contínuo não funciona com o navegador fechado.
- Navegadores não reproduzem RTSP nativamente. A Roboflow documenta [Cloud Streaming](https://docs.roboflow.com/deployment/roboflow-cloud/cloud-streaming) para vídeo gerenciado, mas o acesso aos seus fluxos/câmeras e o plano precisam ser configurados separadamente. Esse serviço não foi conectado nesta entrega. HLS/WebRTC ou um intermediário compatível podem ser necessários conforme a câmera/rede.
- Pipelines longos de Workflows são limitados ao tempo de resposta da chamada (até 60 segundos). Processamento assíncrono durável/Batch Processing e workers de vídeo não foram implementados; exigem serviço gerenciado adicional. Não há processos em segundo plano depois que a página é fechada.
- Detecção visual não calcula gramas, custo de alimentos ou ocupação física sem calibração e contrato específicos. Os indicadores operacionais anteriores foram preservados.
- A chave atual é uma credencial do projeto hospedado; isolamento dos dados do Hórus permanece por organização. Uma chave privada diferente por organização exige configuração segura adicional de credenciais por cliente, não campos de texto na interface.

## Referências oficiais

- [Serverless Cloud API](https://docs.roboflow.com/deployment/roboflow-cloud/serverless-api)
- [REST API e workspace da chave](https://docs.roboflow.com/reference/platform/rest-api)
- [Roboflow Inference](https://github.com/roboflow/inference)
- [Roboflow Supervision](https://github.com/roboflow/supervision) — referência de pós-processamento; não executado no backend web.

Nesta plataforma, as funções seguras usam o backend serverless do TanStack Start hospedado no Lovable; não foram criadas funções Python nem funções de um backend separado.