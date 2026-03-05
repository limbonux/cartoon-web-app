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
    }

    /**
     * تحويل الصورة إلى أسلوب Ghibli
     * @param {File} imageFile - ملف الصورة الأصلي
     * @param {Function} onProgress - callback لتحديث الحالة
     * @returns {Promise<string>} - رابط الصورة المحولة
     */
    async convertToGhibli(imageFile, onProgress) {
        try {
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
                            prompt: "GHIBLI style",
                            prompt_strength: 0.8,

                            model: "dev",
                            go_fast: true,
                            num_inference_steps: 28,
                            guidance_scale: 3,

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
            if (Array.isArray(output)) {
                return output[0];
            }
            return output;

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

    /**
     * تحديث رابط البروكسي
     */
    setProxyURL(url) {
        this.proxyURL = url;
    }
}

export const cartoonService = new CartoonService();
