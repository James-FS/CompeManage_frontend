/**
 * 将 PascalCase 或 camelCase 转换为 snake_case
 * @param {string} str
 * @returns {string}
 */
function toSnakeCase(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

/**
 * 递归地将对象的所有 key 从 PascalCase 转换为 snake_case
 * @param {Object} obj
 * @returns {Object}
 */
export function transformObjectKeys(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => transformObjectKeys(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
        const transformed = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const snakeKey = toSnakeCase(key);
                transformed[snakeKey] = transformObjectKeys(obj[key]);
            }
        }
        return transformed;
    }
    
    return obj;
}
