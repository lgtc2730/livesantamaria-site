# Live Santa Maria — Roadmap & Expansion
Versão: 1.0
Última atualização: 2026-05-23

---

# 1. Objetivo do Documento

Este documento reúne:
- ideias futuras;
- expansões previstas;
- melhorias técnicas;
- objetivos operacionais;
- evoluções do projeto Live Santa Maria.

Não é documentação técnica nem inventário operacional.

Serve como:
- roadmap;
- backlog estratégico;
- registo de ideias;
- visão de evolução do projeto.

---

# 2. Estados Utilizados

| Estado | Significado |
|---|---|
| Ideia | Apenas conceito |
| Estudo | A ser analisado |
| Planeado | Objetivo definido |
| Em preparação | Em implementação |
| Em teste | Testes ativos |
| Implementado | Em produção |
| Suspenso | Em pausa |
| Abandonado | Não será desenvolvido |

---

# 3. Expansão de Câmaras

## 3.1 Anjos Blues

| Campo | Valor |
|---|---|
| Estado | Em preparação |
| Prioridade | Alta |
| Tipo | Câmara pública |
| Objetivo | Vista costeira adicional |
| Sponsor | Por definir |
| Observações | |

---

## 3.2 Farol Malmerendo

| Campo | Valor |
|---|---|
| Estado | Planeado |
| Prioridade | Alta |
| Tipo | Câmara pública |
| Objetivo | Cobertura costa sul |
| Sponsor | Restaurante O Ilhéu |
| Observações | |

---

## 3.3 Ilhéu das Lagoinhas

| Campo | Valor |
|---|---|
| Estado | Em preparação |
| Prioridade | Média |
| Tipo | Câmara pública |
| Objetivo | Vista costa norte |
| Sponsor | |
| Observações | |

---

## 3.4 Farol da Maia

| Campo | Valor |
|---|---|
| Estado | À procura de sponsor |
| Prioridade | Média |
| Tipo | Câmara pública |
| Objetivo | Cobertura zona da Maia |
| Sponsor | Disponível |
| Observações | |

---

# 4. Melhorias Técnicas

## 4.1 Monitorização automática de streams

| Campo | Valor |
|---|---|
| Estado | Em evolução |
| Objetivo | Detetar streams mortas automaticamente |
| Observações | Health checks HLS/snapshot |

---

## 4.2 Health dashboard

| Campo | Valor |
|---|---|
| Estado | Em teste |
| Objetivo | Visualizar estado operacional |
| Observações | Control frontend |

---

## 4.3 WebRTC

| Campo | Valor |
|---|---|
| Estado | Estudo |
| Objetivo | Redução de latência |
| Observações | Dependente de infraestrutura |

---

## 4.4 Timelapse / histórico

| Campo | Valor |
|---|---|
| Estado | Ideia |
| Objetivo | Histórico visual meteorológico |
| Observações | |

---

## 4.5 Mobile optimization

| Campo | Valor |
|---|---|
| Estado | Contínuo |
| Objetivo | Melhor experiência mobile |
| Observações | |

---

# 5. Infraestrutura

## 5.1 Estrutura modular frontend

| Campo | Valor |
|---|---|
| Estado | Em implementação |
| Objetivo | Separação public/control/shared/assets |
| Observações | |

---

## 5.2 Inventário operacional

| Campo | Valor |
|---|---|
| Estado | Em implementação |
| Objetivo | Centralização operacional |
| Observações | Documento confidencial |

---

## 5.3 Gestão de passwords

| Campo | Valor |
|---|---|
| Estado | Implementado |
| Objetivo | Gestão segura partilhada |
| Observações | Bitwarden |

---

## 5.4 Branch LAB

| Campo | Valor |
|---|---|
| Estado | Implementado |
| Objetivo | Testes seguros antes de produção |
| Observações | Git branches |

---

# 6. Operação e Gestão

## 6.1 Sponsors

| Campo | Valor |
|---|---|
| Estado | Contínuo |
| Objetivo | Apoio financeiro/local |
| Observações | Sponsors por localização |

---

## 6.2 Expansão colaborativa

| Campo | Valor |
|---|---|
| Estado | Ideia |
| Objetivo | Novos parceiros locais |
| Observações | |

---

## 6.3 Procedimentos de recuperação

| Campo | Valor |
|---|---|
| Estado | Em documentação |
| Objetivo | Recuperação rápida de nós |
| Observações | |

---

# 7. Integrações Futuras

## 7.1 Blue Iris Hub

| Campo | Valor |
|---|---|
| Estado | Estudo |
| Objetivo | Consolidação de streams |
| Observações | Integração local/remota |

---

## 7.2 Home Assistant

| Campo | Valor |
|---|---|
| Estado | Ideia |
| Objetivo | Integração operacional |
| Observações | Possíveis automações |

---

## 7.3 Meteo avançada

| Campo | Valor |
|---|---|
| Estado | Ideia |
| Objetivo | Dados meteo locais avançados |
| Observações | |

---

# 8. Ideias Soltas

- Mapa interativo evoluído
- Heatmap meteorológico
- Overlay de condições meteo
- Snapshot automático periódico
- Histórico de uptime
- Estatísticas públicas
- Página de estado operacional
- API pública simples
- PWA/mobile app
- Alertas automáticos
- Integração YouTube Live
- Timelapse diário da ilha

---

# 9. Notas

- Nem todas as ideias serão implementadas.
- Este documento é evolutivo.
- Deve privilegiar simplicidade e sustentabilidade operacional.
- Alterações experimentais devem passar primeiro pela branch LAB.