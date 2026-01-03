const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '../public/logo.png');
const ICONS_DIR = path.join(__dirname, '../public/icons');
const SPLASH_DIR = path.join(__dirname, '../public/splash');

// Icon sizes needed for PWA (PNG format - standard for PWA manifests)
const iconSizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// Apple Touch Icon sizes (PNG format)
const appleTouchIconSizes = [
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
];

// Splash screen sizes for iOS devices (PNG format)
const splashScreens = [
  { width: 750, height: 1334, name: 'apple-splash-750-1334.png' }, // iPhone 8, 7, 6s, 6
  { width: 828, height: 1792, name: 'apple-splash-828-1792.png' }, // iPhone 11, XR
  { width: 1170, height: 2532, name: 'apple-splash-1170-2532.png' }, // iPhone 12/13/14 Pro
  { width: 1179, height: 2556, name: 'apple-splash-1179-2556.png' }, // iPhone 14 Pro Max, 15 Pro Max
  { width: 1290, height: 2796, name: 'apple-splash-1290-2796.png' }, // iPhone 14 Plus, 15 Plus
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');

  // Ensure directories exist
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Generate standard icons (PNG)
  for (const { size, name } of iconSizes) {
    await sharp(LOGO_PATH)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(ICONS_DIR, name));
    console.log(`  ✓ Generated ${name}`);
  }

  // Generate Apple Touch Icons (PNG)
  for (const { size, name } of appleTouchIconSizes) {
    await sharp(LOGO_PATH)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(ICONS_DIR, name));
    console.log(`  ✓ Generated ${name}`);
  }

  // Generate favicon
  await sharp(LOGO_PATH)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(__dirname, '../public/favicon.png'));
  console.log('  ✓ Generated favicon.png');
}

async function generateSplashScreens() {
  console.log('\n🌊 Generating splash screens...');

  // Ensure splash directory exists
  if (!fs.existsSync(SPLASH_DIR)) {
    fs.mkdirSync(SPLASH_DIR, { recursive: true });
  }

  for (const { width, height, name } of splashScreens) {
    // Create splash screen with centered logo
    // Logo will be 40% of screen width
    const logoSize = Math.floor(width * 0.4);

    // Create white background
    const background = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // Resize logo
    const logo = await sharp(LOGO_PATH)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .toBuffer();

    // Composite logo onto background (centered)
    await sharp(background)
      .composite([
        {
          input: logo,
          top: Math.floor((height - logoSize) / 2),
          left: Math.floor((width - logoSize) / 2),
        },
      ])
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(SPLASH_DIR, name));

    console.log(`  ✓ Generated ${name}`);
  }
}

async function main() {
  try {
    console.log('🚀 Starting PWA asset generation from logo.png\n');

    // Check if logo exists
    if (!fs.existsSync(LOGO_PATH)) {
      console.error('❌ Error: logo.png not found at', LOGO_PATH);
      process.exit(1);
    }

    await generateIcons();
    await generateSplashScreens();

    console.log('\n✅ All PWA assets generated successfully!');
    console.log(`   - ${iconSizes.length} standard icons`);
    console.log(`   - ${appleTouchIconSizes.length} Apple Touch icons`);
    console.log(`   - 1 favicon`);
    console.log(`   - ${splashScreens.length} splash screens`);
  } catch (error) {
    console.error('❌ Error generating PWA assets:', error);
    process.exit(1);
  }
}

main();
