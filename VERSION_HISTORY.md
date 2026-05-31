# Live Santa Maria - Histórico de Versões

#########################################################################################
## freeze-v2.4 (2026-05-31)

### Meteorologia

* Integração do METAR oficial do Aeroporto de Santa Maria (LPAZ)
* Nova arquitetura meteorológica:

  * METAR = observação atual
  * Open-Meteo = previsão
* Hero alimentado por observações meteorológicas reais
* Substituição da condição meteorológica baseada exclusivamente em modelos de previsão

### Observação Atual

* Novo cartão "Observação Actual"
* Informação meteorológica em tempo real proveniente do METAR LPAZ
* Exibição de:

  * Estado do tempo
  * Temperatura
  * Ponto de orvalho
  * Pressão atmosférica (QNH)
  * Vento
  * Visibilidade
  * Cobertura de nuvens
  * Hora da observação

### Interpretação METAR

* Conversão automática dos códigos METAR para linguagem legível
* Suporte para fenómenos meteorológicos:

  * Nevoeiro (FG)
  * Névoa (BR)
  * Chuvisco (DZ)
  * Chuva (RA)
  * Trovoada (TS)
* Interpretação da cobertura de nuvens:

  * FEW → Pouco nublado
  * SCT → Parcialmente nublado
  * BKN → Muito nublado
  * OVC → Encoberto
  * SKC / CLR / CAVOK → Céu limpo

### Visibilidade

* Classificação qualitativa da visibilidade:

  * Excelente
  * Boa
  * Moderada
  * Reduzida
  * Muito reduzida

### Infraestrutura

* Implementação de proxy METAR através de Cloudflare Pages Functions
* Fallback automático entre múltiplas fontes METAR:

  * AviationWeather
  * NOAA
* Cache otimizada para reduzir pedidos externos

### Melhorias Gerais

* Maior fidelidade das condições meteorológicas observadas na ilha
* Melhor alinhamento entre a informação apresentada e as imagens das câmaras
* Aumento da credibilidade e precisão da componente meteorológica do Live Santa Maria

#########################################################################################
## freeze-v2.3 (2026-05-31)

### Branding

* Novo slogan:

  * "Uma janela para Santa Maria"
  * "Mar, céu e costa em tempo real"
* Hero simplificado e reorganizado

### Hero

* Adicionado contador de câmaras online
* Adicionado contador de localizações em preparação
* Melhorias de layout e responsividade

### Câmaras

* Novo tipo de câmara:

  * `promo`
* Uniformização dos estados:

  * LIVE
  * EM PREPARAÇÃO
  * OFFLINE

### Mapa Interativo V2

* Introdução do novo mapa interativo
* Visualização geográfica das câmaras
* Campo de visão (FOV) por localização
* Popup informativo com preview da câmara
* Integração de patrocinadores
* Abertura direta em fullscreen
* Posicionamento inteligente junto aos limites do mapa
* Melhor experiência em dispositivos móveis

### Timeline

* Nova secção Timeline
* Geração automática a partir de:

  * `commissioned`
  * `LVSM_MILESTONES`

### Estado do Mar

* Nova secção com dados Open-Meteo Marine
* Exibição de:

  * Ondulação
  * Período
  * Direção da ondulação

### Parceiros e Patrocinadores

* Nova secção "About"
* Geração automática a partir da configuração dos sponsors

### Promo Cards

* Introdução dos cartões promocionais para futuras localizações e objetivos do projeto

### Melhorias Gerais

* Ajustes de CSS para desktop e mobile
* Melhorias de usabilidade em telemóveis
* Correções de layout e estabilidade

#########################################################################################
## freeze-v2.2 (2026-05-30)

### Branding
- Novo logótipo LVSM
- Hero simplificado
- Nova identidade visual "Uma janela para Santa Maria"
- Ajustes de tipografia e imagem de topo

### Hero
- Contadores de câmaras online e em preparação
- Integração meteorológica simplificada
- Layout otimizado para desktop e mobile

### Câmaras
- Suporte para tipos:
  - hls
  - snapshot
  - future
  - promo
- Ordenação automática por categoria
- Melhorias no fullscreen
- Melhorias no slideshow

### Patrocínios
- Estrutura sponsor normalizada
- Nome do patrocinador nos cards
- URL clicável
- Logótipo nos cards
- Logótipo no slideshow
- Logótipo no fullscreen

### Mapa
- Novo mapa dinâmico da ilha
- Posicionamento geográfico das câmaras
- Orientação visual (FOV)
- Estados Live / Future / Offline
- Ajustes de posicionamento de etiquetas

### Mapa V2
- Popup informativo ao clicar nas câmaras
- Preview da localização
- Estado da câmara
- Informação de patrocinador
- Acesso direto ao fullscreen
- Layout adaptativo desktop/mobile
- Posicionamento inteligente junto aos limites do mapa

### Meteorologia
- Integração Open-Meteo
- Previsão diária
- Novo bloco Estado do Mar
  - Ondulação
  - Período
  - Direção

### Timeline
- Introdução da História da Rede
- Campo commissioned nas câmaras
- Suporte para milestones globais

### Apoiar o Projeto
- Nova secção de patrocínio
- Explicação do modelo de apoio
- Informação de contacto

### Mobile
- Correções do modo compacto
- Correções de expansão dos cards
- Correções de scroll
- Correções de resize
- Estabilização geral da experiência móvel

### Promo
- Novo tipo de card promocional
- Integração de vídeos externos
- Primeiro vídeo institucional da CMVP

### Estabilidade
- Baseline V2.2 considerada estável
- Hero funcional
- Mapa funcional
- Mobile funcional
- Sponsors funcionais
- Timeline funcional
- Promo cards funcionais

#########################################################################################
## freeze-v2.1 (2026-05-29)
- Frontend V2 estabilizado

#########################################################################################
## freeze-v2.1-beta (2026-05-28)
- Testes e estabilização

#########################################################################################
## freeze-v2.0 (2026-05-26)
- Primeira versão estável do Frontend V2

#########################################################################################
## freeze-v1.0 (2026-05-25)
- Versão estável do Frontend V1

#########################################################################################
## Initial Commit (2026-05-09)
- Criação da plataforma para o Projeto LVSM