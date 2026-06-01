/**
 * Art for Vagabond
 * CompendiumArt integration for Vagabond system
 * Based on art-for-daggerheart architecture
 */

const MODULE_ID = "art-for-vagabond";

// Cache for supported pack collections
let SUPPORTED_PACKS = new Set();
let MAPPING_DATA_LOADED = false;

// Cache: actual image URL -> cropped PIXI.Texture (freed on scene change)
const croppedTextureCache = new Map();

// Per-compendium ring subject scale settings
const PACK_RING_SETTINGS = {
  "vagabond.bestiary":  { key: "ringScaleBestiary",  label: "Bestiary",  default: 0.74 },
  "vagabond.humanlike": { key: "ringScaleHumanlike", label: "Humanlike", default: 0.80 },
};

/**
 * Register module settings (runs during init, before the game is ready)
 */
Hooks.once("init", () => {
  for (const { key, label, default: def } of Object.values(PACK_RING_SETTINGS)) {
    game.settings.register(MODULE_ID, key, {
      name: `${label}: Token Ring Subject Scale`,
      hint: `Controls how large the portrait appears inside the Dynamic Token Ring for ${label} NPCs. Lower values leave more space for the ring frame.`,
      scope: "world",
      config: true,
      type: Number,
      range: { min: 0.50, max: 1.00, step: 0.01 },
      default: def,
    });
  }
});

/**
 * Preload all mapping files and cache supported pack collections
 */
async function preloadMappingData() {
  const module = game.modules.get(MODULE_ID);
  const compendiumMappings = module?.flags?.compendiumArtMappings || {};

  SUPPORTED_PACKS.clear();

  console.log(`[${MODULE_ID}] Preloading mapping data...`);

  for (const [systemKey, config] of Object.entries(compendiumMappings)) {
    if (config?.mapping && typeof config.mapping === 'string') {
      try {
        console.log(`[${MODULE_ID}] Loading mapping file: ${config.mapping}`);
        const response = await fetch(config.mapping);
        if (response.ok) {
          const mappingData = await response.json();

          for (const packId of Object.keys(mappingData)) {
            SUPPORTED_PACKS.add(packId);
            console.log(`[${MODULE_ID}] Added supported pack: ${packId}`);
          }
        } else {
          console.warn(`[${MODULE_ID}] Failed to fetch mapping file ${config.mapping}: ${response.status}`);
        }
      } catch (error) {
        console.error(`[${MODULE_ID}] Error loading mapping file ${config.mapping}:`, error);
      }
    }
  }

  MAPPING_DATA_LOADED = true;
  console.log(`[${MODULE_ID}] Mapping data preloaded. Supported packs: ${Array.from(SUPPORTED_PACKS).join(', ')}`);
}

/**
 * Check if a pack collection is supported
 */
function isPackSupported(packId) {
  if (!MAPPING_DATA_LOADED) {
    console.warn(`[${MODULE_ID}] Mapping data not yet loaded`);
    return false;
  }
  return SUPPORTED_PACKS.has(packId);
}

/**
 * Apply compendium art - Foundry calls this hook with art data loaded from our mapping files
 */
Hooks.on("applyCompendiumArt", (documentClass, source, pack, art) => {
  const packId = pack?.metadata?.id ?? pack?.collection;

  console.log(`[${MODULE_ID}] 🎨 applyCompendiumArt hook fired!`, {
    packId,
    actorName: source?.name,
    hasArt: !!art,
    artKeys: art ? Object.keys(art) : []
  });

  if (!isPackSupported(packId)) {
    console.log(`[${MODULE_ID}] Pack ${packId} not supported, skipping`);
    return;
  }

  console.log(`[${MODULE_ID}] Processing art for ${source.name} in pack ${packId}`);

  // Apply portrait image
  if (typeof art?.actor === "string" && art.actor) {
    source.img = art.actor;
    console.log(`[${MODULE_ID}] Set portrait: ${art.actor}`);
  }

  // Apply prototype token data
  if (art?.prototypeToken) {
    source.prototypeToken = foundry.utils.mergeObject(
      source.prototypeToken || {},
      art.prototypeToken
    );

    // Apply ring subject scale from per-compendium settings
    const packSetting = PACK_RING_SETTINGS[packId];
    if (packSetting) {
      const scale = game.settings.get(MODULE_ID, packSetting.key);
      source.prototypeToken.ring ??= {};
      source.prototypeToken.ring.enabled = true;
      source.prototypeToken.ring.subject ??= {};
      source.prototypeToken.ring.subject.scale = scale;
      console.log(`[${MODULE_ID}] Set ring subject scale for ${packSetting.label}: ${scale}`);
    }

    console.log(`[${MODULE_ID}] Applied token settings:`, {
      width: source.prototypeToken.width,
      height: source.prototypeToken.height,
      texture: source.prototypeToken.texture?.src,
      randomImg: source.prototypeToken.randomImg
    });
  }

  console.log(`[${MODULE_ID}] ✅ Art applied for ${source.name}`);
});

