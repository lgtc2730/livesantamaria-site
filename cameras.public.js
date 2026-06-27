window.LVSM_CAMERAS = [

  // ==========================================================
  // LIVE SANTA MARIA CAMERAS
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
    status: "Em preparaÃ§Ã£o",
    publicVisibility: "staging", // public-aparece / staging-aparece com aviso / hidden-nÃ£o aparece
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
    publicVisibility: "public", // public-aparece / staging-aparece com aviso / hidden-nÃ£o aparece
    commissioned: "2024-05",
    position: {
      lat: 36.946593,
      lon: -25.147747,
      bearing: 200,
      fov: 90
    },

    sponsor: {
      name: "Clube Naval Santa Maria",
      logo: "./assets/sponsors/cnsm.jpeg",
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
    publicVisibility: "public",
    commissioned: "2025-04",

    position: {
      lat: 37.0039,
      lon: -25.1578,
      bearing: 0,
      fov: 100
    },

    sponsor: {
      name: "Ricardo SebastiÃ£o",
      logo: null,
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
    status: "Em preparaÃ§Ã£o",
    publicVisibility: "staging",
    commissioned: null,

    position: {
      lat: 37.00799592,
      lon: -25.15193926,
      bearing: 50,
      fov: 65
    },

    sponsor: {
      name: "Escravos da Cadeinha",
      logo: "./assets/sponsors/escravos-cadeinha.jpg",
      url: "https://escravosdacadeinha.com/",
      label: "Apoio de"
    },

    enabled: true
  },

  {
    id: "ilheu-lagoinhas",
    name: "IlhÃ©u das Lagoinhas",
    region: "Norte",
    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/ilheu-lagoinhas.jpg",
    message: "Futura vista sobre o ilhÃ©u e costa norte",
    status: "Aguarda patrocÃ­nio",
    commissioned: null,
    publicVisibility: "staging",

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
    id: "slourenco-norte",
    name: "SÃ£o LourenÃ§o-Norte",
    region: "Este",
    type: "snapshot",
    url: "https://www.spotazores.com/camaras/SMALOU01/QXGAcurrent.jpg",
    refresh: 15000,
    fallbackImage: "./assets/fallback/slourenco-norte.jpg",

    preview: null,
    message: null,
    status: null,
    publicVisibility: "public",
    commissioned: "2023-01",

    position: {
      lat: 36.9843,
      lon: -25.0503,
      bearing: 330,
      fov: 65
    },

    sponsor: {
      name: "SpotAzores",
      logo: "./assets/sponsors/spotazores.jpeg",
      url: "https://spotazores.com/",
      label: "Em parceria com"
    },

    enabled: true
  },

  {
    id: "slourenco-sul",
    name: "SÃ£o LourenÃ§o-Sul",
    region: "Este",
    type: "hls",
    url: "https://slourenco-sul-cam.livesantamaria.org/cam1/index.m3u8",
    refresh: null,
    fallbackImage: "./assets/fallback/slourenco-sul.jpg",

    preview: null,
    message: null,
    status: null,
    publicVisibility: "public",
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
    publicVisibility: "staging",

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
    status: "Em preparaÃ§Ã£o",
    commissioned: "2025-05",
    publicVisibility: "staging",
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
    publicVisibility: "staging", // public-aparece / staging-aparece com aviso / hidden-nÃ£o aparece
    commissioned: null,

    position: {
      lat: 36.930009,
      lon: -25.016871,
      bearing: 360,
      fov: 65
    },

    sponsor: {
      name: "Ricardo SebastiÃ£o",
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
      name: "Ricardo SebastiÃ£o",
      logo: null,
      url: null,
      label: "Sponsor"
    },

    enabled: true
  },

  {
    id: "praia-nascente",
    name: "Praia-Nascente",
    region: "Sul",
    type: "snapshot",
    url: "https://www.spotazores.com/camaras/SMAFOR01/VGAcurrent.jpg",
    refresh: 15000,
    fallbackImage: "./assets/fallback/praia-nascente.jpg",

    preview: null,
    message: null,
    status: null,
    publicVisibility: "public", // public-aparece / staging-aparece com aviso / hidden-nÃ£o aparece
    commissioned: "2023-05",

    position: {
      lat: 36.952592,
      lon: -25.102554,
      bearing: 100,
      fov: 65
    },

    sponsor: {
      name: "SpotAzores",
      logo: "./assets/sponsors/spotazores.jpeg",
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
    publicVisibility: "hidden", // public-aparece / staging-aparece com aviso / hidden-nÃ£o aparece
    commissioned: "2025-05",
    
    position: {
      lat: 36.950908,
      lon: -25.095411,
      bearing: 270,
      fov: 65
    },

    sponsor: {
      name: "Apartamentos Mar e Sol",
      logo: "./assets/sponsors/apartamentos-maresol.jpeg",
      url: "https://www.apartamentosmaresol.com/",
      label: "Apoio de"
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
    status: "Aguarda patrocÃ­nio",
    commissioned: null,
    publicVisibility: "staging",

    position: {
      lat: 36.979503,
      lon: -25.090873,
      bearing: 90,
      fov: 90
    },

    sponsor: {
      name: "NAV Portugal",
      logo: "./assets/sponsors/nav-portugal.jpeg",
      url: "https://www.nav.pt/",
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
    status: "Aguarda patrocÃ­nio",
    commissioned: null,
    publicVisibility: "staging",
    position: {
      lat: 36.979503,
      lon: -25.090873,
      bearing: 270,
      fov: 65
    },

    sponsor: {
      name: "NAV Portugal",
      logo: "./assets/sponsors/nav-portugal.jpeg",
      url: "https://www.nav.pt/",
      label: "Sponsor"
    },

    enabled: true
  },  

  {
    id: "aeroporto",
    name: "Aeroporto",
    region: "Centro",
    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/aeroporto.jpeg",
    message: null,
    status: "Aguarda patrocÃ­nio",
    commissioned: null,
    publicVisibility: "staging",

    position: {
      lat: 36.975991,
      lon: -25.166998,
      bearing: 160,
      fov: 90
    },

    sponsor: {
      name: "Aeroporto de Santa Maria",
      logo: "./assets/sponsors/vinci.jpeg",
      url: "https://www.ana.pt/pt",
      label: "Sponsor"
    },

    enabled: true
  },

  {
    id: "promo-cmvp",
    name: "Santa Maria, AÃ§ores",
    region: null,
    type: "promo",
    url: "https://www.youtube.com/watch?v=W9SgW4EWn30&t=9s",
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/explore-sma.jpeg",
    message: "Descubra a beleza autÃªntica da ilha do sol.",
    status: "Ver vÃ­deo",

    position: null,

    sponsor: {
      name: "CÃ¢mara Municipal de Vila do Porto",
      logo: "./assets/sponsors/cmvp.png",
      url: "https://www.cm-viladoporto.pt",
      label: "VÃ­deo promocional"
    },

    enabled: true
  },

  {
    id: "promo-villa-natura",
    name: "Villa Natura",
    region: null,
    type: "promo",
    url: "https://www.youtube.com/watch?v=T9Ok5fD-4Aw",
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/villa-natura.jpg",
    message: "Ecoturismo e experiÃªncias autÃªnticas em Santa Maria.",
    status: "Ver vÃ­deo",

    position: null,

    sponsor: {
      name: "Villa Natura",
      logo: "./assets/sponsors/villa-natura.png",
      url: "https://villanaturaazores.com/pt/",
      label: "VÃ­deo promocional"
    },

    enabled: true
  }

  
];

window.LVSM_MILESTONES = [
  {
    date: "2026-05",
    icon: "ðŸš€",
    title: "Arranque da rede pÃºblica LVSM",
    text: "Primeira versÃ£o pÃºblica do Live Santa Maria com cÃ¢maras em directo, previsÃ£o meteorolÃ³gica, estado do mar e mapa da rede."
  },

  {
    date: "2026-05",
    icon: "âœ¨",
    title: "Frontend V2.2",
    text: "IntroduÃ§Ã£o do estado do mar, milestones, sponsors, promo cards e identidade visual reforÃ§ada."
  }

//  {
//    date: "2026-07",
//    icon: "ðŸ”ï¸",
//    title: "Cobertura do Pico Alto",
//    text: "Entrada em serviÃ§o das cÃ¢maras do Pico Alto."
//  }

];
