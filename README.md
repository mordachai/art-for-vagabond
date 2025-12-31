# Art for Vagabond

Automatically applies token artwork to Vagabond NPCs using artwork from the [Too Many Tokens DND](https://github.com/IsThisMyRealName/too-many-tokens-dnd) module.

## ⚠️ Important Disclaimers

### About AI-Generated Artwork
This module uses artwork from **Too Many Tokens DND**, which contains AI-generated images. If you have concerns about using AI-generated art, **please do not use this module**.

**Alternative**: A future update will support custom JSON mappings, allowing you to point to your own artwork instead of the default tokens.

### About Vagabond & Land of the Blind
**Vagabond** is a game system published by **Land of the Blind**. This module is a **fan-made, community project** and is **not affiliated with, endorsed by, or supported by Land of the Blind** in any way.

## Features

- **318 NPCs Mapped** - Nearly complete coverage of Vagabond Bestiary and Humanlike compendiums
- **Automatic Installation** - Dependencies install automatically via Foundry
- **Zero Configuration** - Works immediately after installation
- **Size-Appropriate Scaling** - Tokens automatically sized based on creature dimensions
- **Wildcard Randomization** - Multiple token variants for visual variety
- **Portrait & Token Art** - Applies both character portraits and token images

## Installation

### Recommended Method: Manifest URL

1. Open **Foundry VTT** and navigate to your Vagabond world
2. Go to **Settings** → **Manage Modules** (or **Add-on Modules** from setup)
3. Click **Install Module**
4. Paste this URL into the **Manifest URL** field:
   ```
   https://github.com/mordachai/art-for-vagabond/releases/latest/download/module.json
   ```
5. Click **Install**
6. Foundry will automatically download and install both:
   - Art for Vagabond
   - Too Many Tokens DND (dependency)

### Enable the Module

1. In your Vagabond world, go to **Settings** → **Manage Modules**
2. Enable **"Art for Vagabond"**
3. Click **Save Module Settings**

**Note**: You do **NOT** need to enable "Too Many Tokens DND" - it only needs to be installed, not activated.

## How to Use

**It just works!** Once enabled:

1. Open any NPC from the **Vagabond Bestiary** or **Humanlike** compendiums
2. Drag them onto the canvas or into your actors directory
3. Token artwork is applied automatically - no configuration needed!

The module applies:
- **Character Portrait** - The first available token image as the actor portrait
- **Token Image** - Wildcard path for randomized token variants
- **Token Size** - Automatically scaled based on creature size (Small=1x1, Large=2x2, etc.)

## How It Works

This module uses Foundry VTT v13's **CompendiumArt** system to automatically apply artwork when actors are loaded from compendiums.

### Technical Overview

1. **Dependency**: Uses artwork from [Too Many Tokens DND](https://github.com/IsThisMyRealName/too-many-tokens-dnd)
2. **Mapping**: Maps Vagabond NPC names to corresponding creatures in Too Many Tokens
3. **Hook**: Listens to Foundry's `applyCompendiumArt` hook
4. **Application**: Automatically applies portrait and token images when NPCs are accessed

**Example Mappings:**
- `Ogler` → `Spectator`
- `Elemental, Water` → `Water Elemental`
- `Giant, Hill` → `Hill Giant`
- `Bandit` → `Bandit` (various dragonborn variants)

### Why Too Many Tokens DND Doesn't Need to Be Activated

The Too Many Tokens DND module only needs to be **installed** so that its image files are available on your system. Art for Vagabond directly references these image files - it doesn't need the Too Many Tokens module's functionality to be active.

Think of it like this:
- **Too Many Tokens DND** = Image library (just needs to exist)
- **Art for Vagabond** = Automatic art applicator (uses the library)

## Supported Compendiums

- `vagabond.bestiary` - 297 creatures
- `vagabond.humanlike` - 21 NPCs

**Total Coverage**: 318 out of 318 NPCs (100%)

## Requirements

- **Foundry VTT**: v13 or higher
- **System**: [Vagabond](https://foundryvtt.com/packages/vagabond)
- **Dependency**: [Too Many Tokens DND](https://github.com/IsThisMyRealName/too-many-tokens-dnd) (auto-installed)

## Customization (Future Feature)

In a future update, you'll be able to use **custom JSON mappings** to point to your own artwork instead of the default Too Many Tokens images. This will allow you to:

- Use your own token artwork
- Avoid AI-generated art if desired
- Customize specific creature appearances
- Use different art packs

Stay tuned for this feature!

## FAQ

**Q: Do I need to download Too Many Tokens separately?**
A: No! Foundry automatically installs it as a dependency when you install Art for Vagabond.

**Q: Do I need to enable Too Many Tokens DND?**
A: No! It only needs to be installed (not activated) for Art for Vagabond to work.

**Q: Can I use the online version of Too Many Tokens?**
A: No. This module requires the **Too Many Tokens DND** module to be installed locally. The online version is not compatible.

**Q: Will this work offline?**
A: Yes! Once both modules are installed, all images are stored locally on your computer.

**Q: What if I don't like AI-generated art?**
A: Then this module is not for you. All artwork comes from Too Many Tokens DND, which uses AI-generated images. A future update will support custom artwork mappings.

**Q: Can I use this with custom NPCs?**
A: Only NPCs from the official Vagabond Bestiary and Humanlike compendiums are mapped. Custom NPCs will use their default artwork.

**Q: Is this official Vagabond content?**
A: No. This is a fan-made module with no affiliation to Land of the Blind, the publisher of Vagabond.

## Credits

- **Module Created By**: [mordachai](https://github.com/mordachai)
- **Artwork From**: [Too Many Tokens DND](https://github.com/IsThisMyRealName/too-many-tokens-dnd) by [IsThisMyRealName](https://github.com/IsThisMyRealName)
- **Game System**: [Vagabond](https://www.landoftheblind.com/) by Land of the Blind

This module provides mapping data only. All token artwork belongs to its respective creators.

## Contributing

Found an issue or want to suggest improvements?

- **Issues**: https://github.com/mordachai/art-for-vagabond/issues
- **Pull Requests**: https://github.com/mordachai/art-for-vagabond/pulls

Suggestions for better token mappings are always welcome!

## License

This module is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

**Vagabond** is a trademark of Land of the Blind. This module is not affiliated with or endorsed by Land of the Blind.

Token artwork is from **Too Many Tokens DND** and is subject to their licensing terms.

## Changelog

### v1.1.0 (2025-12-31)
- Fixed CompendiumArt integration with correct system ID mapping
- Fixed portrait image paths to use actual filenames from directories
- Created combined mapping file for both compendiums
- Added automatic dependency installation for Too Many Tokens DND
- Improved documentation and disclaimers

### v1.0.0 (2025-12-30)
- Initial release
- 318 NPCs mapped (100% coverage)
- Automatic token application via CompendiumArt hooks
- Size-based token scaling
- Wildcard token randomization support
