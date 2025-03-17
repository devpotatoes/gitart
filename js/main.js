import { importTranslationsFile, translateWebsite, translateSpecificEl } from "../lang/translate.js";

const githubApiVersion = "2022-11-28";

let userSettingsObj;
let openMenuName = "";
const supportedLanguagesObj = {
    initial: {
        short: "en",
        long: "English"
    },
    en: "English",
    fr: "Français"
};

const htmlEl = document.querySelector("html");
const bodyEl = document.querySelector("body");
const settingsBtnEl = document.querySelector("button.settingsBtn");
const signInBtnEl = document.querySelector("button.signInBtn");
const accountBtnEl = document.querySelector("button.accountBtn");
const dialogBoxContainerEl = document.querySelector("#dialogBoxContainer");
const settingsMenuEl = document.querySelector("#settingsMenu");
const closeMenuBtnElArray = document.querySelectorAll("div.menuDialogBox > div.header > button.closeMenuBtn");
const themeSelectInputElArray = document.querySelectorAll("#settingsMenu > div.body > div:nth-of-type(1) > div.themeSelectContainer > div.themeSelectInput");
const selectLanguageInputEl = document.querySelector("#settingsMenu > div.body > div:nth-of-type(2) > button.selectLanguageInput");
const selectLanguageInputOptionsEl = document.querySelector("#settingsMenu > div.body > div:nth-of-type(2) > ul.selectLanguageInputOptions");
const selectLanguageInputOptionsElArray = document.querySelectorAll("#settingsMenu > div.body > div:nth-of-type(2) > ul.selectLanguageInputOptions > li");
const resetSettingsBtnEl = document.querySelector("#settingsMenu > div.footer > button.resetSettingsBtn");
const saveSettingsBtnEl = document.querySelector("#settingsMenu > div.footer > button.saveSettingsBtn");
const signInMenuEl = document.querySelector("#signInMenu");
const tosCheckboxEl = document.querySelector("#signInMenu > div.body > div:nth-of-type(1) > div.checkboxContainer > button.tosCheckbox");
const signInTokenInputEl = document.querySelector("#signInMenu > div.body > div:nth-of-type(1) > input.signInTokenInput");
const signInTokenBtnEl = document.querySelector("#signInMenu > div.footer > button.signInTokenBtn");
const accountMenuEl = document.querySelector("#accountMenu");
const accountTokenInputEl = document.querySelector("#accountMenu > div.body > div:nth-of-type(2) > div.accountTokenInputContainer > input.accountTokenInput");
const revertAccountBtnEl = document.querySelector("#accountMenu > div.footer > button.revertAccountBtn")
const signOutBtnEl = document.querySelector("#accountMenu > div.footer > button.signOutBtn");
const appMainEl = document.querySelector("#appMain");
const selectYearBtnEl = document.querySelector("div.selectYearBtn");
const selectYearBtnValueEl = selectYearBtnEl.querySelector("span");
const pushArtBtnEl = document.querySelector("button.pushArtBtn");
const loadingMenuEl = document.querySelector("#loadingMenu");
const closeLoadingMenuBtnEl = document.querySelector("#loadingMenu > div.footer > button.closeLoadingMenuBtn");

function toggleAttribute(element, attributeName) {
    if (element.getAttribute(attributeName) === "true") {
        element.setAttribute(attributeName, "false");
    } else {
        element.setAttribute(attributeName, "true");
    };
};

function generateYearMatrix(year) {
    const firstDate = new Date(year, 0, 1);
    const lastDate = new Date(year, 11, 31);
    const msInDay = 24 * 60 * 60 * 1000;
    const firstDay = firstDate.getDay();

    const totalCells = firstDay + Math.floor((lastDate.getTime() - firstDate.getTime()) / msInDay) + 1;

    const dateObj = {
        status: 0,
        date: null
    };

    const yearMatrix = Array.from({ length: 7 }, () => Array(Math.ceil(totalCells / 7)).fill(dateObj));

    let currentDate = firstDate;
    let weekIndex = 0;
    let dayIndex = firstDay;

    while (currentDate <= lastDate) {
        yearMatrix[dayIndex][weekIndex] = {
            status: 1,
            date: currentDate.getFullYear() + "-" + String(currentDate.getMonth() + 1).padStart(2, "0") + "-" + String(currentDate.getDate()).padStart(2, "0")
        };
        currentDate = new Date(currentDate.getTime() + msInDay);
        dayIndex += 1;
        if (dayIndex === 7) {
            dayIndex = 0;
            weekIndex += 1;
        };
    };
    return yearMatrix;
};

