

const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");
const suggestionItems = document.querySelectorAll(".suggests__item");

const themeToggleButton = document.getElementById("themeToggler");
const clearChatButton = document.getElementById("deleteButton");
const photoInput = document.getElementById("photoInput");

// State variables
let currentUserMessage = null;
let isGeneratingResponse = false;

const GOOGLE_API_KEY = "AIzaSyAChHq9fRZOm9ut6WE9m9CdupKMpWEiGDs"; // this is a dummy keu past your key avaliable for free in Gemini website
const API_REQUEST_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`;

// Scroll helper
const scrollToBottom = () => {
    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
};

// Load saved chats
const loadSavedChatHistory = () => {
    const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    const isLightTheme = localStorage.getItem("themeColor") === "light_mode";

    document.body.classList.toggle("light_mode", isLightTheme);
    themeToggleButton.innerHTML = isLightTheme ? '<i class="bx bx-moon"></i>' : '<i class="bx bx-sun"></i>';

    chatHistoryContainer.innerHTML = '';

    savedConversations.forEach(conversation => {
        const userMessageHtml = `
            <div class="message__content">
                <img class="message__avatar" src="assets/profile.png" alt="User avatar">
                <p class="message__text">${conversation.userMessage}</p>
            </div>
        `;
        const outgoingMessageElement = createChatMessageElement(userMessageHtml, "message--outgoing");
        chatHistoryContainer.appendChild(outgoingMessageElement);

        const responseText = conversation.apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsedApiResponse = marked.parse(responseText);

        const responseHtml = `
            <div class="message__content">
                <img class="message__avatar" src="assets/gemini.svg" alt="Gemini avatar">
                <p class="message__text"></p>
                <div class="message__loading-indicator hide">
                    <div class="message__loading-bar"></div>
                    <div class="message__loading-bar"></div>
                    <div class="message__loading-bar"></div>
                </div>
            </div>
            <span onClick="copyMessageToClipboard(this)" class="message__icon hide"><i class='bx bx-copy-alt'></i></span>
        `;
        const incomingMessageElement = createChatMessageElement(responseHtml, "message--incoming");
        chatHistoryContainer.appendChild(incomingMessageElement);

        const messageTextElement = incomingMessageElement.querySelector(".message__text");
        showTypingEffect(responseText, parsedApiResponse, messageTextElement, incomingMessageElement, true);
    });

    document.body.classList.toggle("hide-header", savedConversations.length > 0);
};

// Create chat message block
const createChatMessageElement = (htmlContent, ...cssClasses) => {
    const el = document.createElement("div");
    el.classList.add("message", ...cssClasses);
    el.innerHTML = htmlContent;
    return el;
};

// Typing effect
const showTypingEffect = (rawText, htmlText, messageElement, incomingMessageElement, skipEffect = false) => {
    const copyIcon = incomingMessageElement.querySelector(".message__icon");
    copyIcon.classList.add("hide");

    if (skipEffect) {
        messageElement.innerHTML = htmlText;
        hljs.highlightAll();
        addCopyButtonToCodeBlocks();
        copyIcon.classList.remove("hide");
        isGeneratingResponse = false;
        scrollToBottom();
        return;
    }

    const words = rawText.split(' ');
    let index = 0;

    const typing = setInterval(() => {
        messageElement.innerText += (index === 0 ? '' : ' ') + words[index++];
        scrollToBottom();
        if (index === words.length) {
            clearInterval(typing);
            isGeneratingResponse = false;
            messageElement.innerHTML = htmlText;
            hljs.highlightAll();
            addCopyButtonToCodeBlocks();
            copyIcon.classList.remove("hide");
            scrollToBottom();
        }
    }, 75);
};

// Send to Gemini API
const requestApiResponse = async (incomingEl) => {
    const messageText = incomingEl.querySelector(".message__text");

    try {
        const response = await fetch(API_REQUEST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: currentUserMessage }] }]
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = marked.parse(responseText);

        showTypingEffect(responseText, parsed, messageText, incomingEl);

        let saved = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
        saved.push({ userMessage: currentUserMessage, apiResponse: data });
        localStorage.setItem("saved-api-chats", JSON.stringify(saved));
    } catch (err) {
        isGeneratingResponse = false;
        messageText.innerText = err.message;
        incomingEl.classList.add("message--error");
    } finally {
        incomingEl.classList.remove("message--loading");
        scrollToBottom();
    }
};

// Show Gemini loading message
const displayLoadingAnimation = () => {
    const loadingHTML = `
        <div class="message__content">
            <img class="message__avatar" src="assets/gemini.svg" alt="Gemini avatar">
            <p class="message__text"></p>
            <div class="message__loading-indicator">
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
            </div>
        </div>
        <span onClick="copyMessageToClipboard(this)" class="message__icon hide"><i class='bx bx-copy-alt'></i></span>
    `;
    const el = createChatMessageElement(loadingHTML, "message--incoming", "message--loading");
    chatHistoryContainer.appendChild(el);
    scrollToBottom();
    requestApiResponse(el);
};

// Copy message
const copyMessageToClipboard = (btn) => {
    const text = btn.parentElement.querySelector(".message__text").innerText;
    navigator.clipboard.writeText(text);
    btn.innerHTML = `<i class='bx bx-check'></i>`;
    setTimeout(() => btn.innerHTML = `<i class='bx bx-copy-alt'></i>`, 1000);
};

// Send user message
const handleOutgoingMessage = () => {
    currentUserMessage = messageForm.querySelector(".prompt__form-input").value.trim() || currentUserMessage;
    if (!currentUserMessage || isGeneratingResponse) return;

    isGeneratingResponse = true;

    const userHTML = `
        <div class="message__content">
            <img class="message__avatar" src="assets/profile.png" alt="User avatar">
            <p class="message__text">${currentUserMessage}</p>
        </div>
    `;
    const el = createChatMessageElement(userHTML, "message--outgoing");
    chatHistoryContainer.appendChild(el);
    scrollToBottom();

    messageForm.reset();
    document.body.classList.add("hide-header");

    setTimeout(displayLoadingAnimation, 500);
};

// Add copy buttons to code blocks
const addCopyButtonToCodeBlocks = () => {
    const blocks = document.querySelectorAll("pre");
    blocks.forEach(block => {
        const code = block.querySelector("code");
        const lang = [...code.classList].find(c => c.startsWith("language-"))?.split("-")[1] || "Text";

        const label = document.createElement("div");
        label.innerText = lang;
        label.className = "code__language-label";
        block.appendChild(label);

        const btn = document.createElement("button");
        btn.innerHTML = `<i class='bx bx-copy'></i>`;
        btn.className = "code__copy-btn";
        block.appendChild(btn);

        btn.onclick = () => {
            navigator.clipboard.writeText(code.innerText);
            btn.innerHTML = `<i class='bx bx-check'></i>`;
            setTimeout(() => btn.innerHTML = `<i class='bx bx-copy'></i>`, 2000);
        };
    });
};

// Theme toggle
themeToggleButton.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLight ? "light_mode" : "dark_mode");
    themeToggleButton.innerHTML = isLight ? '<i class="bx bx-moon"></i>' : '<i class="bx bx-sun"></i>';
});

// Clear chat
clearChatButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all chat history?")) {
        localStorage.removeItem("saved-api-chats");
        loadSavedChatHistory();
        currentUserMessage = null;
        isGeneratingResponse = false;
    }
});

// Suggestion click
suggestionItems.forEach(item => {
    item.addEventListener("click", () => {
        currentUserMessage = item.querySelector(".suggests__item-text").innerText;
        handleOutgoingMessage();
    });
});

// Submit message
messageForm.addEventListener("submit", e => {
    e.preventDefault();
    handleOutgoingMessage();
});

// Load on start
loadSavedChatHistory();

// Handle image upload
photoInput?.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
            const imageUrl = reader.result;
            const imageHTML = `
                <div class="message__content">
                    <img class="message__avatar" src="assets/profile.png" alt="User avatar">
                    <div class="message__text">
                        <img src="${imageUrl}" alt="Uploaded photo" class="uploaded-photo">
                    </div>
                </div>
            `;
            const el = createChatMessageElement(imageHTML, "message--outgoing");
            chatHistoryContainer.appendChild(el);
            scrollToBottom();
        };
        reader.readAsDataURL(file);
    }
});

