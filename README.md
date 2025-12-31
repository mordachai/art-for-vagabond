# Art for Vagabond

Automatically applies token artwork to Vagabond NPCs using artwork from the [Too Many Tokens DND](https://github.com/IsThisMyRealName/too-many-tokens-dnd) module.

## ⚠️ Important Disclaimers

### About AI-Generated Artwork
This module uses artwork from **Too Many Tokens DND**, which contains AI-generated images. If you have concerns about using AI-generated art, **please do not use this module**.

**Alternative**: A future update will support custom JSON mappings, allowing you to point to your own artwork instead of the default tokens.

### About Vagabond & Land of the Blind
**Vagabond** is a game system published by **Land of the Blind**. This module is a **fan-made, community project** and is **not affiliated with, endorsed by, or supported by Land of the Blind** in any way.

<img width="1527" height="932" alt="image" src="https://github.com/user-attachments/assets/a4541371-cbbf-4d8e-af66-86ea38b9bf16" />

## Features

- **318 NPCs Mapped** - Nearly complete coverage of Vagabond Bestiary and Humanlike compendiums
- **Automatic Installation** - Dependencies install automatically via Foundry
- **Zero Configuration** - Works immediately after installation
- **Size-Appropriate Scaling** - Tokens automatically sized based on creature dimensions
- **Wildcard Randomization** - Multiple token variants for visual variety
- **Portrait & Token Art** - Applies both character portraits and token images

## Installation

### Manifest URL

   ```
   https://github.com/mordachai/art-for-vagabond/releases/latest/download/module.json
   ```
Foundry will automatically download and install both:
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

## License

This module is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

**Vagabond** is a trademark of Land of the Blind. This module is not affiliated with or endorsed by Land of the Blind.

Token artwork is from **Too Many Tokens DND** and is subject to their licensing terms.