function ISO8601ToMonth(isoDate) {
    const date = new Date(isoDate);
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "long" });

    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) {
        suffix = "st";
    } else if (day === 2 || day === 22) {
        suffix = "nd";
    } else if (day === 3 || day === 23) {
        suffix = "rd";
    }

    return `${month} ${day}${suffix}`;
};

function monthToDate(year, monthDate) {
    const date = new Date(`${monthDate.replace(/(\d+)(st|nd|rd|th)/, "$1")} ${year}`);
    const utcDate = new Date(Date.UTC(year, date.getMonth(), date.getDate()));
    return utcDate.toISOString().split("T")[0];
};

async function getCryptKey() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("GitArtDB", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("keys")) {
                db.createObjectStore("keys", { keyPath: "keyName" });
            };
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains("keys")) {
                return resolve(null);
            };

            const transaction = db.transaction("keys", "readonly");
            const store = transaction.objectStore("keys");

            const getRequest = store.get("cryptKey");

            getRequest.onsuccess = () => {
                resolve(getRequest.result ? getRequest.result.value : null);
            };

            getRequest.onerror = () => resolve(null);
        };

        request.onerror = (error) => reject(error);
    });
};

async function removeCryptKey() {
    const existingKey = await getCryptKey();

    if (existingKey === null) {
        return;
    };

    return new Promise((resolve, reject) => {
        const request = indexedDB.open("GitArtDB", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction("keys", "readwrite");
            const store = transaction.objectStore("keys");

            const deleteRequest = store.delete("cryptKey");

            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = (error) => reject(error);
        };

        request.onerror = (error) => reject(error);
    });
};

async function generateCryptKey() {
    const existingKey = await getCryptKey();

    if (existingKey !== null) {
        return;
    };

    const key = await window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["encrypt", "decrypt"]
    );

    new Promise((resolve, reject) => {
        const request = indexedDB.open("GitArtDB", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction("keys", "readwrite");
            const store = transaction.objectStore("keys");

            const putRequest = store.put({ keyName: "cryptKey", value: key });

            putRequest.onsuccess = () => resolve();
            putRequest.onerror = (error) => reject(error);
        };

        request.onerror = (error) => reject(error);
    });
};

async function encrypt(data) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        await getCryptKey(),
        new TextEncoder().encode(data)
    );
    return { iv, encrypted };
};

async function decrypt(iv, data) {
    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        await getCryptKey(),
        data
    );
    return new TextDecoder().decode(decrypted);
};

function uint8ArrayToBase64(uint8Array) {
    return btoa(String.fromCharCode(...uint8Array));
};

function base64ToUint8Array(base64) {
    return new Uint8Array([...atob(base64)].map(char => char.charCodeAt(0)));
};

async function getUserToken() {
    return await decrypt(base64ToUint8Array(sessionStorage.getItem("tokenInitializationVector")), base64ToUint8Array((sessionStorage.getItem("githubAccessToken"))));
};

