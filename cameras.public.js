window.LSM_CAMERAS = [

  // ==========================================================
  // LIVE CAMERAS
  // ==========================================================

  {
    // ==========================================================
    // CAMPOS COMUNS
    // ==========================================================

    id: "cnsm",
    name: "Marina-Clube Naval",

    type: "hls",
    url: "https://cnsm.olho.mariense.pt/cam/camera.m3u8",
    refresh: null,

    preview: null,
    message: null,
    status: null,

    position: {
      lat: 36.9466,
      lon: -25.1477,
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
    id: "anjos-porto",
    name: "Anjos Porto",

    type: "hls",
    url: "https://anjos-cam.livesantamaria.org/cam1/index.m3u8",
    refresh: null,

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

    preview: null,
    message: null,
    status: null,

    position: {
      lat: 36.9526,
      lon: -25.1025,
      bearing: 100,
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
    id: "praia-poente",
    name: "Praia Poente",

    type: "hls",
    url: "https://praia-poente-cam.livesantamaria.org/cam1/index.m3u8",
    refresh: null,

    preview: null,
    message: null,
    status: null,

    position: {
      lat: 36.9509,
      lon: -25.0954,
      bearing: 270,
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

  // ==========================================================
  // FUTURE CAMERAS
  // ==========================================================

  {
    id: "anjos-blues",
    name: "Anjos Blues",

    type: "future",
    url: null,
    refresh: null,

    preview: "./assets/img/anjos-blues.jpg",
    message: "Apoio Assoc. Escravos da Cadainha",
    status: "Em preparação",

    position: {
      lat: 37.00799592,
      lon: -25.15193926,
      bearing: 50,
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
    id: "farol-malmerendo",
    name: "Farol Malmerendo",

    type: "future",
    url: null,
    refresh: null,

    preview: "./assets/img/farol-malmerendo.jpg",
    message: "Vista prevista sobre a costa sul",
    status: "Brevemente",

    position: {
      lat: 36.94055,
      lon: -25.15696,
      bearing: 180,
      fov: 65
    },

    sponsor: {
      name: "Restaurante O Ilhéu",
      logo: "./assets/sponsors/o-ilheu.png",
      url: "https://example.com",
      label: "Com o apoio de"
    },

    enabled: true
  },

  {
    id: "ilheu-lagoinhas",
    name: "Ilhéu das Lagoinhas",

    type: "future",
    url: null,
    refresh: null,

    preview: "./assets/img/ilheu-lagoinhas.jpg",
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

    preview: "./assets/img/farol-maia.jpeg",
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
  }

];