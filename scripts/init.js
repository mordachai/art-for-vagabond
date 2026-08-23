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
  "vagabond.bestiary":  { key: "ringScaleBestiary",  label: "Bestiary",  default: 1.00 },
  "vagabond.humanlike": { key: "ringScaleHumanlike", label: "Humanlike", default: 1.00 },
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

    // Enable the ring, but leave ring.subject.scale untouched: Foundry's TokenRing
    // shares that one scaleCorrection value between the subject texture AND the ring
    // frame UVs (see client/canvas/placeables/tokens/ring.mjs configureSize()), so
    // changing it grows/shrinks the ring itself instead of just the portrait inside it.
    // We bake the zoom into the cropped texture ourselves in applyTMTCrop() instead.
    const packSetting = PACK_RING_SETTINGS[packId];
    if (packSetting) {
      const scale = game.settings.get(MODULE_ID, packSetting.key);
      source.prototypeToken.ring ??= {};
      source.prototypeToken.ring.enabled = true;
      source.prototypeToken.flags ??= {};
      source.prototypeToken.flags[MODULE_ID] = { portraitScale: scale };
      console.log(`[${MODULE_ID}] Set portrait scale for ${packSetting.label}: ${scale}`);
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

// TMT's burned-in frame is just a thin gold trim in the outermost ~18px of a 256px
// image (radius ~110-128); everything inward, including the darker cloudy vignette
// some art has near its edge, is actual artwork, not frame. Verified visually across
// multiple samples (Aboleth, Killer Whale): clean up to radius ~105/128 (0.82), first
// gold sliver bleeds in around 108-112. Using 0.78 for margin. Expressed as a fraction
// of the half-size so it holds regardless of the source image's actual pixel dimensions.
const TMT_ART_RADIUS_FRACTION = 0.78;

/**
 * After Foundry loads and applies the texture to the token mesh, we intercept it,
 * draw a cropped version onto an offscreen canvas (removing the burned-in frame),
 * and swap the mesh texture. Results are cached by image URL.
 *
 * We keep the canvas at the source image's own size so the ring system sees normal
 * dimensions, and make the frame area transparent so the Dynamic Token Ring artwork
 * shows through instead of TMT's own baked-in ring.
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

  const width = imgEl.naturalWidth || imgEl.width;
  const height = imgEl.naturalHeight || imgEl.height;

  // Portrait zoom is baked in here (not via ring.subject.scale) so only the artwork
  // scales — see the comment in applyCompendiumArt for why.
  const portraitScale = token.document.getFlag(MODULE_ID, "portraitScale") ?? 1;
  const artRadius = Math.min(width, height) / 2 * TMT_ART_RADIUS_FRACTION * portraitScale;

  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext("2d");

  ctx.beginPath();
  ctx.arc(width / 2, height / 2, artRadius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(imgEl, 0, 0, width, height);

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