function generateContributionCalendar(year) {
    const rows = document.querySelectorAll("table.contributionCalendar > tbody > tr.dayTableRow");

    rows.forEach(row => {
        row.querySelectorAll("td").forEach(td => {
            td.remove();
        });
    });

    const yearMatrix = generateYearMatrix(year);



    if (sessionStorage.getItem("contributionMatrix") === null) {
        rows.forEach((row, i) => {
            let rowHtml = "";
            for (let j = 0; j < yearMatrix[i].length; j += 1) {
                if (yearMatrix[i][j].status === 1) {
                    rowHtml += `
                        <td data-status="1" data-level="0" data-date="${ISO8601ToMonth(yearMatrix[i][j].date)}">
                            <tool-tip></tool-tip>
                        </td>
                    `;
                } else {
                    rowHtml += `<td data-status="0" data-level="0" data-date="${ISO8601ToMonth(yearMatrix[i][j].date)}"></td>`;
                };
            };
            
            row.innerHTML += rowHtml;
        });
    
        const contributionObj = {
            level: 0,
            date: null
        };
        
        const contributionMatrix = Array.from({ length: yearMatrix.length }, () => Array.from({ length: yearMatrix[0].length }, () => ({ ...contributionObj })));
    
        rows.forEach((row, i)=> {
            row.querySelectorAll("td").forEach((td, j) => {
                if (td.getAttribute("data-status") === "1") {
                    contributionMatrix[i][j].level = parseInt(td.getAttribute("data-level"), 10);
                    contributionMatrix[i][j].date = td.getAttribute("data-date");
                };
            });
        });
        sessionStorage.setItem("contributionMatrix", JSON.stringify(contributionMatrix));
    } else {
        const contributionMatrix = JSON.parse(sessionStorage.getItem("contributionMatrix"));

        rows.forEach((row, i) => {
            let rowHtml = "";
            for (let j = 0; j < contributionMatrix[i].length; j += 1) {
                if (yearMatrix[i][j].status === 1) {
                    rowHtml += `
                        <td data-status="1" data-level="${contributionMatrix[i][j].level}" data-date="${contributionMatrix[i][j].date}">
                            <tool-tip></tool-tip>
                        </td>
                    `;
                } else {
                    rowHtml += `<td data-status="0" data-level="0" data-date="${contributionMatrix[i][j].date}"></td>`;
                };
            };
            
            row.innerHTML += rowHtml;
        });
    };

    const tableDataElArray = document.querySelectorAll("table.contributionCalendar > tbody > tr.dayTableRow > td");
    
    tableDataElArray.forEach(td => {
        td.addEventListener("click", () => {
            const tdLevel = parseInt(td.getAttribute("data-level"), 10);
            if (tdLevel < 4) {
                td.setAttribute("data-level", tdLevel + 1);
            } else {
                td.setAttribute("data-level", 0);
            };

            const contributionMatrix = JSON.parse(sessionStorage.getItem("contributionMatrix"));
            contributionMatrix.flat().find(obj => obj.date === td.getAttribute("data-date")).level = td.getAttribute("data-level");
            sessionStorage.setItem("contributionMatrix", JSON.stringify(contributionMatrix));
        });
        
        td.addEventListener("mouseenter", () => {
            const tdLevel = parseInt(td.getAttribute("data-level"), 10);
            const tooltipEl = td.querySelector("tool-tip");
    
            let hoverTimeout = setTimeout(() => {
                if (tdLevel <= 0) {
                    tooltipEl.innerText = `No contributions on ${td.getAttribute("data-date")}`;
                } else if (tdLevel == 1) {
                    tooltipEl.innerText = `${tdLevel} contribution on ${td.getAttribute("data-date")}`;
                } else {
                    tooltipEl.innerText = `${tdLevel} contributions on ${td.getAttribute("data-date")}`;
                };
                tooltipEl.style.display = "block";
            }, 750);
    
            td.addEventListener("mouseleave", () => {
                clearTimeout(hoverTimeout);
                tooltipEl.style.display = "none";
            });
        });
    });
};

function newAlert(type, containerEl, translateUuid) {
    if (containerEl.querySelector(`${type}-alert > p[data-translate-uuid="${translateUuid}"]`) === null) {
        if (type === "error" || type === "warning") {
            containerEl.insertAdjacentHTML("afterbegin", `
                <${type}-alert>
                    <svg viewBox="0 0 16 16" width="16" height="16">
                        <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>
                    </svg>
                    <p data-translate="true" data-translate-uuid="${translateUuid}"></p>
                </${type}-alert>`
            );
        } else if (type === "info") {
            containerEl.insertAdjacentHTML("afterbegin", `
                <info-alert>
                    <svg viewBox="0 0 16 16" width="16" height="16">
                        <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
                    </svg>
                    <p data-translate="true" data-translate-uuid="${translateUuid}"></p>
                </info-alert>`
            );
        };
        translateSpecificEl([containerEl.querySelector(`${type}-alert > p`)], userSettingsObj.lang.short);
        setTimeout(() => {
            containerEl.querySelector(`${type}-alert > p[data-translate-uuid="${translateUuid}"]`).parentElement.remove();
        }, 15000);
    };
};

document.addEventListener("DOMContentLoaded", async () => {
    await importTranslationsFile();

    if (sessionStorage.getItem("userStatus") === null) {
        sessionStorage.setItem("userStatus", "guest");
        sessionStorage.setItem("connectedUserName", "guest");
    };

    if (sessionStorage.getItem("userStatus") === "connected" && localStorage.getItem(`${sessionStorage.getItem("connectedUserName")}Settings`) === null) {
        const guestSettingsObj = JSON.parse(localStorage.getItem("guestSettings"));
        const userSettingsObj = {
            theme: guestSettingsObj.theme,
            lang: {
                short: guestSettingsObj.lang.short,
                long: guestSettingsObj.lang.long
            }
        };
        localStorage.setItem(`${sessionStorage.getItem("connectedUserName")}Settings`, JSON.stringify(userSettingsObj));
    } else if (localStorage.getItem("guestSettings") === null) {
        const langShort = window.navigator.language.slice(0, 2);
        const guestSettingsObj = {
            theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
            lang: {
                short: (langShort in supportedLanguagesObj) ? langShort : supportedLanguagesObj.initial.short,
                long: supportedLanguagesObj[langShort] || supportedLanguagesObj.initial.long
            }
        };
        localStorage.setItem("guestSettings", JSON.stringify(guestSettingsObj));
    };

    userSettingsObj = JSON.parse(localStorage.getItem(`${sessionStorage.getItem("connectedUserName")}Settings`));
    
    htmlEl.setAttribute("lang", userSettingsObj.lang.short);
    bodyEl.setAttribute("data-current-theme", userSettingsObj.theme);

    if (sessionStorage.getItem("userStatus") === "connected") {
        accountBtnEl.style.display = "flex";
        const newPfpImgEl = document.createElement("img");
        newPfpImgEl.src = sessionStorage.getItem("userAvatarUrl");
        accountBtnEl.appendChild(newPfpImgEl);
    } else {
        signInBtnEl.style.display = "flex";
    };

    toggleAttribute(document.querySelector(`[data-theme=${userSettingsObj.theme}]`), "data-current-theme");
    selectLanguageInputEl.innerHTML = `
        ${userSettingsObj.lang.long}
        <svg viewBox="0 0 16 16" width="16"  height="16">
            <path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"></path>
        </svg>
    `;
    toggleAttribute(document.querySelector(`[data-ISO-639-1="${userSettingsObj.lang.short}"]`), "data-selected");

    generateContributionCalendar(new Date().getFullYear());

    selectYearBtnValueEl.innerText = new Date().getFullYear();

    translateWebsite(userSettingsObj.lang.short);
});

