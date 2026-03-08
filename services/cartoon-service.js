// ═══════════════════════════════════════════
// خدمة تحويل الصور - Replicate API via Proxy
// مطابق لـ cartoon_service.dart
// ═══════════════════════════════════════════

import { compressImage, blobToBase64 } from '../utils/image-utils.js';

class CartoonService {
    constructor() {
        // ⚠️ غيّر هذا الرابط بعد نشر Cloudflare Worker
        this.proxyURL = 'https://cartoon-api-proxy.limbonux.workers.dev';
        this.modelVersion = '166efd159b4138da932522bc5af40d39194033f587d9bdbab1e594119eae3e7f';
        this.DAILY_LIMIT = 7; // 🔒 الحد اليومي لكل مستخدم
    }

    /**
     * تحويل الصورة إلى أسلوب Ghibli
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

            // ② إرسال للبروكسي
            onProgress?.('sending');
            const response = await fetch(
                `${this.proxyURL}/v1/predictions`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        version: this.modelVersion,
                        input: {
                            image: base64,
                            prompt: "GHBLI style, maintain the subject's likeness, preserve facial features, studio ghibli anime",
                            prompt_strength: 0.45,

                            model: "dev",
                            go_fast: false,
                            num_inference_steps: 28,
                            guidance_scale: 2.5,

                            megapixels: "1",
                            aspect_ratio: "1:1",
                            num_outputs: 1,
                            output_format: "webp",
                            output_quality: 80,

                            disable_safety_checker: false,
                        }
                    })
                }
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `خطأ من السيرفر: ${response.status}`);
            }

            const prediction = await response.json();

            if (prediction.error) {
                throw new Error(prediction.error);
            }

            // ③ انتظار النتيجة
            onProgress?.('processing');
            const output = await this.waitForResult(prediction.id, onProgress);

            // النتيجة قد تكون مصفوفة أو رابط مباشر
            const resultURL = Array.isArray(output) ? output[0] : output;

            // ✅ تسجيل الاستخدام بعد النجاح
            this.incrementUsage();

            return resultURL;

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
