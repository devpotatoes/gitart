import { importTranslationsFile, translateWebsite, translateSpecificEl } from "../lang/translate.js";

const bodyEl = document.querySelector("body");

document.addEventListener("DOMContentLoaded", async () => {
    await importTranslationsFile();

    const connectedUserName = sessionStorage.getItem("connectedUserName");
    const userSettingsObj = JSON.parse(localStorage.getItem(`${connectedUserName}Settings`));

    bodyEl.setAttribute("data-current-theme", userSettingsObj.theme);

    translateWebsite(userSettingsObj.lang.short);
});