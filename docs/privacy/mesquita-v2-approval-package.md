# Release v2 — pacote de decisão sobre privacidade

Preparado em: 2026-08-04  
Destinatário: Luis Mesquita  
Estado: **para revisão — não autoriza publicação**

## 1. O que está a ser pedido

Este documento pede a Luis Mesquita que confirme, rejeite ou condicione as decisões de privacidade propostas para a release v2 do Live Santa Maria. A decisão abrange o texto público, as finalidades, os fundamentos e os prazos de conservação.

Esta decisão não autoriza `push`, publicação do Site, alteração de câmaras ou nós, migration D1, Worker, WAF ou outra alteração remota. Cada uma dessas operações continuará a exigir autorização técnica separada.

## 2. Funções propostas

- **Responsável pelo tratamento:** Luis Mesquita, em nome individual. Decide, em última instância, as finalidades, localização e enquadramento das câmaras e assume a responsabilidade por essas decisões.
- **Responsável técnico e operacional:** Luis Carreiro, em nome individual. Implementa e mantém as decisões aprovadas, mas não é apresentado como Encarregado de Proteção de Dados.
- **Contacto público e de privacidade:** `livesantamaria.project@gmail.com`.

## 3. Tratamentos e prazos propostos

| Tratamento | Finalidade | Fundamento proposto | Conservação |
|---|---|---|---|
| Câmaras em direto e Timelapse | Observação paisagística, meteorológica e marítima informal | Interesse legítimo, sujeito à ponderação e revisão de cada câmara | Capturas: 3 dias; últimos 10 diários; últimos 4 semanais. O direto usa apenas os segmentos/cache tecnicamente necessários e os prazos externos aplicáveis. |
| Métricas opcionais | Contar visitas e câmaras públicas abertas para compreender utilização e apoiar decisões operacionais | Consentimento prévio, livre e retirável | Sessão aleatória: 30 minutos; eventos brutos: 30 dias. |
| Contactos por email | Responder a pedidos, propostas e questões iniciadas pelo remetente | Diligências solicitadas, quando aplicável, e interesse legítimo em gerir correspondência | Até 12 meses após encerramento do assunto, com exceções legais ou de defesa de direitos. |
| Segurança e operação | Disponibilidade, diagnóstico, prevenção de abuso e prova das rotinas de retenção | Interesse legítimo, sujeito à ponderação | Logs controlados pelo projeto: máximo 14 dias; prazos dos fornecedores carecem de confirmação. |

## 4. Salvaguardas principais

- As câmaras são orientadas para evitar pessoas identificáveis, matrículas e detalhes privados.
- Não existe finalidade de vigilância, áudio, reconhecimento facial, biometria, leitura de matrículas ou seguimento.
- Cada câmara deve ser verificada antes de produção e após qualquer reposicionamento.
- As métricas só começam após aceitação explícita; recusar não limita o Site e retirar a aceitação bloqueia eventos futuros.
- A base de métricas não grava deliberadamente IP, User-Agent, email ou conta pessoal; os fornecedores técnicos podem tratar dados de rede necessários à entrega e segurança.
- Pedidos de direitos são recebidos no email do projeto, analisados proporcionalmente e respondidos, em regra, no prazo de um mês.
- Evidência operacional deve usar estados e contagens agregadas, sem dados individuais desnecessários.

## 5. Decisões solicitadas a Luis Mesquita

Ao aprovar, Luis Mesquita confirma que:

1. aceita exercer a função de responsável pelo tratamento em nome individual;
2. confirma as finalidades descritas para câmaras, Timelapse, métricas, email e segurança/operação;
3. aceita o consentimento como fundamento das métricas opcionais;
4. aceita, sob as salvaguardas descritas, o interesse legítimo proposto para câmaras/Timelapse e segurança/operação;
5. aprova os prazos `3 dias / 10 diários / 4 semanais`, `30 dias`, `14 dias` e `12 meses`;
6. aprova a Política de Privacidade em revisão como base do texto público, sujeita às condições pendentes abaixo;
7. aceita rever incidentes, novas câmaras e alterações materiais que lhe sejam escaladas por Luis Carreiro.

## 6. Provas locais disponíveis

- Site integrado no commit `dee959b`: Política, ligações, registos e gate de privacidade; suite local com 66 testes aprovados.
- Infra integrada no commit `69b3f6e`: configuração e runbook de retenção; contrato local confirma capturas `3`, diários `10` e semanais `4`.
- Estas provas são locais. Não demonstram aplicação nos nós, configuração dos fornecedores nem comportamento do ambiente publicado.

## 7. Condições ainda pendentes antes de produção

- confirmar os fornecedores realmente utilizados e os termos, regiões, transferências, subprocessadores e prazos aplicáveis às contas concretas;
- aplicar e verificar nos nós Timelapse a retenção `3/10/4`;
- aplicar e verificar o máximo de 14 dias em todos os logs controlados pelo projeto;
- concluir a avaliação individual de todas as câmaras;
- publicar primeiro em ambiente de teste, validar a Política, `#metricas`, consentimento, desktop, mobile e teclado;
- substituir “Versão para revisão” por versão e data efetivas apenas depois desta decisão;
- obter autorizações separadas para todas as operações remotas previstas no runbook.

Uma aprovação condicionada não converte estes pontos em factos concluídos. A promoção para produção permanece bloqueada até existirem provas.

## 8. Documentos para consulta

- [Política pública em revisão](../../privacidade.html)
- [Registo de tratamentos](processing-register.md)
- [Ponderação de câmaras e Timelapse](legitimate-interest-cameras.md)
- [Ponderação de segurança e operação](legitimate-interest-security.md)
- [Procedimento de exercício de direitos](data-subject-rights-procedure.md)
- [Revisão de fornecedores](provider-review-2026-08.md)
- [Checklist de alterações](privacy-change-checklist.md)
- [Runbook da audiência e gate de release](../operations/audience-v2-runbook.md)

## 9. Declaração de decisão

Assinalar uma opção:

- [ ] **Aprovo** as funções, finalidades, fundamentos, retenções, salvaguardas e texto público descritos, mantendo todas as condições e autorizações remotas separadas.
- [ ] **Aprovo com as condições abaixo**, sem autorizar produção enquanto não estiverem comprovadas.
- [ ] **Não aprovo** nesta versão.

Condições ou observações:

________________________________________________________________________

________________________________________________________________________

Nome: Luis Mesquita  
Data: ____________________  
Assinatura ou registo inequívoco da decisão: ______________________________
