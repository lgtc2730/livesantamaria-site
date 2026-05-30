window.LVSM_CAMERAS = [

  // ==========================================================
  // LIVE CAMERAS
  // ==========================================================

  {
    id: "cnsm",
    name: "Marina-Clube Naval",
    region: "Sul",
    type: "hls",
    url: "https://cnsm.olho.mariense.pt/cam/camera.m3u8",
    refresh: null,
    fallbackImage: "./assets/fallback/cnsm.jpg",

    preview: null,
    message: null,
    status: null,
    commissioned: "2024-05",
    position: {
      lat: 36.946593,
      lon: -25.147747,
      bearing: 200,
      fov: 90
    },

    sponsor: {
      name: "Clube Naval Santa Maria",
      logo: null,
      url: "https://www.cnsantamaria.pt/",
      label: "Sponsor"
    },

    enabled: true
  },

  {
    id: "anjos-porto",
    name: "Anjos-Porto",
    region: "Norte",
    type: "hls",
    url: "https://anjos-cam.livesantamaria.org/cam1/index.m3u8",
    refresh: null,
    fallbackImage: "./assets/fallback/anjos-porto.jpg",

    preview: null,
    message: null,
    status: null,
    commissioned: "2025-04",

    position: {
      lat: 37.0039,
      lon: -25.1578,
      bearing: 0,
      fov: 100
    },

    sponsor: {
      name: "Ricardo Sebastião",
      logo: null,
      url: null,
      label: "Sponsor"
    },

    enabled: true
  },

  {
    id: "slourenco-norte",
    name: "São Lourenço-Norte",
    region: "Este",
    type: "future", // "snapshot",
    url: null, // "https://www.spotazores.com/camaras/SMALOU01/QXGAcurrent.jpg"
    refresh: 15000,
    fallbackImage: "./assets/fallback/slourenco-norte.jpg",

    preview: null,
    message: null,
    status: "OFFLINE",
    commissioned: "2023-01",

    position: {
      lat: 36.9843,
      lon: -25.0503,
      bearing: 330,
      fov: 65
    },

    sponsor: {
      name: "SpotAzores",
      logo: null,
      url: "https://spotazores.com/",
      label: "Em parceria com"
    },

    enabled: true
  },

  {
    id: "slourenco-sul",
    name: "São Lourenço-Sul",
    region: "Este",
    type: "hls",
    url: "https://slourenco-sul-cam.livesantamaria.org/cam1/index.m3u8",
    refresh: null,
    fallbackImage: "./assets/fallback/slourenco-sul.jpg",

    preview: null,
    message: null,
    status: null,
    commissioned: "2024-05",

    position: {
      lat: 36.9952,
      lon: -25.0554,
      bearing: 150,
      fov: 90
    },

    sponsor: {
      name: "Deolinda Melo",
      logo: null,
      url: null,
      label: "Apoio de"
    },

    enabled: true
  },

  {
    id: "praia-nascente",
    name: "Praia-Nascente",
    region: "Sul",
    type: "future", // "snapshot",
    url: "https://www.spotazores.com/camaras/SMAFOR01/VGAcurrent.jpg",
    refresh: 15000,
    fallbackImage: "./assets/fallback/praia-nascente.jpg",

    preview: null,
    message: null,
    status: "OFFLINE", // null,
    commissioned: "2023-05",

    position: {
      lat: 36.952592,
      lon: -25.102554,
      bearing: 100,
      fov: 65
    },

    sponsor: {
      name: "SpotAzores",
      logo: null,
      url: "https://spotazores.com/",
      label: "Em parceria com"
    },

    enabled: true
  },

  {
    id: "praia-poente",
    name: "Praia-Poente",
    region: "Sul",
    type: "hls",
    url: "https://praia-poente-cam.livesantamaria.org/cam1/index.m3u8",
    refresh: null,
    fallbackImage: "./assets/fallback/praia-poente.jpg",

    preview: null,
    message: null,
    status: null,
    commissioned: "2025-05",
    
    position: {
      lat: 36.950908,
      lon: -25.095411,
      bearing: 270,
      fov: 65
    },

    sponsor: {
      name: "Apartamentos Mar e Sol",
      logo: null,
      url: "https://www.apartamentosmaresol.com/",
      label: "Apoio de"
    },

    enabled: true
  },

  // ==========================================================
  // FUTURE CAMERAS
  // ==========================================================

  {
    id: "marina-club-motard",
    name: "Marina-Club Motard",
    region: "Sul",
    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/marina-club-motard.jpeg",
    message: null,
    status: "Em preparação",
    commissioned: null,

    position: {
      lat: 36.946241,
      lon: -25.146948,
      bearing: 160,
      fov: 90
    },

    sponsor: {
      name: "Clube Motard Santa Maria",
      logo: "./assets/sponsors/clube-motard.jpeg",
      url: null,
      label: "Sponsor"
    },

    enabled: true
  },

  {
    id: "anjos-blues",
    name: "Anjos-Blues",
    region: "Norte",
    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/anjos-blues.jpg",
    message: null,
    status: "Em preparação",
    commissioned: null,

    position: {
      lat: 37.00799592,
      lon: -25.15193926,
      bearing: 50,
      fov: 65
    },

    sponsor: {
      name: "Assoc. Escravos da Cadeinha",
      logo: "./assets/sponsors/escravos-da-cadeinha.jpeg",
      url: "https://escravosdacadeinha.com/",
      label: "Apoio de"
    },

    enabled: true
  },

  {
    id: "ilheu-lagoinhas",
    name: "Ilhéu das Lagoinhas",
    region: "Norte",
    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/ilheu-lagoinhas.jpg",
    message: "Futura vista sobre o ilhéu e costa norte",
    status: "Aguarda patrocínio",
    commissioned: null,

    position: {
      lat: 37.005331,
      lon: -25.068010,
      bearing: 310,
      fov: 65
    },

    sponsor: {
      name: null,
      logo: null,
      url: null,
      label: null
    },

    enabled: true
  },

  {
    id: "maia-sul",
    name: "Maia-Sul",
    region: "Este",
    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/maia-sul.jpeg",
    message: "Vista sobre a Baia e Farol da Maia",
    status: "Aguarda Patrocinio",
    commissioned: null,

    position: {
      lat: 36.938183,
      lon: -25.015193,
      bearing: 180,
      fov: 65
    },

    sponsor: {
      name: null,
      logo: null,
      url: null,
      label: null
    },

    enabled: true
  },

  {
    id: "maia-norte",
    name: "Maia-Norte",
    region: "Este",
    type: "future",
    url: null,
    refresh: null,
    fallbackImage: "./assets/fallback/maia-norte.jpeg",

    preview: null, //"http://anjos.olho.mariense.pt/maia/camera.m3u8",
    message: null,
    status: "Em preparação",
    commissioned: "2025-05",
    
    position: {
      lat: 36.944280,
      lon: -25.016115,
      bearing: 360,
      fov: 65
    },

    sponsor: {
      name: "Carlos Andrade e Rui Chaves",
      logo: null,
      url: null,
      label: "Sponsor"
    },

    enabled: true
  },

  {
    id: "farol-maia",
    name: "Maia-Farol",
    region: "Este",
    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/farol-maia.jpeg",
    message: "Vista sobre a Maia",
    status: "Brevemente",
    commissioned: null,

    position: {
      lat: 36.930009,
      lon: -25.016871,
      bearing: 360,
      fov: 65
    },

    sponsor: {
      name: "Ricardo Sebastião",
      logo: null,
      url: null,
      label: "Sponsor"
    },

    enabled: true

  },

  {
    id: "porto-do-castelo",
    name: "Porto Castelo",
    region: "Sul",
    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/porto-do-castelo.jpeg",
    message: "Vista sobre o Porto do Castelo",
    status: "Brevemente",
    commissioned: null,

    position: {
      lat: 36.929928,
      lon: -25.016833,
      bearing: 180,
      fov: 65
    },

    sponsor: {
      name: "Ricardo Sebastião",
      logo: null,
      url: null,
      label: "Sponsor"
    },

    enabled: true
  },

  {
    id: "pico-alto-nascente",
    name: "Pico Alto-Nascente",
    region: "Centro",
    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/pico-alto-nascente.jpeg",
    message: null,
    status: "Aguarda patrocínio",
    commissioned: null,

    position: {
      lat: 36.979503,
      lon: -25.090873,
      bearing: 90,
      fov: 90
    },

    sponsor: {
      name: null,
      logo: null,
      url: null,
      label: "Sponsor"
    },

    enabled: true
  },

  {
    id: "pico-alto-poente",
    name: "Pico Alto-Poente",
    region: "Centro",
    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/pico-alto-poente.jpeg",
    message: null,
    status: "Aguarda patrocínio",
    commissioned: null,

    position: {
      lat: 36.979503,
      lon: -25.090873,
      bearing: 270,
      fov: 65
    },

    sponsor: {
      name: null,
      logo: null,
      url: null,
      label: "Sponsor"
    },

    enabled: true
  },  

  {
    id: "promo-cmvp",
    name: "Santa Maria, Açores",
    region: null,
    type: "promo",
    url: "https://www.youtube.com/watch?v=W9SgW4EWn30&t=9s",
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/explore-sma.jpeg",
    message: "Descubra a beleza autêntica da ilha do sol.",
    status: "Ver vídeo",

    position: null,

    sponsor: {
      name: "Câmara Municipal de Vila do Porto",
      logo: "./assets/sponsors/cmvp.png",
      url: "https://www.cm-viladoporto.pt",
      label: "Vídeo promocional"
    },

    enabled: true
  }

];

window.LVSM_MILESTONES = [
  {
    date: "2026-05",
    icon: "🚀",
    title: "Arranque da rede pública LVSM",
    text: "Primeira versão pública do Live Santa Maria com câmaras em directo, previsão meteorológica, estado do mar e mapa da rede."
  },

  {
    date: "2026-07",
    icon: "🏔️",
    title: "Cobertura do Pico Alto",
    text: "Entrada em serviço das câmaras do Pico Alto."
  }

];