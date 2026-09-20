/**
 * Art for Vagabond
 * CompendiumArt integration for Vagabond system
 * Based on art-for-daggerheart architecture
 */

const MODULE_ID = "art-for-vagabond";

// Cache for supported pack collections
let SUPPORTED_PACKS = new Set();
let MAPPING_DATA_LOADED = false;

// Cache: actual image URL -> masked PIXI.Texture (freed on scene change)
const croppedTextureCache = new Map();

// Compendiums whose NPCs get the Dynamic Token Ring enabled
const RING_PACKS = new Set(["vagabond.bestiary", "vagabond.humanlike"]);

// Circular mask (white = keep, black = remove) applied over TMT's burned-in frame
const CROP_MASK_PATH = `modules/${MODULE_ID}/assets/crop_mask.webp`;

// Mask converted to real alpha (from luminance), ready for "destination-in" compositing
let cropMaskCanvas = null;

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

    if (RING_PACKS.has(packId)) {
      source.prototypeToken.ring ??= {};
      source.prototypeToken.ring.enabled = true;
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
 * Load the crop mask and convert its luminance to alpha. The mask file is plain RGB
 * (white circle on black), but "destination-in" compositing only reads alpha.
 */
async function loadCropMask() {
  const img = new Image();
  img.src = foundry.utils.getRoute(CROP_MASK_PATH);
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = imageData.data;
  for (let i = 0; i < px.length; i += 4) px[i + 3] = px[i];
  ctx.putImageData(imageData, 0, 0);

  cropMaskCanvas = canvas;
  console.log(`[${MODULE_ID}] Crop mask loaded`);
}

/**
 * After Foundry loads and applies the texture to the token mesh, we intercept it,
 * draw it onto an offscreen canvas through the crop mask (removing the burned-in frame),
 * and swap the mesh texture. Results are cached by image URL.
 *
 * The canvas keeps the source image's own size so the ring system sees normal
 * dimensions; everything outside the mask is transparent, so the Dynamic Token Ring
 * artwork shows through instead of TMT's own baked-in ring.
 */
function applyTMTCrop(token) {
  const docSrc = token.document.texture?.src ?? "";
  if (!docSrc.includes("too-many-tokens")) return;
  if (!cropMaskCanvas) return;

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

  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext("2d");

  ctx.drawImage(imgEl, 0, 0, width, height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(cropMaskCanvas, 0, 0, width, height);

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
 * The masked artwork is sized for the Dynamic Token Ring "Grid" fit mode. In "Standard"
 * mode Foundry rescales the subject and the portraits look wrong, so warn the GM
 * (only the GM can change this world setting).
 */
function checkRingFitMode() {
  if (!game.user.isGM) return;

  const gridMode = foundry.canvas.placeables.tokens.TokenRingConfig.CORE_TOKEN_RINGS_FIT_MODES.grid.id;
  if (game.settings.get("core", "dynamicTokenRingFitMode") === gridMode) return;

  ui.notifications.warn(
    "Art for Vagabond: token portraits only display correctly with the core setting "
    + "\"Dynamic Token Rings Fit Modes\" set to \"Grid\". Change it in Game Settings → Configure Settings → Core.",
    { permanent: true }
  );
  console.warn(`[${MODULE_ID}] Dynamic Token Rings Fit Mode is not "Grid"; tokens will not display correctly.`);
}

/**
 * Initialize
 */
Hooks.once("ready", async () => {
  checkRingFitMode();

  await preloadMappingData();

  try {
    await loadCropMask();
    // Tokens drawn before the mask finished loading were skipped; catch them up
    canvas.tokens?.placeables.forEach(applyTMTCrop);
  } catch (error) {
    console.error(`[${MODULE_ID}] Failed to load crop mask:`, error);
  }

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
