# Revisão de fornecedores — 2026-08

Data de consulta: 2026-08-04  
Estado: revisão pública preliminar; **Pendente de aprovação do responsável — não publicar em produção**.

Esta revisão não substitui a leitura dos termos efetivamente aceites pela conta, a configuração da consola nem aconselhamento jurídico. Uma política pública do fornecedor não prova, por si só, a função de subcontratante, a região ou o prazo aplicável ao projeto.

## Cloudflare

- Função: DNS/CDN, Pages/Functions, Access e D1/Worker de métricas.
- Dados técnicos possíveis: pedidos, IP e metadados de rede nos sistemas de entrega/segurança; eventos minimizados gravados na D1 após consentimento.
- Fontes oficiais: [Privacy and Data Protection](https://www.cloudflare.com/trust-hub/privacy-and-data-protection/), [GDPR FAQ/DPA](https://www.cloudflare.com/trust-hub/gdpr/), [subprocessadores](https://www.cloudflare.com/gdpr/subprocessors/).
- Verificado publicamente: existe DPA padrão, referência a Cláusulas Contratuais-Tipo e lista atualizável de subprocessadores; a infraestrutura pode envolver tratamento internacional.
- Retenção/região concreta: **Não verificado em 2026-08-04 — bloqueia a alegação e requer confirmação do responsável/fornecedor**. Confirmar configurações, plano, DPA aceite, localizações, logs e subprocessadores da conta.

## Google/Gmail

- Função: caixa de correio `livesantamaria.project@gmail.com`.
- Dados: remetente/destinatário, conteúdo, anexos e metadados normais do email; dados de conta e segurança.
- Fontes oficiais: [Política de Privacidade](https://policies.google.com/privacy), [retenção](https://policies.google.com/technologies/retention).
- Verificado publicamente: Google declara servidores em vários países, prazos dependentes do dado/configuração e possíveis atrasos/backups após eliminação.
- DPA, subprocessadores, mecanismo contratual, região e prazo aplicáveis a esta conta Gmail de consumidor: **Não verificado em 2026-08-04 — bloqueia a alegação e requer confirmação do responsável/fornecedor**.

## jsDelivr

- Função: entrega ao navegador da biblioteca HLS referenciada pelo Site.
- Dados técnicos possíveis: pedido do recurso, IP, User-Agent, hora e URL de referência conforme funcionamento do CDN/navegador.
- Fonte oficial localizada: [site jsDelivr](https://www.jsdelivr.com/).
- Política de privacidade, termos/DPA, subprocessadores, região, transferências e retenção aplicáveis ao carregamento público: **Não verificado em 2026-08-04 — bloqueia a alegação e requer confirmação do responsável/fornecedor**.
- Ação recomendada: avaliar alojamento local da versão fixada para reduzir dependência e pedidos de terceiros.

## Open-Meteo

- Função: fornecer dados meteorológicos ao Site, quando chamado pelo navegador ou backend.
- Dados técnicos possíveis: IP, User-Agent, hora, parâmetros/localização consultada e metadados do pedido.
- Fontes oficiais localizadas: [Open-Meteo](https://open-meteo.com/) e [Termos](https://open-meteo.com/en/terms).
- DPA, subprocessadores, localização efetiva, mecanismo de transferência e retenção dos logs para a modalidade usada: **Não verificado em 2026-08-04 — bloqueia a alegação e requer confirmação do responsável/fornecedor**.

## SpotAzores

- Função: origem/integração de vídeo de câmaras, conforme cada stream publicado.
- Dados técnicos possíveis: IP, User-Agent, hora, câmara/recurso pedido e metadados de entrega.
- Fonte pública localizada: [SpotAzores](https://www.spotazores.com/).
- Entidade contratual, função RGPD, política/DPA, subprocessadores, região, transferências, logs e retenção: **Não verificado em 2026-08-04 — bloqueia a alegação e requer confirmação do responsável/fornecedor**.

## Decisão antes da produção

Luis Mesquita deve confirmar os fornecedores realmente usados, os termos aplicáveis e se aceita os riscos/transferências documentados. Luis Carreiro deve confirmar a configuração técnica e remover do texto público qualquer fornecedor não usado. Enquanto subsistir uma afirmação factual não verificada, a Política deve usar linguagem limitada e não prometer localização, prazo externo ou ausência de IP.