/**
 * After Foundry loads and applies the texture to the token mesh, we intercept it,
 * draw a cropped version onto an offscreen canvas (removing the burned-in frame),
 * and swap the mesh texture. Results are cached by image URL.
 *
 * TMT images: 256×256px total, 230px inner portrait circle (13px frame on each side).
 * We keep the canvas at 256×256 so the ring system sees normal dimensions, and make
 * the frame area transparent so the Dynamic Token Ring artwork shows through.
 */
function applyTMTCrop(token) {
  const docSrc = token.document.texture?.src ?? "";
  if (!docSrc.includes("too-many-tokens")) return;

  const mesh = token.mesh;
  if (!mesh?.texture?.valid) return;

  // docSrc is stable for placed tokens (specific file, not a glob).
  // Using it as the cache key prevents re-cropping our own output on subsequent refreshes.
  if (croppedTextureCache.has(docSrc)) {
    const cached = croppedTextureCache.get(docSrc);
    if (mesh.texture !== cached) mesh.texture = cached;
    return;
  }

  const baseTex = mesh.texture.baseTexture;

  // Foundry v14 loads via createImageBitmap — allow HTMLImageElement, HTMLCanvasElement, and ImageBitmap
  const imgEl = baseTex.resource?.source;
  const canDraw = imgEl instanceof HTMLImageElement
    || imgEl instanceof HTMLCanvasElement
    || (typeof ImageBitmap !== "undefined" && imgEl instanceof ImageBitmap);

  if (!canDraw) {
    console.warn(`[${MODULE_ID}] Cannot crop: unhandled source type (${imgEl?.constructor?.name}) for`, docSrc);
    return;
  }

  // Keep the canvas at the original 256×256 size so the ring system sees normal dimensions.
  // Clip to the inner portrait circle (radius 115 = 230px diameter), making the burned-in
  // frame ring (13px) transparent. The Dynamic Token Ring draws its artwork over that
  // transparent band, so the ring frame is visible without covering the portrait.
  const SRC = 256, PORTRAIT_RADIUS = 115;

  const offscreen = document.createElement("canvas");
  offscreen.width = SRC;
  offscreen.height = SRC;
  const ctx = offscreen.getContext("2d");

  ctx.beginPath();
  ctx.arc(SRC / 2, SRC / 2, PORTRAIT_RADIUS, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(imgEl, 0, 0, SRC, SRC);

  const croppedTex = PIXI.Texture.from(offscreen);

  croppedTextureCache.set(docSrc, croppedTex);
  mesh.texture = croppedTex;

  console.log(`[${MODULE_ID}] Frame removed: ${docSrc.split("/").pop()}`);
}

Hooks.on("refreshToken", applyTMTCrop);

// Free cached textures when the scene unloads to avoid GPU memory leaks
Hooks.on("canvasTearDown", () => {
  for (const tex of croppedTextureCache.values()) tex.destroy(true);
  croppedTextureCache.clear();
});

/**
 * Initialize
 */
Hooks.once("ready", async () => {
  await preloadMappingData();

  console.log(`[${MODULE_ID}] Ready!`);
  console.log(`[${MODULE_ID}] Supported packs:`, Array.from(SUPPORTED_PACKS));

  console.log(`[${MODULE_ID}] Available actor compendiums:`);
  game.packs.forEach(pack => {
    if (pack.metadata.type === "Actor") {
      const packId = pack.metadata.id || pack.metadata.name;
      const supported = SUPPORTED_PACKS.has(packId) ? "✅" : "❌";
      console.log(`  ${supported} ${packId} (${pack.metadata.label})`);
    }
  });
});