settingsBtnEl.addEventListener("click", () => {
    dialogBoxContainerEl.classList.toggle("visibleEl");
    settingsMenuEl.classList.toggle("visibleElAnimScale");
    openMenuName = "settings";
});

signInBtnEl.addEventListener("click", () => {
    dialogBoxContainerEl.classList.toggle("visibleEl");
    signInMenuEl.classList.toggle("visibleElAnimScale");
    openMenuName = "signIn";
});

accountBtnEl.addEventListener("click", () => {
    dialogBoxContainerEl.classList.toggle("visibleEl");
    accountMenuEl.classList.toggle("visibleElAnimScale");
    accountMenuEl.querySelector("div.body > div:nth-of-type(1) > img").src = sessionStorage.getItem("userAvatarUrl");
    accountMenuEl.querySelector("div.body > div:nth-of-type(1) > span").innerText = sessionStorage.getItem("connectedUserName");
    accountMenuEl.querySelector("div.body > div:nth-of-type(2) > p > span.tokenRequestUsedText").innerText = sessionStorage.getItem("tokenRequestUsed");
    accountMenuEl.querySelector("div.body > div:nth-of-type(2) > p > span.tokenRequestRateLimitText").innerText = sessionStorage.getItem("tokenRequestRateLimit");
    const tokenRateLimitRefresMs = (sessionStorage.getItem("tokenRequestResetTimestamp") * 1000) - Date.now();
    if (tokenRateLimitRefresMs >= 0) {
        accountMenuEl.querySelector("div.body > div:nth-of-type(2) > p > span.tokenResetTimeText").innerText = Math.floor(tokenRateLimitRefresMs / (1000 * 60));
        accountMenuEl.querySelector("div.body > div:nth-of-type(2) > p:nth-of-type(4)").style.display = "block";
    } else {
        sessionStorage.setItem("tokenRequestUsed", 0);
        accountMenuEl.querySelector("div.body > div:nth-of-type(2) > p:nth-of-type(4)").style.display = "none";
    };
    openMenuName = "account";
});

closeMenuBtnElArray.forEach(btn => {
    btn.addEventListener("click", () => {
        dialogBoxContainerEl.classList.toggle("visibleEl");
        document.querySelector(`#${openMenuName}Menu`).classList.toggle("visibleElAnimScale");
    });
});

themeSelectInputElArray.forEach(input => {
    input.addEventListener("click", () => {
        const selectedTheme = input.getAttribute("data-theme");
        themeSelectInputElArray.forEach(input => {
            input.setAttribute("data-current-theme", "false");
        });
        if (selectedTheme === "light") {
            userSettingsObj.theme = "light";
        } else if (selectedTheme === "dark") {
            userSettingsObj.theme = "dark";
        };
        bodyEl.setAttribute("data-current-theme", userSettingsObj.theme);
        localStorage.setItem(`${sessionStorage.getItem("connectedUserName")}Settings`, JSON.stringify(userSettingsObj));
        toggleAttribute(input, "data-current-theme");
    });
});

selectLanguageInputEl.addEventListener("click", () => {
    const selectLanguageInputElData = selectLanguageInputEl.getBoundingClientRect();
    selectLanguageInputOptionsEl.style.top = `${(selectLanguageInputElData.top - selectLanguageInputEl.parentElement.getBoundingClientRect().top) + selectLanguageInputElData.height + 4}px`;
    selectLanguageInputOptionsEl.classList.toggle("visibleElAnimDrop");
});

