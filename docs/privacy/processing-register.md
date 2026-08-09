# Registo de atividades de tratamento — v2

Data de preparação: 2026-08-04
Estado: **Aprovado conjuntamente em 2026-08-09**, mantendo os gates técnicos e de fornecedores assinalados.

Corresponsáveis pelo tratamento: Luís Mesquita e Luís Carreiro, em nome individual.
Funções predominantes: Luís Mesquita — acompanhamento institucional e de conformidade; Luís Carreiro — implementação técnica, segurança, controlo de acessos e manutenção operacional.
Contacto: `livesantamaria.project@gmail.com`.

Este registo deve ser revisto quando mudar uma finalidade, câmara, fornecedor, prazo, categoria de dados ou medida técnica.

## Câmaras em direto e Timelapse

| Campo | Registo |
|---|---|
| Finalidade | Observação paisagística, meteorológica e marítima informal de Santa Maria. |
| Titulares e dados | Visitantes ou veículos captados incidentalmente; imagem da paisagem e condições ambientais. Não se pretende identificar pessoas. |
| Fundamento proposto | Interesse legítimo, sujeito à ponderação documentada e decisão conjunta dos corresponsáveis. |
| Destinatários/operadores | Público na transmissão; operadores técnicos estritamente necessários; Cloudflare na entrega do Site; origem/serviço de vídeo aplicável a cada câmara. |
| Transferências | Dependem dos fornecedores e respetivas localizações; ver `provider-review-2026-08.md`. Não assumir localização exclusivamente na UE. |
| Conservação | Direto: segmentos/cache pelo tempo tecnicamente necessário e prazos do fornecedor. Timelapse: capturas 3 dias, últimos 10 vídeos diários e últimos 4 vídeos semanais. |
| Eliminação | Rotina automática do nó; substituição de ficheiros correntes e miniaturas; incidente pode exigir apagamento antecipado. |
| Acesso | Administração técnica autorizada; Timelapse publicado ao público. |
| Medidas | Enquadramento preventivo; sem áudio, biometria, leitura de matrículas ou seguimento; retenção mínima; acesso técnico; revisão por câmara. |
| Revisão/aprovador | Revisão por câmara e após incidente; Luís Mesquita e Luís Carreiro. Aprovação conjunta registada em 2026-08-09; verificação individual por câmara ainda obrigatória. |

## Métricas opcionais de audiência

| Campo | Registo |
|---|---|
| Finalidade | Contar visitas e câmaras públicas abertas, de forma agregada, para compreender utilização e apoiar decisões operacionais. |
| Titulares e dados | Visitantes que consentem; hora, evento `visit`/`camera_view`, câmara pública quando aplicável, host canónico, identificador aleatório de sessão e chave de deduplicação. |
| Fundamento | Consentimento prévio; sessão analítica de 30 minutos. A recusa não limita o Site. |
| Destinatários/operadores | Luís Mesquita e Luís Carreiro para resultados; Cloudflare Pages/Functions/D1 como infraestrutura técnica. |
| Transferências | Cloudflare pode tratar dados em infraestrutura internacional; DPA, subprocessadores e mecanismo carecem de validação contratual da conta. |
| Conservação | Eventos brutos: 30 dias; sessão local: 30 minutos após a atividade mais recente; preferência de consentimento até ser alterada/removida no navegador. |
| Eliminação | Worker diário elimina eventos com mais de 30 dias; retirada remove a sessão local e bloqueia eventos futuros. |
| Acesso | Técnico restrito; divulgação apenas de contagens agregadas. |
| Medidas | Minimização, pseudónimo aleatório, validação, deduplicação, sem gravação deliberada de IP/User-Agent/email na D1. |
| Revisão/aprovador | Antes de produção e após mudança de métrica/fornecedor; decisão conjunta de Luís Mesquita e Luís Carreiro. Aprovado em 2026-08-09. |

## Contactos por email

| Campo | Registo |
|---|---|
| Finalidade | Responder a pedidos, propostas, questões de privacidade e assuntos iniciados pelo remetente. |
| Titulares e dados | Remetentes e terceiros referidos; conteúdo enviado e metadados normais do email. |
| Fundamento proposto | Diligências solicitadas pela pessoa, quando aplicável, e interesse legítimo em responder e gerir correspondência. |
| Destinatários/operadores | Luís Mesquita e Luís Carreiro conforme necessidade; Google/Gmail como fornecedor da conta do projeto. |
| Transferências | Google declara tratamento em servidores mundiais; mecanismo e termos aplicáveis à conta concreta por confirmar. |
| Conservação | Até 12 meses após encerramento do assunto, salvo obrigação legal ou exercício/defesa de direitos. |
| Eliminação | Eliminação manual periódica, incluindo lixo, sujeita ao funcionamento e backups do fornecedor. |
| Acesso | Conta atualmente partilhada pelos dois responsáveis operacionais sob a mesma policy; separar utilizadores/perfis quando operacionalmente possível. |
| Medidas | Autenticação forte, acesso mínimo, não reenviar sem necessidade, registo privado de pedidos RGPD. |
| Revisão/aprovador | Semestral e após mudança de conta/acessos; decisão conjunta de Luís Mesquita e Luís Carreiro. Aprovado em 2026-08-09. |

## Logs técnicos, segurança e operação

| Campo | Registo |
|---|---|
| Finalidade | Disponibilidade, diagnóstico, prevenção de abuso e prova das rotinas de retenção. |
| Titulares e dados | Visitantes e operadores; hora, resultado, endpoint/código técnico e dados de rede que o fornecedor possa processar. |
| Fundamento proposto | Interesse legítimo em operar e proteger o serviço, sujeito à ponderação documentada. |
| Destinatários/operadores | Luís Carreiro predominantemente na operação técnica; Luís Mesquita quando necessário; fornecedores de infraestrutura aplicáveis. |
| Transferências | Conforme fornecedor; ver revisão de fornecedores. |
| Conservação | Logs controlados pelo projeto: máximo 14 dias. Logs próprios dos fornecedores: prazo/configuração a confirmar e documentar. |
| Eliminação | Rotação/expiração automática; eliminação manual em incidente quando adequada. |
| Acesso | Administração técnica autorizada, com partilha apenas por necessidade. |
| Medidas | Não registar deliberadamente corpos, password, token, secret, cookie de sessão, identificadores analíticos ou credenciais; evidência apenas agregada. |
| Revisão/aprovador | Após incidente e pelo menos anual; decisão conjunta de Luís Mesquita e Luís Carreiro. Aprovação registada em 2026-08-09; prazos técnicos ainda sujeitos a verificação. |
