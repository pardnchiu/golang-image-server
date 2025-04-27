// * package
const minifyHTML = require("express-minify-html");

/**
 * removeComments: true, // 移除 HTML 註釋
 * collapseWhitespace: true, // 移除多餘的空白符號
 * collapseBooleanAttributes: true, // 將布爾屬性從 checked="checked" 壓縮為 checked
 * removeAttributeQuotes: true, // 移除屬性周圍的引號
 * removeEmptyAttributes: true, // 移除空的屬性
 * minifyJS: true, // 壓縮內聯的 JavaScript
 * minifyCSS: true, // 壓縮內聯的 CSS
 * keepClosingSlash: true, // 保留單標籤元素的閉合斜杠
 * removeRedundantAttributes: true, // 移除多餘的屬性，比如當屬性是默認值時
 * useShortDoctype: true, // 使用短的文檔類型，從 <!DOCTYPE html> 壓縮為 <!doctype html>.
 * removeOptionalTags: true, // 移除可選的標籤，比如 </html> 和 </body>
 * removeScriptTypeAttributes: true, // 移除 <script> 標籤的 type="text/javascript" 屬性
 * removeStyleLinkTypeAttributes: true, // 移除 <style> 和 <link> 標籤的 type="text/css" 屬性
 * caseSensitive: true, // 保留大小寫敏感的標籤（如自定義標籤）和屬性
 * decodeEntities: true, // 啟用實體解碼
 * processConditionalComments: true, // 處理條件註釋
 * processScripts: ["text/html"] // 這裡指定特定類型的 script 內容需要壓縮
 */

export default minifyHTML({
    override: true,
    exception_url: false,
    htmlMinifier: {
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        removeEmptyAttributes: true,
        minifyJS: true,
        minifyCSS: true
    }
});