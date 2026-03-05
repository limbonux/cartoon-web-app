// ═══════════════════════════════════════════
// أدوات الصور - ضغط وتحويل
// مطابق لـ image_utils.dart
// ═══════════════════════════════════════════

const IMAGE_CONFIG = {
    maxWidth: 512,
    maxHeight: 512,
    maxSizeBytes: 1 * 1024 * 1024,  // 1MB
    initialQuality: 0.8,             // 80%
    minQuality: 0.3,                 // 30%
    format: 'image/jpeg',
};

/**
 * ضغط الصورة إلى 512×512 وأقل من 1MB
 * @param {File|Blob} file - ملف الصورة الأصلي
 * @returns {Promise<Blob>} - الصورة المضغوطة
 */
export async function compressImage(file) {
    const img = await createImageBitmap(file);

    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_CONFIG.maxWidth;
    canvas.height = IMAGE_CONFIG.maxHeight;
    const ctx = canvas.getContext('2d');

    // رسم خلفية بيضاء (لتجنب الشفافية مع JPEG)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // رسم الصورة مع الحفاظ على النسبة (crop from center)
    const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height
    );
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    // ضغط تدريجي حتى الحجم ≤ 1MB
    let quality = IMAGE_CONFIG.initialQuality;
    let blob;

    do {
        blob = await new Promise(resolve =>
            canvas.toBlob(resolve, IMAGE_CONFIG.format, quality)
        );
        quality -= 0.1;
    } while (blob.size > IMAGE_CONFIG.maxSizeBytes && quality >= IMAGE_CONFIG.minQuality);

    console.log(`📦 ضغط: ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB (${canvas.width}×${canvas.height})`);
    return blob;
}

/**
 * تحويل Blob إلى Base64 Data URL
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * تحويل ملف إلى Object URL للعرض
 * @param {File|Blob} file
 * @returns {string}
 */
export function fileToObjectURL(file) {
    return URL.createObjectURL(file);
}

/**
 * تحرير Object URL من الذاكرة
 * @param {string} url
 */
export function revokeObjectURL(url) {
    if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

/**
 * الحصول على أبعاد الصورة
 * @param {File|Blob} file
 * @returns {Promise<{width: number, height: number}>}
 */
export async function getImageDimensions(file) {
    const img = await createImageBitmap(file);
    return { width: img.width, height: img.height };
}
