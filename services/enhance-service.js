// ═══════════════════════════════════════════
// خدمة تحسين الصور - Canvas API
// مطابق لـ enhance_service.dart
// ═══════════════════════════════════════════

class EnhanceService {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.originalImageData = null;
    }

    /**
     * تحميل الصورة في Canvas
     * @param {File|Blob} file
     * @returns {Promise<string>} - Object URL للصورة المحملة
     */
    async loadImage(file) {
        const img = await createImageBitmap(file);

        this.canvas = document.createElement('canvas');
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.drawImage(img, 0, 0);

        // حفظ البيانات الأصلية
        this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        return this.canvas.toDataURL('image/jpeg', 0.95);
    }

    /**
     * تطبيق التحسينات
     * @param {Object} settings - إعدادات التحسين
     * @returns {string} - Data URL للصورة المحسنة
     */
    applyEnhancements({ brightness = 0, contrast = 0, saturation = 0, sharpness = 0 }) {
        if (!this.canvas || !this.originalImageData) return null;

        // ① إعادة البيانات الأصلية
        this.ctx.putImageData(this.originalImageData, 0, 0);

        // ② تطبيق الفلاتر عبر CSS Filters
        const filterCanvas = document.createElement('canvas');
        filterCanvas.width = this.canvas.width;
        filterCanvas.height = this.canvas.height;
        const filterCtx = filterCanvas.getContext('2d');

        // بناء سلسلة الفلاتر
        const filters = [];
        if (brightness !== 0) filters.push(`brightness(${1 + brightness})`);
        if (contrast !== 0) filters.push(`contrast(${1 + contrast})`);
        if (saturation !== 0) filters.push(`saturate(${1 + saturation})`);

        filterCtx.filter = filters.join(' ') || 'none';
        filterCtx.drawImage(this.canvas, 0, 0);

        // ③ تطبيق الحدة (Sharpness) يدوياً
        if (sharpness > 0) {
            this._applySharpen(filterCtx, filterCanvas.width, filterCanvas.height, sharpness);
        }

        return filterCanvas.toDataURL('image/jpeg', 0.95);
    }

    /**
     * تطبيق فلتر الحدة
     */
    _applySharpen(ctx, width, height, amount) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const copy = new Uint8ClampedArray(data);

        const kernel = [
            0, -amount, 0,
            -amount, 1 + 4 * amount, -amount,
            0, -amount, 0,
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let val = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            val += copy[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    data[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, val));
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * تحسين تلقائي (قيم محسنة مسبقاً)
     */
    autoEnhance() {
        return this.applyEnhancements({
            brightness: 0.1,
            contrast: 0.2,
            sharpness: 0.3,
            saturation: 0.15,
        });
    }

    /**
     * إعادة تعيين للقيم الأصلية
     */
    reset() {
        if (!this.canvas || !this.originalImageData) return null;
        this.ctx.putImageData(this.originalImageData, 0, 0);
        return this.canvas.toDataURL('image/jpeg', 0.95);
    }

    /**
     * الحصول على Blob للحفظ/المشاركة
     */
    async getBlob(quality = 0.95) {
        if (!this.canvas) return null;
        return new Promise(resolve =>
            this.canvas.toBlob(resolve, 'image/jpeg', quality)
        );
    }

    /**
     * تنظيف الموارد
     */
    dispose() {
        this.canvas = null;
        this.ctx = null;
        this.originalImageData = null;
    }
}

export const enhanceService = new EnhanceService();
