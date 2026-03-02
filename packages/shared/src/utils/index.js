"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPrice = formatPrice;
exports.generateOrderNumber = generateOrderNumber;
exports.slugify = slugify;
function formatPrice(amount, currency, locale = 'en') {
    return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}
function generateOrderNumber(date = new Date()) {
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).toUpperCase().slice(2, 6);
    return `ORD-${datePart}-${randomPart}`;
}
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
