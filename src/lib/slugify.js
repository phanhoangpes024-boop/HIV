/**
 * Chuyển Tiếng Việt có dấu thành không dấu và tạo slug SEO
 */
export function slugify(text) {
    if (!text) return "";
    let slug = text.toString().toLowerCase().trim();

    // Thay thế các ký tự tiếng Việt
    slug = slug.replace(/[áàảãạăắằẳẵặâấầẩẫậ]/g, "a");
    slug = slug.replace(/[éèẻẽẹêếềểễệ]/g, "e");
    slug = slug.replace(/[iíìỉĩị]/g, "i");
    slug = slug.replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, "o");
    slug = slug.replace(/[úùủũụưứừửữự]/g, "u");
    slug = slug.replace(/[ýỳỷỹỵ]/g, "y");
    slug = slug.replace(/đ/g, "d");

    // Xóa ký tự đặc biệt, chỉ giữ lại chữ cái, số và dấu gạch ngang
    slug = slug.replace(/[^a-z0-9 -]/g, "")
        // Thay thế khoảng trắng bằng dấu gạch ngang
        .replace(/\s+/g, "-")
        // Xóa nhiều dấu gạch ngang liên tiếp
        .replace(/-+/g, "-");

    return slug;
}

/**
 * Tạo slug kết hợp ID ở cuối
 * Ví dụ: "Bệnh sốt xuất huyết", 123 -> "benh-sot-xuat-huyet-123"
 */
export function createSlugWithId(text, id) {
    const slug = slugify(text);
    return `${slug}-${id}`;
}

/**
 * Lấy ID từ chuỗi slug kết hợp ID
 * Ví dụ: "benh-sot-xuat-huyet-123" -> 123
 */
export function getIdFromSlug(slug) {
    if (!slug) return null;
    const parts = slug.split("-");
    const id = parts[parts.length - 1];
    return id ? parseInt(id, 10) : null;
}
