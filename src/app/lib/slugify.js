/**
 * Chuyển tiêu đề tiếng Việt thành slug URL-friendly
 * Ví dụ: "Bệnh Sốt Xuất Huyết & Cách Phòng Ngừa" → "benh-sot-xuat-huyet-cach-phong-ngua"
 */
export function slugify(text) {
    if (!text) return '';

    const vietnameseMap = {
        'à':'a','á':'a','ả':'a','ã':'a','ạ':'a',
        'ă':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a',
        'â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
        'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
        'ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
        'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
        'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o',
        'ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o',
        'ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
        'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
        'ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u',
        'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
        'đ':'d',
        'À':'a','Á':'a','Ả':'a','Ã':'a','Ạ':'a',
        'Ă':'a','Ằ':'a','Ắ':'a','Ẳ':'a','Ẵ':'a','Ặ':'a',
        'Â':'a','Ầ':'a','Ấ':'a','Ẩ':'a','Ẫ':'a','Ậ':'a',
        'È':'e','É':'e','Ẻ':'e','Ẽ':'e','Ẹ':'e',
        'Ê':'e','Ề':'e','Ế':'e','Ể':'e','Ễ':'e','Ệ':'e',
        'Ì':'i','Í':'i','Ỉ':'i','Ĩ':'i','Ị':'i',
        'Ò':'o','Ó':'o','Ỏ':'o','Õ':'o','Ọ':'o',
        'Ô':'o','Ồ':'o','Ố':'o','Ổ':'o','Ỗ':'o','Ộ':'o',
        'Ơ':'o','Ờ':'o','Ớ':'o','Ở':'o','Ỡ':'o','Ợ':'o',
        'Ù':'u','Ú':'u','Ủ':'u','Ũ':'u','Ụ':'u',
        'Ư':'u','Ừ':'u','Ứ':'u','Ử':'u','Ữ':'u','Ự':'u',
        'Ỳ':'y','Ý':'y','Ỷ':'y','Ỹ':'y','Ỵ':'y',
        'Đ':'d',
    };

    return text
        .split('')
        .map(char => vietnameseMap[char] || char)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')   // Xóa ký tự đặc biệt
        .trim()
        .replace(/\s+/g, '-')            // Thay khoảng trắng bằng dấu gạch
        .replace(/-+/g, '-');            // Xóa dấu gạch trùng lặp
}

/**
 * Tạo slug đầy đủ kèm ID: "benh-sot-xuat-huyet-123"
 */
export function createSlugWithId(title, id) {
    const slug = slugify(title);
    // Giới hạn độ dài slug tối đa 80 ký tự để URL không quá dài
    const truncated = slug.length > 80 ? slug.substring(0, 80).replace(/-[^-]*$/, '') : slug;
    return `${truncated}-${id}`;
}

/**
 * Lấy ID từ slug: "benh-sot-xuat-huyet-123" → "123"
 */
export function getIdFromSlug(slug) {
    if (!slug) return null;
    const parts = slug.split('-');
    const id = parts[parts.length - 1];
    return isNaN(id) ? null : id;
}