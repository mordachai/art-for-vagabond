/**
 * Art for Vagabond
 * CompendiumArt integration for Vagabond system
 * Based on art-for-daggerheart architecture
 */

const MODULE_ID = "art-for-vagabond";

// Cache for supported pack collections
let SUPPORTED_PACKS = new Set();
let MAPPING_DATA_LOADED = false;

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

          // Add all pack collection IDs from this mapping file to our supported set
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

  // Check if this pack is supported
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
 * Initialize
 */
Hooks.once("ready", async () => {
  // Preload mapping data
  await preloadMappingData();

  console.log(`[${MODULE_ID}] Ready!`);
  console.log(`[${MODULE_ID}] Supported packs:`, Array.from(SUPPORTED_PACKS));

  // List available actor compendiums
  console.log(`[${MODULE_ID}] Available actor compendiums:`);
  game.packs.forEach(pack => {
    if (pack.metadata.type === "Actor") {
      const packId = pack.metadata.id || pack.metadata.name;
      const supported = SUPPORTED_PACKS.has(packId) ? "✅" : "❌";
      console.log(`  ${supported} ${packId} (${pack.metadata.label})`);
    }
  });
});
