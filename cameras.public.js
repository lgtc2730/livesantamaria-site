window.LSM_CAMERAS = [

  // ==========================================================
  // LIVE CAMERAS
  // ==========================================================

  {
    id: "cnsm",
    name: "Marina-Clube Naval",

    type: "hls",
    url: "https://cnsm.olho.mariense.pt/cam/camera.m3u8",
    refresh: null,
    fallbackImage: "./assets/fallback/cnsm.jpg",

    preview: null,
    message: null,
    status: null,

    position: {
      lat: 36.946593,
      lon: -25.147747,
      bearing: 180,
      fov: 65
    },

    sponsor: {
      name: "Clube Naval Santa Maria",
      logo: null,
      url: null,
      label: null
    },

    enabled: true
  },

  {
    id: "anjos-porto",
    name: "Anjos Porto",

    type: "hls",
    url: "https://anjos-cam.livesantamaria.org/cam1/index.m3u8",
    refresh: null,
    fallbackImage: "./assets/fallback/anjos-porto.jpg",

    preview: null,
    message: null,
    status: null,

    position: {
      lat: 37.0039,
      lon: -25.1578,
      bearing: 0,
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
    name: "São Lourenço Norte",

    type: "snapshot",
    url: "https://www.spotazores.com/camaras/SMALOU01/QXGAcurrent.jpg",
    refresh: 15000,
    fallbackImage: "./assets/fallback/slourenco-norte.jpg",

    preview: null,
    message: null,
    status: null,

    position: {
      lat: 36.9843,
      lon: -25.0503,
      bearing: 330,
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
    id: "slourenco-sul",
    name: "São Lourenço Sul",

    type: "hls",
    url: "https://slourenco-sul-cam.livesantamaria.org/cam1/index.m3u8",
    refresh: null,
    fallbackImage: "./assets/fallback/slourenco-sul.jpg",

    preview: null,
    message: null,
    status: null,

    position: {
      lat: 36.9952,
      lon: -25.0554,
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
    id: "praia-nascente",
    name: "Praia Nascente",

    type: "snapshot",
    url: "https://www.spotazores.com/camaras/SMAFOR01/VGAcurrent.jpg",
    refresh: 15000,
    fallbackImage: "./assets/fallback/praia-nascente.jpg",

    preview: null,
    message: null,
    status: null,

    position: {
      lat: 36.952592,
      lon: -25.102554,
      bearing: 100,
      fov: 65
    },

    sponsor: {
      name: "SpotAzores",
      logo: null,
      url: null,
      label: null
    },

    enabled: true
  },

  {
    id: "praia-poente",
    name: "Praia Poente",

    type: "hls",
    url: "https://praia-poente-cam.livesantamaria.org/cam1/index.m3u8",
    refresh: null,
    fallbackImage: "./assets/fallback/praia-poente.jpg",

    preview: null,
    message: null,
    status: null,

    position: {
      lat: 36.950908,
      lon: -25.095411,
      bearing: 270,
      fov: 65
    },

    sponsor: {
      name: "Deolinda Melo",
      logo: null,
      url: null,
      label: "Apoio de"
    },

    enabled: true
  },

  // ==========================================================
  // FUTURE CAMERAS
  // ==========================================================

  {
    id: "anjos-blues",
    name: "Anjos Blues",

    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/anjos-blues.jpg",
    message: null,
    status: "Em preparação",

    position: {
      lat: 37.00799592,
      lon: -25.15193926,
      bearing: 50,
      fov: 65
    },

    sponsor: {
      name: "Assoc. Escravos da Cadainha",
      logo: null,
      url: null,
      label: "Apoio de"
    },

    enabled: true
  },

  {
    id: "marina-club-motard",
    name: "Marina-Club Motard",

    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/marina-club-motard.jpeg",
    message: null,
    status: "Brevemente",

    position: {
      lat: 36.946241,
      lon: -25.146948,
      bearing: 180,
      fov: 65
    },

    sponsor: {
      name: "Clube Motard Santa Maria",
      logo: "./assets/sponsors/o-ilheu.png",
      url: "https://example.com",
      label: "Sponsor"
    },

    enabled: true
  },

  {
    id: "pico-alto-nascente",
    name: "Pico Alto Nascente",

    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/pico-alto-nascente.jpeg",
    message: null,
    status: "Brevemente",

    position: {
      lat: 36.946241,
      lon: -25.146948,
      bearing: 180,
      fov: 65
    },

    sponsor: {
      name: null,
      logo: null,
      url: null,
      label: "Sponsor"
    },

    enabled: false
  },

  {
    id: "pico-alto-poente",
    name: "Pico Alto Poente",

    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/pico-alto-poente.jpeg",
    message: null,
    status: "Brevemente",

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
    id: "ilheu-lagoinhas",
    name: "Ilhéu das Lagoinhas",

    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/ilheu-lagoinhas.jpg",
    message: "Futura vista sobre o ilhéu e costa norte",
    status: "Aguarda patrocínio",

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
    id: "farol-maia",
    name: "Maia, Farol Gonçalo Velho",

    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/farol-maia.jpeg",
    message: "Vista sobre a Maia",
    status: "Brevemente",

    position: {
      lat: 36.930009,
      lon: -25.016871,
      bearing: 360,
      fov: 65
    },

    sponsor: {
      name: "Disponível para apoio",
      logo: null,
      url: "mailto:livesantamaria.project@gmail.com",
      label: "Sponsor"
    },

    enabled: true

  },

  {
    id: "porto-do-castelo",
    name: "Porto do Castelo",

    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/porto-do-castelo.jpeg",
    message: "Vista sobre o Porto do Castelo",
    status: "Brevemente",

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
    id: "maia-sul",
    name: "Maia Sul",

    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/maia-sul.jpeg",
    message: "Brevemente",
    status: "Aguarda Patrocinio",

    position: {
      lat: 36.938183,
      lon: -25.015193,
      bearing: 180,
      fov: 65
    },

    sponsor: {
      name: "null",
      logo: null,
      url: "mailto:livesantamaria.project@gmail.com",
      label: "Sponsor"
    },

    enabled: true
  },

  {
    id: "maia-norte",
    name: "Maia Norte",

    type: "future",
    url: null,
    refresh: null,
    fallbackImage: null,

    preview: "./assets/previews/maia-norte.jpeg",
    message: "Brevemente",
    status: "Brevemente",

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
  }

];