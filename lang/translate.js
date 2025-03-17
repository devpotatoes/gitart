let translationsFileObj;

export async function importTranslationsFile() {
    const translationsFile = await fetch("../lang/translations.json");
    translationsFileObj = await translationsFile.json();
};

export function translateWebsite(lang) {
    const elArray = document.querySelectorAll("[data-translate='true']");
    elArray.forEach(el => {
        el.innerHTML = translationsFileObj[el.getAttribute("data-translate-uuid")][lang];
    });
};

export function translateSpecificEl(elArray, lang) {
    elArray.forEach(el => {
        el.innerHTML = translationsFileObj[el.getAttribute("data-translate-uuid")][lang];
    });
};