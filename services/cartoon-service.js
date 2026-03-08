// ═══════════════════════════════════════════
// خدمة تحويل الصور - Replicate API via Proxy
// مطابق لـ cartoon_service.dart
// ═══════════════════════════════════════════

import { compressImage, blobToBase64 } from '../utils/image-utils.js';

class CartoonService {
    constructor() {
        // ⚠️ غيّر هذا الرابط بعد نشر Cloudflare Worker
        this.proxyURL = 'https://cartoon-api-proxy.limbonux.workers.dev';
        // النموذج الجديد: flux-kontext-dev (يحافظ على الملامح)
        this.modelPath = '/v1/models/black-forest-labs/flux-kontext-dev/predictions';
        this.DAILY_LIMIT = 7; // 🔒 الحد اليومي لكل مستخدم
    }

    /**
     * تحويل الصورة إلى أسلوب Ghibli مع الحفاظ على الملامح
     * @param {File} imageFile - ملف الصورة الأصلي
     * @param {Function} onProgress - callback لتحديث الحالة
     * @returns {Promise<string>} - رابط الصورة المحولة
     */
    async convertToGhibli(imageFile, onProgress) {
        try {
            // ⓪ التحقق من الحد اليومي
            this.checkUsageLimit();

            // ① ضغط الصورة (512×512, ≤1MB)
            onProgress?.('compressing');
            const compressedBlob = await compressImage(imageFile);
            const base64 = await blobToBase64(compressedBlob);

            console.log(`📦 حجم الصورة بعد الضغط: ${(compressedBlob.size / 1024).toFixed(0)} KB`);

            // ② إرسال للبروكسي (flux-kontext-dev)
            onProgress?.('sending');
            const response = await fetch(
                `${this.proxyURL}${this.modelPath}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: {
                            input_image: base64,
                            prompt: "Transform this photo into Studio Ghibli anime style illustration while keeping the same facial features, identity, pose, and clothing. Apply soft cel shading, vibrant colors, and hand-drawn anime aesthetic",
                            go_fast: true,
                            guidance: 2.5,
                            aspect_ratio: "match_input_image",
                            output_format: "webp",
                            output_quality: 80,
                            num_inference_steps: 30,
                            disable_safety_checker: false,
                        }
                    })
                }
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || errData.error || `خطأ من السيرفر: ${response.status}`);
            }

            const prediction = await response.json();

            if (prediction.error) {
                throw new Error(prediction.error);
            }

            // ③ انتظار النتيجة
            onProgress?.('processing');

            // flux-kontext-dev قد يُرجع النتيجة مباشرة (مع Prefer: wait)
            if (prediction.output) {
                this.incrementUsage();
                // output هو رابط مباشر (string) وليس مصفوفة
                return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            }

            // أو نتابع بالـ Polling
            const output = await this.waitForResult(prediction.id, onProgress);

            // ✅ تسجيل الاستخدام بعد النجاح
            this.incrementUsage();

            // النتيجة قد تكون رابط مباشر أو مصفوفة
            return Array.isArray(output) ? output[0] : output;

        } catch (error) {
            console.error('❌ خطأ في التحويل:', error);
            throw error;
        }
    }

    /**
     * متابعة حالة المعالجة
     */
    async getPrediction(id) {
        const response = await fetch(`${this.proxyURL}/v1/predictions/${id}`);
        if (!response.ok) {
            throw new Error(`خطأ في متابعة الحالة: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * انتظار النتيجة (Polling)
     */
    async waitForResult(id, onProgress) {
        const maxAttempts = 60; // 2 دقيقة كحد أقصى
        let attempts = 0;

        while (attempts < maxAttempts) {
            const prediction = await this.getPrediction(id);
            onProgress?.(prediction.status);

            switch (prediction.status) {
                case 'succeeded':
                    return prediction.output;
                case 'failed':
                    throw new Error(prediction.error || 'فشلت المعالجة');
                case 'canceled':
                    throw new Error('تم إلغاء المعالجة');
            }

            attempts++;
            await new Promise(r => setTimeout(r, 2000));
        }

        throw new Error('انتهت مهلة الانتظار');
    }

    // ═══════════════════════════════════════════
    // 🔒 نظام الحد اليومي (localStorage)
    // ═══════════════════════════════════════════

    /**
     * التحقق من الحد اليومي - يرمي خطأ إذا تم تجاوزه
     */
    checkUsageLimit() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const data = JSON.parse(localStorage.getItem('cartoon_usage') || '{}');

        // إذا كان اليوم مختلف عن آخر استخدام، نعيد العداد
        if (data.date !== today) {
            return; // يوم جديد = 0 استخدامات
        }

        if (data.count >= this.DAILY_LIMIT) {
            throw new Error(`لقد وصلت للحد اليومي (${this.DAILY_LIMIT} صور). حاول مرة أخرى غداً! 🎨`);
        }
    }

    /**
     * تسجيل استخدام جديد بعد نجاح التحويل
     */
    incrementUsage() {
        const today = new Date().toISOString().split('T')[0];
        const data = JSON.parse(localStorage.getItem('cartoon_usage') || '{}');

        if (data.date !== today) {
            // يوم جديد
            localStorage.setItem('cartoon_usage', JSON.stringify({ date: today, count: 1 }));
        } else {
            data.count = (data.count || 0) + 1;
            localStorage.setItem('cartoon_usage', JSON.stringify(data));
        }

        console.log(`📊 الاستخدام اليومي: ${this.getRemainingUses()}/${this.DAILY_LIMIT} متبقي`);
    }

    /**
     * كم صورة متبقية اليوم؟
     */
    getRemainingUses() {
        const today = new Date().toISOString().split('T')[0];
        const data = JSON.parse(localStorage.getItem('cartoon_usage') || '{}');

        if (data.date !== today) return this.DAILY_LIMIT;
        return Math.max(0, this.DAILY_LIMIT - (data.count || 0));
    }

    /**
     * تحديث رابط البروكسي
     */
    setProxyURL(url) {
        this.proxyURL = url;
    }
}

export const cartoonService = new CartoonService();