selectLanguageInputEl.addEventListener("focus", () => {
    const selectLanguageInputElData = selectLanguageInputEl.getBoundingClientRect();
    selectLanguageInputOptionsEl.style.top = `${(selectLanguageInputElData.top - selectLanguageInputEl.parentElement.getBoundingClientRect().top) + selectLanguageInputElData.height + 4}px`;
    selectLanguageInputOptionsEl.classList.toggle("visibleElAnimDrop");
});

selectLanguageInputEl.addEventListener("blur", () => {
    selectLanguageInputOptionsEl.classList.toggle("visibleElAnimDrop");
});

selectLanguageInputOptionsElArray.forEach(input => {
    input.addEventListener("click", () => {
        console.log("ok")
        userSettingsObj.lang.short = input.getAttribute("data-ISO-639-1");
        userSettingsObj.lang.long = input.innerText;
        localStorage.setItem(`${sessionStorage.getItem("connectedUserName")}Settings`, JSON.stringify(userSettingsObj));
        selectLanguageInputOptionsElArray.forEach(input => {
            input.setAttribute("data-selected", "false");
        });
        toggleAttribute(input, "data-selected");
        selectLanguageInputEl.innerHTML = `
            ${input.innerText}
            <svg viewBox="0 0 16 16" width="16"  height="16">
                <path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"></path>
            </svg>
        `;
    });
});

resetSettingsBtnEl.addEventListener("click", () => {
    toggleAttribute(document.querySelector(`[data-theme=${userSettingsObj.theme}]`), "data-current-theme");
    toggleAttribute(document.querySelector("[data-selected=true"), "data-selected");

    const languageShort = window.navigator.language.slice(0, 2);
    const initialSettingsObj = {
        theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
        lang: {
            short: (languageShort in supportedLanguagesObj) ? languageShort : supportedLanguagesObj.initial.short,
            long: supportedLanguagesObj[languageShort] || supportedLanguagesObj.initial.long
        }
    };
    localStorage.setItem(`${sessionStorage.getItem("connectedUserName")}Settings`, JSON.stringify(initialSettingsObj));

    toggleAttribute(document.querySelector(`[data-theme=${initialSettingsObj.theme}]`), "data-current-theme");
    selectLanguageInputEl.innerHTML = `
        ${initialSettingsObj.lang.long}
        <svg viewBox="0 0 16 16" width="16"  height="16">
            <path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"></path>
        </svg>
    `;
    toggleAttribute(document.querySelector(`[data-ISO-639-1="${initialSettingsObj.lang.short}"]`), "data-selected");
});

saveSettingsBtnEl.addEventListener("click", () => {
    window.location.reload();
});

tosCheckboxEl.addEventListener("click", () => {
    toggleAttribute(tosCheckboxEl, "data-checked");
});

signInTokenBtnEl.addEventListener("click", async () => {
    if (tosCheckboxEl.getAttribute("data-checked") === "true") {
        try {
            const response = await fetch("https://api.github.com/user", {
                method: "GET",
                headers: {
                    "Accept": "application/vnd.github+json",
                    "Authorization": `Bearer ${signInTokenInputEl.value}`,
                    "X-GitHub-Api-Version": githubApiVersion
                }
            });
            
            if (response.ok !== true) {
                throw new Error(response.status);
            };
        
            if (response.headers.get("X-OAuth-Scopes").split(", ").includes("repo") === true) {
                const responseData = await response.json();
                await generateCryptKey();
                const { iv, encrypted } = await encrypt(signInTokenInputEl.value);
                sessionStorage.setItem("tokenInitializationVector", uint8ArrayToBase64(iv));
                sessionStorage.setItem("githubAccessToken", uint8ArrayToBase64(new Uint8Array(encrypted)));
                sessionStorage.setItem("tokenRequestUsed", response.headers.get("x-ratelimit-used"));
                sessionStorage.setItem("tokenRequestRateLimit", response.headers.get("x-ratelimit-limit"));
                sessionStorage.setItem("tokenRequestResetTimestamp", response.headers.get("x-ratelimit-reset"));
                sessionStorage.setItem("tokenScopesArray", JSON.stringify(response.headers.get("X-OAuth-Scopes").split(", ")));
                sessionStorage.setItem("userStatus", "connected");
                sessionStorage.setItem("connectedUserName", responseData.login);
                if (responseData.email === null) {
                    sessionStorage.setItem("connectedUserEmail", `${responseData.id}+${responseData.login}@users.noreply.github.com`);
                } else {
                    sessionStorage.setItem("connectedUserEmail", responseData.email);
                };
                sessionStorage.setItem("userAvatarUrl", responseData.avatar_url);
                window.location.reload();
            } else {
                throw new Error(403);
            };
        } catch (error) {
            if (error.message === "401") {
                newAlert("error", signInMenuEl.querySelector("div.body"), "d60bffe8-ab9f-4a91-a638-7ef502b288b1");
            } else if (error.message === "403") {
                newAlert("error", signInMenuEl.querySelector("div.body"), "3142308b-30d2-4b7a-873f-83886ac8543a");
            } else {
                newAlert("error", signInMenuEl.querySelector("div.body"), "46ddf094-cf08-45cc-acce-7a4c6b4afb75");
            };
        };
    } else {
        newAlert("error", signInMenuEl.querySelector("div.body"), "7c735091-d2c3-4861-abb9-dd8417fc053a");
    };
});

