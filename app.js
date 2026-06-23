const videos = Array.from(document.querySelectorAll("video"));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const tileWall = document.querySelector("[data-tile-wall]");
const visibleVideos = new Map();
let scrollIdleTimer = 0;
let isScrolling = false;
const activeVideoRootMargin = "-15% 0px 0px 0px";
const supportsIntersectionObserver = "IntersectionObserver" in window;

const runWhenIdle = (callback) => {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(callback, { timeout: 1200 });
    return;
  }

  window.setTimeout(callback, 0);
};

const screenshotTiles = [
  "screenshots/1.png",
  "screenshots/2.png",
  "screenshots/3.png",
  "screenshots/4.png",
  "screenshots/5.png",
  "screenshots/6.png",
  "screenshots/7.png",
  "screenshots/8.png",
  "screenshots/9.png",
  "screenshots/10.png",
  "screenshots/11.png",
  "screenshots/12.png",
  "screenshots/13.png",
  "screenshots/14.png",
  "screenshots/15.png",
  "screenshots/16.png",
  "screenshots/17.png",
  "screenshots/18.png",
  "screenshots/19.png",
  "screenshots/20.png",
  "screenshots/21.png",
  "screenshots/22.png",
  "screenshots/23.png",
  "screenshots/24.png",
  "screenshots/25.png",
  "screenshots/26.png",
  "screenshots/27.png",
  "screenshots/28.png",
  "screenshots/29.png",
  "screenshots/30.png",
  "screenshots/31.png",
  "screenshots/32.png",
  "screenshots/33.png",
  "screenshots/34.png",
  "screenshots/35.png",
  "screenshots/36.png",
  "screenshots/37.png",
  "screenshots/38.png",
  "screenshots/39.png",
  "screenshots/40.png",
  "screenshots/41.png",
  "screenshots/42.png",
  "screenshots/43.png",
  "screenshots/44.png",
  "screenshots/45.png",
  "screenshots/46.png",
  "screenshots/47.png",
  "screenshots/48.png",
  "screenshots/49.png",
  "screenshots/50.png",
  "screenshots/51.png",
];

const shuffle = (items) => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
};

const buildTileGridSequences = (tiles, rowCount, rowTileCount) => {
  const rows = Array.from({ length: rowCount }, () => []);
  let deck = shuffle(tiles);
  let deckIndex = 0;

  for (let columnIndex = 0; columnIndex < rowTileCount; columnIndex += 1) {
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      if (deckIndex >= deck.length) {
        deck = shuffle(tiles);
        deckIndex = 0;
      }

      rows[rowIndex].push(deck[deckIndex]);
      deckIndex += 1;
    }
  }

  return rows;
};

const createTileImage = (src) => {
  const image = document.createElement("img");
  image.className = "tile-image";
  image.src = src;
  image.alt = "";
  image.width = 160;
  image.height = 90;
  image.decoding = "async";
  image.draggable = false;
  return image;
};

const buildTileWall = () => {
  if (!tileWall || screenshotTiles.length === 0) {
    return;
  }

  const rowCount = 5;
  const tilePitch = 168;
  const rowTileCount = Math.min(36, screenshotTiles.length);
  const tileDuration = 220;
  const rowSequences = buildTileGridSequences(
    screenshotTiles,
    rowCount,
    rowTileCount,
  );
  const fragment = document.createDocumentFragment();

  tileWall.textContent = "";

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = document.createElement("div");
    const track = document.createElement("div");
    const sequence = rowSequences[rowIndex];
    const sequenceDistance = sequence.length * tilePitch;
    const phaseOffset = rowIndex * 1.4;

    row.className = "tile-row";
    track.className = "tile-track";
    track.style.setProperty("--track-shift", `-${sequenceDistance}px`);
    track.style.setProperty("--tile-duration", `${tileDuration}s`);
    track.style.setProperty("--tile-delay", `${-phaseOffset}s`);

    [...sequence, ...sequence].forEach((src) => {
      track.append(createTileImage(src));
    });

    row.append(track);
    fragment.append(row);
  }

  tileWall.append(fragment);
};

const pauseVideo = (video) => {
  if (!video.paused) {
    video.pause();
  }
};

const getVideoClip = (video) => video.closest(".clip");

const setVideoLoading = (video, isLoading) => {
  const clip = getVideoClip(video);

  if (clip) {
    clip.classList.toggle("is-loading", isLoading);
  }
};

const setVideoPlaying = (video, isPlaying) => {
  const clip = getVideoClip(video);

  if (clip) {
    clip.classList.toggle("is-playing", isPlaying);
  }
};

const addPlayButton = (video) => {
  const clip = getVideoClip(video);

  if (!clip || clip.querySelector(".clip-play")) {
    return;
  }

  const button = document.createElement("button");
  button.className = "clip-play";
  button.type = "button";
  button.setAttribute("aria-label", "Play video");

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    pauseInactiveVideos(video);
    playVideo(video);
  });

  clip.append(button);
};

const hydrateVideo = (video) => {
  if (reduceMotion.matches || video.dataset.hydrated === "true") {
    return;
  }

  const source = video.dataset.src || video.getAttribute("src");

  if (!source) {
    return;
  }

  if (!video.getAttribute("src")) {
    video.src = source;
  }

  video.preload = "metadata";
  video.dataset.hydrated = "true";
  video.load();
};

