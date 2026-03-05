// ═══════════════════════════════════════════
// خدمة إدارة الصور - اختيار، حفظ، مشاركة
// مطابق لـ image_service.dart
// ═══════════════════════════════════════════

class ImageService {
    /**
     * اختيار صورة من المعرض
     * @returns {Promise<File|null>}
     */
    pickFromGallery() {
        return this._pickFile('image/*', false);
    }

    /**
     * التقاط صورة من الكاميرا
     * @returns {Promise<File|null>}
     */
    pickFromCamera() {
        return this._pickFile('image/*', true);
    }

    /**
     * فتح مربع حوار اختيار الملف
     */
    _pickFile(accept, useCamera) {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            if (useCamera) {
                input.capture = 'environment';
            }
            input.onchange = (e) => {
                const file = e.target.files?.[0] || null;
                resolve(file);
            };
            // إذا ألغى المستخدم
            input.addEventListener('cancel', () => resolve(null));
            input.click();
        });
    }

    /**
     * تحميل الصورة (حفظ في الجهاز)
     * @param {string} url - رابط الصورة (URL أو Data URL)
     * @param {string} filename - اسم الملف
     */
    async downloadImage(url, filename = 'cartoon-maker.jpg') {
        try {
            let blob;

            if (url.startsWith('data:') || url.startsWith('blob:')) {
                // Data URL أو Blob URL
                const response = await fetch(url);
                blob = await response.blob();
            } else {
                // رابط خارجي
                const response = await fetch(url);
                blob = await response.blob();
            }

            const blobURL = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobURL;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobURL);

            return true;
        } catch (error) {
            console.error('❌ خطأ في تحميل الصورة:', error);
            return false;
        }
    }

    /**
     * مشاركة الصورة
     * @param {string} url - رابط الصورة
     * @param {string} title - عنوان المشاركة
     */
    async shareImage(url, title = 'صورة من كرتون ميكر 🎨') {
        try {
            // التحقق من دعم Web Share API
            if (!navigator.share) {
                // Fallback: نسخ الرابط
                await navigator.clipboard?.writeText(url);
                return { shared: false, copied: true };
            }

            // تحويل لـ Blob إذا لزم الأمر
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], 'cartoon-maker.jpg', { type: blob.type });

            await navigator.share({
                title: title,
                text: 'تم إنشاء هذه الصورة بواسطة تطبيق كرتون ميكر 🎨',
                files: [file],
            });

            return { shared: true, copied: false };
        } catch (error) {
            if (error.name === 'AbortError') {
                // المستخدم ألغى المشاركة
                return { shared: false, copied: false };
            }
            console.error('❌ خطأ في المشاركة:', error);
            return { shared: false, copied: false };
        }
    }
}

export const imageService = new ImageService();