async function accountTokenInputValueToggle() {
    if (accountTokenInputEl.getAttribute("data-obfuscated") === "true") {
        accountTokenInputEl.value = await getUserToken();
    } else {
        accountTokenInputEl.value = "****************************************";
    };
    toggleAttribute(accountTokenInputEl, "data-obfuscated");
};

accountTokenInputEl.addEventListener("focus", async () => {
    await accountTokenInputValueToggle();
});

accountTokenInputEl.addEventListener("blur", async () => {
    await accountTokenInputValueToggle();
});

revertAccountBtnEl.addEventListener("click", async () => {
    const tokenScopesArray = JSON.parse(sessionStorage.getItem("tokenScopesArray"));
    const githubApiRepoUrl = `https://api.github.com/repos/${sessionStorage.getItem("connectedUserName")}/gitart-repository`;
    const fetchHeadersObj = {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${await getUserToken()}`,
        "X-GitHub-Api-Version": githubApiVersion
    };

    if (tokenScopesArray.includes("delete_repo") === true) {
        try {
            const response = await fetch(githubApiRepoUrl, {
                method: "DELETE",
                headers: fetchHeadersObj
            });

            if (response.ok !== true && response.status !== 404 && response.status !== 204) {
                throw new Error(response.status);
            };

            if (response.status === 404) {
                newAlert("error", accountMenuEl.querySelector("div.body"), "e7fafd09-0511-43bd-984d-98b4ec653d83");
            };

            if (response.status === 204) {
                newAlert("info", accountMenuEl.querySelector("div.body"), "6beefbef-b34d-473e-8829-dec665b19843");
            };

            sessionStorage.setItem("tokenRequestUsed", response.headers.get("x-ratelimit-used"));
            sessionStorage.setItem("tokenRequestResetTimestamp", response.headers.get("x-ratelimit-reset"));
        } catch (error) {
            console.error(error);
        };
    } else {
        newAlert("error", accountMenuEl.querySelector("div.body"), "d76e857b-6e2b-470c-9b29-6e90f6c07254");
    };
});

signOutBtnEl.addEventListener("click", async () => {
    sessionStorage.clear();
    await removeCryptKey();
    window.location.reload();
});

selectYearBtnEl.querySelector("button:nth-of-type(1)").addEventListener("click", () => {
    const currentValue = parseInt(selectYearBtnValueEl.innerText, 10);
    if (currentValue > 1970) {
        selectYearBtnValueEl.innerText = currentValue - 1;
        sessionStorage.removeItem("contributionMatrix");
        generateContributionCalendar(currentValue - 1);
    };
});

selectYearBtnEl.querySelector("button:nth-of-type(2)").addEventListener("click", () => {
    const currentYear = new Date().getFullYear();
    const currentValue = parseInt(selectYearBtnValueEl.innerText, 10);
    if (currentValue < currentYear) {
        selectYearBtnValueEl.innerText = currentValue + 1;
        sessionStorage.removeItem("contributionMatrix");
        generateContributionCalendar(currentValue + 1);
    };
});

pushArtBtnEl.addEventListener("click", async () => {
    if (sessionStorage.getItem("userStatus") === "connected") {
        const contributionMatrix = JSON.parse(sessionStorage.getItem("contributionMatrix"));
        let isContributionMatrixEmpty = true;

        for (let i = 0; i < contributionMatrix.length; i += 1) {
            for (let j = 0; j < contributionMatrix[i].length; j += 1) {
                if (contributionMatrix[i][j].level >= 1) {
                    isContributionMatrixEmpty = false;
                    break;
                };
            };
        };

        if (isContributionMatrixEmpty === false) {
            dialogBoxContainerEl.classList.toggle("visibleEl");
            loadingMenuEl.classList.toggle("visibleElAnimScale");
            openMenuName = "loading";
    
            let anErrorHasOccurred = false;
            
            const githubApiRepoUrl = `https://api.github.com/repos/${sessionStorage.getItem("connectedUserName")}/gitart-repository`;
            const fetchHeadersObj = {
                "Accept": "application/vnd.github+json",
                "Authorization": `Bearer ${await getUserToken()}`,
                "X-GitHub-Api-Version": githubApiVersion
            };

            async function getLastCommitSha() {
                const response = await fetch(`${githubApiRepoUrl}/git/refs/heads/main`, {
                    method: "GET",
                    headers: fetchHeadersObj
                });
                const responseData = await response.json();
            
                return responseData.object.sha;
            };

            async function getTreeSha(lastCommitSha) {
                const response = await fetch(`${githubApiRepoUrl}/git/commits/${lastCommitSha}`, {
                    method: "GET",
                    headers: fetchHeadersObj
                });
                const responseData = await response.json();
    
                return responseData.tree.sha;
            };
            
            async function pushCommit(commitDataObj) {
                if (commitDataObj.method === "create") {
                    const bodyObj = {
                        message: commitDataObj.message,
                        content: btoa(unescape(encodeURIComponent(commitDataObj.content))),
                    };

                    try {
                        const response = await fetch(`${githubApiRepoUrl}/contents/${commitDataObj.filePath}`, {
                            method: "PUT",
                            headers: fetchHeadersObj,
                            body: JSON.stringify(bodyObj)
                        });
                        
                        return response;
                    } catch (error) {
                        newAlert("error", loadingMenuEl.querySelector("div.body"), "46ddf094-cf08-45cc-acce-7a4c6b4afb75");
                    };
                } else {
                    const lastCommitSha = await getLastCommitSha();
                    
                    const bodyObj = {
                        message: commitDataObj.message,
                        tree: await getTreeSha(lastCommitSha),
                        parents: [lastCommitSha],
                        author: {
                            name: commitDataObj.author.name,
                            email: commitDataObj.author.email,
                            date: `${commitDataObj.author.date}T00:00:00Z`
                        }
                    };

                    try {
                        const response = await fetch(`${githubApiRepoUrl}/git/commits`, {
                            method: "POST",
                            headers: fetchHeadersObj,
                            body: JSON.stringify(bodyObj)
                        });
                        const responseData = await response.json();

                        await fetch(`${githubApiRepoUrl}/git/refs/heads/main`, {
                            method: "PATCH",
                            headers: fetchHeadersObj,
                            body: JSON.stringify({
                                sha: responseData.sha,
                                force: false
                            })
                        });

                        return response;
                    } catch (error) {
                        newAlert("error", loadingMenuEl.querySelector("div.body"), "46ddf094-cf08-45cc-acce-7a4c6b4afb75");
                    };
                };
            };
    
            try {
                const response = await fetch(githubApiRepoUrl, {
                    method: "GET",
                    headers: fetchHeadersObj
                });
        
                if (response.ok !== true && response.status !== 404) {
                    throw new Error(response.status);
                };
        
                if (response.status === 404) {
                    try {
                        const response = await fetch("https://api.github.com/user/repos", {
                            method: "POST",
                            headers: fetchHeadersObj,
                            body: JSON.stringify({
                                name: "gitart-repository",
                                description: "This repository was automatically generated by GitArt !",
                                private: false
                            })
                        });
                
                        if (response.ok !== true) {
                            throw new Error(response.status);
                        };
                    } catch (error) {
                        anErrorHasOccurred = true;
                        newAlert("error", loadingMenuEl.querySelector("div.body"), "46ddf094-cf08-45cc-acce-7a4c6b4afb75");
                    };
    
                    try {
                        const readmeFile = await fetch("../assets/template/README.md");
                        
                        await pushCommit({
                            method: "create",
                            filePath: "README.md",
                            message: "Creation of the gitart-repository.",
                            content: await readmeFile.text()
                        });
                    } catch (error) {
                        newAlert("error", loadingMenuEl.querySelector("div.body"), "46ddf094-cf08-45cc-acce-7a4c6b4afb75");
                    };
                };
            } catch (error) {
                anErrorHasOccurred = true;
                if (error.message === "401" || error.message === "403") {
                    newAlert("error", loadingMenuEl.querySelector("div.body"), "05503e01-a61f-486e-8571-21c830edc77f");
                } else {
                    newAlert("error", loadingMenuEl.querySelector("div.body"), "46ddf094-cf08-45cc-acce-7a4c6b4afb75");
                };
            };
    
            if (anErrorHasOccurred === false) {
                if (contributionMatrix.flat().reduce((sum, obj) => sum + (parseInt(obj.level, 10) || 0), 0) >= 50) {
                    newAlert("warning", loadingMenuEl.querySelector("div.body"), "da16b3fb-5e3c-43ee-806a-620c1d95c10e");
                };

                try {
                    const authorObj = {
                        name: sessionStorage.getItem("connectedUserName"),
                        email: sessionStorage.getItem("connectedUserEmail"),
                    };

                    const defaultHeader= {
                       rateLimitUsed: parseInt(sessionStorage.getItem("tokenRequestUsed"), 10),
                       rateLimit: parseInt(sessionStorage.getItem("tokenRequestRateLimit"), 10)
                    };

                    let lastCommitResponse = {};
                    const commitsNeededObj = {
                        level0: 0,
                        level1: 1,
                        level2: 2,
                        level3: 3,
                        level4: 5
                    };

                    for (let i = 0; i < contributionMatrix.length; i += 1) {
                        for (let j = 0; j < contributionMatrix[0].length; j += 1) {
                            const contributionDayObj = contributionMatrix[i][j];
                            if (contributionDayObj.date !== null) {
                                if (defaultHeader.rateLimitUsed < defaultHeader.rateLimit || parseInt(lastCommitResponse.headers.get("x-ratelimit-used"), 10) < parseInt(lastCommitResponse.headers.get("x-ratelimit-limit"), 10)) {
                                    for (let k = 0; k < commitsNeededObj[`level${contributionDayObj.level}`]; k += 1) {
                                        const commitDate = monthToDate(selectYearBtnValueEl.innerText, contributionDayObj.date);
                                        
                                        lastCommitResponse = await pushCommit({
                                            method: "empty",
                                            message: `Commit generated for ${commitDate}.`,
                                            author: {
                                                name: authorObj.name,
                                                email: authorObj.email,
                                                date: commitDate
                                            }
                                        });
                                    };
                                } else {
                                    newAlert("error", loadingMenuEl.querySelector("div.body"), "f385e8cf-f644-41d3-b2d4-3e376e24120c");
                                    break;
                                };
                            };
                        };
                    };

                    sessionStorage.setItem("tokenRequestUsed", lastCommitResponse.headers.get("x-ratelimit-used"));
                    sessionStorage.setItem("tokenRequestResetTimestamp", lastCommitResponse.headers.get("x-ratelimit-reset"));
    
                    loadingMenuEl.querySelector("div.header > p").setAttribute("data-translate-uuid", "c8e22d35-ff5e-42ca-8b1c-b1893b869adc");
                    loadingMenuEl.querySelector("div.body > div:nth-of-type(1) > p").setAttribute("data-translate-uuid", "dd1cd493-58c5-42ec-84f6-17864b955083");
                    translateSpecificEl([loadingMenuEl.querySelector("div.header > p"), loadingMenuEl.querySelector("div.body > div:nth-of-type(1) > p")], userSettingsObj.lang.short);
                    closeLoadingMenuBtnEl.style.cursor = "pointer";
                    loadingMenuEl.querySelector("div.body > div:nth-of-type(1) > svg").style.display = "none";
                    newAlert("info", loadingMenuEl.querySelector("div.body"), "67d2b3af-20b5-4480-9c8a-335dbb8855d2");
                } catch (error) {
                    newAlert("error", loadingMenuEl.querySelector("div.body"), "46ddf094-cf08-45cc-acce-7a4c6b4afb75");
                    closeLoadingMenuBtnEl.style.cursor = "pointer";
                };
            };
        } else {
            newAlert("error", appMainEl, "6d893dba-b83c-437c-829f-67266245d630");
        };
    } else {
        newAlert("error", appMainEl, "1c736198-9c39-45b3-b57c-3d8cba8056c6");
    };
});

closeLoadingMenuBtnEl.addEventListener("click", () => {
    if (window.getComputedStyle(closeLoadingMenuBtnEl).cursor !== "not-allowed") {
        dialogBoxContainerEl.classList.toggle("visibleEl");
        loadingMenuEl.classList.toggle("visibleElAnimScale");
        loadingMenuEl.querySelector("div.header > p").setAttribute("data-translate-uuid", "2790ddf0-2fa3-4047-b8f2-0cffbed44914");
        loadingMenuEl.querySelector("div.body > div:nth-of-type(1) > svg").style.display = "block";
        loadingMenuEl.querySelector("div.body > div:nth-of-type(1) > p").setAttribute("data-translate-uuid", "2baae925-eafe-4c32-beba-8a5aeeeec68f");
        translateSpecificEl([loadingMenuEl.querySelector("div.header > p"), loadingMenuEl.querySelector("div.body > div:nth-of-type(1) > p")], userSettingsObj.lang.short);
        closeLoadingMenuBtnEl.style.cursor = "not-allowed";
    };
});