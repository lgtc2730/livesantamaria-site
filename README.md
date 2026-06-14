# Live Santa Maria Site

Repositório do **site público Live Santa Maria**.

Este repositório contém o frontend público do projecto, incluindo a apresentação das câmaras, mapa, conteúdos visuais, assets públicos, sponsors e integração do Timelapse apresentado aos visitantes.

Regra do projecto:

> **Infra monta. Site mostra. Control monitoriza e comanda.**

---

## Função deste repositório

Este repositório contém a parte pública do projecto Live Santa Maria.

Inclui:

- página pública;
- apresentação das câmaras;
- mosaico de câmaras;
- mapa;
- fullscreen;
- conteúdos visuais;
- assets públicos;
- sponsors;
- integração com dados meteorológicos/METAR;
- integração pública do Timelapse.

---

## Separação entre repositórios

### `livesantamaria-infra`

Fonte de verdade para:

- instalação dos nós;
- scripts;
- serviços systemd;
- timers;
- templates;
- snapshots;
- configuração técnica;
- recuperação de nós;
- documentação operacional de infraestrutura.

### `livesantamaria-site`

Fonte de verdade para:

- site público;
- apresentação pública das câmaras;
- frontend público;
- assets públicos;
- Timelapse apresentado ao visitante;
- conteúdos públicos;
- roadmap público/estratégico do projecto.

### `livesantamaria-pwa`

Fonte de verdade para:

- LVSM Control;
- health dos nós;
- comandos operacionais;
- modo viagem/mobile;
- monitorização interna;
- operação técnica.

---

## Documentação principal

Documentação do site:

```text
docs/README.md