const scheduleVideoHydration = (video) => {
  if (video.dataset.hydrated === "true") {
    return true;
  }

  if (reduceMotion.matches || video.dataset.loadScheduled === "true") {
    return false;
  }

  video.dataset.loadScheduled = "true";

  runWhenIdle(() => {
    delete video.dataset.loadScheduled;
    hydrateVideo(video);
  });

  return true;
};

const playVideo = (video) => {
  if (reduceMotion.matches || !video.paused) {
    return;
  }

  video.dataset.playRequested = "true";
  setVideoLoading(video, true);
  hydrateVideo(video);
  const playAttempt = video.play();

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      delete video.dataset.playRequested;
      setVideoLoading(video, false);
      setVideoPlaying(video, false);
    });
  }
};

const pauseInactiveVideos = (activeVideo) => {
  videos.forEach((video) => {
    if (video !== activeVideo) {
      pauseVideo(video);
    }
  });
};

const getViewportHeight = () => {
  const visualViewport = window.visualViewport;

  return (
    (visualViewport && visualViewport.height) ||
    window.innerHeight ||
    document.documentElement.clientHeight
  );
};

const refreshVisibleVideos = () => {
  const viewportHeight = getViewportHeight();
  const topBias = viewportHeight * 0.15;

  visibleVideos.clear();
  videos.forEach((video) => {
    const rect = video.getBoundingClientRect();
    const visibleHeight =
      Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, topBias);
    const ratio = Math.max(0, visibleHeight) / Math.max(rect.height, 1);

    if (ratio > 0) {
      visibleVideos.set(video, Math.min(ratio, 1));
      scheduleVideoHydration(video);
    } else {
      pauseVideo(video);
    }
  });
};

const getBestVisibleVideo = () => {
  let bestVideo = null;
  let bestRatio = 0;

  visibleVideos.forEach((ratio, video) => {
    if (ratio > bestRatio) {
      bestVideo = video;
      bestRatio = ratio;
    }
  });

  return bestRatio >= 0.45 ? bestVideo : null;
};

const playSettledVideo = () => {
  if (reduceMotion.matches || document.hidden) {
    pauseInactiveVideos(null);
    return;
  }

  const activeVideo = getBestVisibleVideo();
  pauseInactiveVideos(activeVideo);

  if (activeVideo) {
    playVideo(activeVideo);
  }
};

const scheduleSettledPlayback = () => {
  window.clearTimeout(scrollIdleTimer);

  scrollIdleTimer = window.setTimeout(() => {
    isScrolling = false;
    refreshVisibleVideos();
    playSettledVideo();
  }, 225);
};

const handleScroll = () => {
  if (!isScrolling) {
    isScrolling = true;
    pauseInactiveVideos(null);
  }

  scheduleSettledPlayback();
};

const videoPreloadObserver = supportsIntersectionObserver
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && scheduleVideoHydration(entry.target)) {
            videoPreloadObserver.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "900px 0px",
        threshold: 0,
      },
    )
  : null;

const videoObserver = supportsIntersectionObserver
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;

          if (entry.isIntersecting) {
            visibleVideos.set(video, entry.intersectionRatio);
            scheduleVideoHydration(video);
          } else {
            visibleVideos.delete(video);
            pauseVideo(video);
          }
        });

        if (!isScrolling) {
          scheduleSettledPlayback();
        }
      },
      {
        rootMargin: activeVideoRootMargin,
        threshold: [0, 0.25, 0.45, 0.65, 0.85, 1],
      },
    )
  : null;

videos.forEach((video) => {
  addPlayButton(video);
  video.addEventListener("loadstart", () => {
    setVideoLoading(video, video.dataset.playRequested === "true");
  });
  video.addEventListener("waiting", () => {
    setVideoLoading(
      video,
      video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA &&
        (!video.paused || video.dataset.playRequested === "true"),
    );
  });
  video.addEventListener("loadedmetadata", () => {
    if (video.paused && video.dataset.playRequested !== "true") {
      setVideoLoading(video, false);
    }
  });
  video.addEventListener("loadeddata", () => setVideoLoading(video, false));
  video.addEventListener("canplay", () => setVideoLoading(video, false));
  video.addEventListener("playing", () => {
    delete video.dataset.playRequested;
    setVideoLoading(video, false);
    setVideoPlaying(video, true);
  });
  video.addEventListener("pause", () => {
    delete video.dataset.playRequested;
    setVideoLoading(video, false);
    setVideoPlaying(video, false);
  });
  video.addEventListener("error", () => {
    delete video.dataset.playRequested;
    setVideoLoading(video, false);
    setVideoPlaying(video, false);
  });
  video.pause();

  if (supportsIntersectionObserver) {
    videoPreloadObserver.observe(video);
    videoObserver.observe(video);
  }
});

buildTileWall();

window.addEventListener("scroll", handleScroll, { passive: true });
window.addEventListener("load", scheduleSettledPlayback);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseInactiveVideos(null);
  } else {
    scheduleSettledPlayback();
  }
});

const handleReducedMotionChange = () => {
  videos.forEach((video) => {
    if (reduceMotion.matches) {
      pauseVideo(video);
    }
  });

  if (!reduceMotion.matches) {
    scheduleSettledPlayback();
  }
};

if (typeof reduceMotion.addEventListener === "function") {
  reduceMotion.addEventListener("change", handleReducedMotionChange);
} else if (typeof reduceMotion.addListener === "function") {
  reduceMotion.addListener(handleReducedMotionChange);
}
