const API_BASE_URL =
  "https://lost-and-found-backend-rsuq.onrender.com/api";

const SOCKET_BASE_URL =
  "https://lost-and-found-backend-rsuq.onrender.com";

console.log("SCRIPT LOADED");
let socket = null;

  const views = [
    "view-home",
    "view-dashboard",
    "view-about",
    "view-messages",
    "view-login",
    "view-signup",
    "view-profile"
  ];

  views.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });


function setActiveNav(view) {
  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.classList.remove("active");

    if (link.dataset.view === view) {
      link.classList.add("active");
    }
  });
}

function showHome() {
  hideAllViews();

  const home = document.getElementById("view-home");
  if (!home) return;

  home.style.display = "block";

  setActiveNav("home");
  updateNavAuthUI();

  loadItems();

  startAutoRefresh();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

let refreshInterval = null;

function startAutoRefresh() {

  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(() => {

    console.log("Auto refreshing feed...");

    if (typeof loadItems === "function") {
      loadItems();
    }

  }, 5000); // refresh every 5 seconds

}

const LOCATION_FILTER_OPTIONS = {
  malls: [
    "Dubai Mall",
    "Mall of the Emirates",
    "BurJuman",
    "Deira City Centre",
    "Ibn Battuta Mall",
    "City Centre Mirdif",
    "Dubai Hills Mall",
    "Dubai Marina Mall",
    "Dubai Festival City Mall",
    "Dubai Outlet Mall"
  ],
  metroStations: [
    "BurJuman",
    "Union",
    "Business Bay",
    "DMCC",
    "Burj Khalifa/Dubai Mall",
    "Centrepoint",
    "Etisalat",
    "Sobha Realty",
    "Creek"
  ],
  airports: [
    "Dubai International Airport (DXB)",
    "Al Maktoum International Airport (DWC)"
  ],
  cityAreas: [
    "Downtown Dubai",
    "Dubai Marina",
    "Deira",
    "Bur Dubai",
    "Business Bay",
    "Jumeirah",
    "Al Barsha",
    "Dubai Hills",
    "Festival City",
    "Dubai Silicon Oasis"
  ]
};

let currentFeedReports = [];

let liveThreads = [];
let activeChatId = null;
let activeChatData = null;
let activeChatMessages = [];

const ABOUT_HTML = `
  <section class="aboutSection">
    <div class="aboutContainer">
      <div class="aboutIntro">
        <h1 class="aboutTitle">About Us</h1>

        <p class="aboutText">
          Built with a commitment to making item recovery easier and more reliable, Lost &amp; Found is your trusted digital
          companion for reporting, tracking and reconnecting people with their belongings across Dubai.
        </p>

        <p class="aboutText">
          Our platform is designed to simplify the lost-and-found process by bringing together lost item reports, found
          item submissions and smart matching support in one easy-to-use space. Whether you misplaced your wallet,
          phone, keys, bag or important documents, Lost &amp; Found helps make the recovery journey faster, clearer and
          more secure.
        </p>

        <p class="aboutHighlight">
          Looking for a simple way to report a lost item or return something you found? Lost &amp; Found is here to help
          make recovery easier, safer and more efficient.
        </p>
      </div>

      <div class="aboutCards">
        <article class="aboutCard">
          <p class="aboutCardText">
            Search or report lost items across malls, metro stations and airports in Dubai.
          </p>
          <div class="aboutCardIcon">🔍</div>
        </article>

        <article class="aboutCard">
          <p class="aboutCardText">
            Get smart matching support based on item category, description, location and uploaded images.
          </p>
          <div class="aboutCardIcon">🧠</div>
        </article>

        <article class="aboutCard">
          <p class="aboutCardText">
            Review updates, verify claims and improve recovery confidence through a secure reporting process.
          </p>
          <div class="aboutCardIcon">📋</div>
        </article>
      </div>
    </div>
  </section>
`;

const messageThreads = [
  {
    id: 1,
    name: "John",
    preview: "Hi, I think I found your item.",
    status: "Possible match • Active now",
    messages: [
      { type: "incoming", text: "Hi..." },
      { type: "incoming", text: "Have you found my item?" },
      { type: "outgoing", text: "Yes! I found a black wallet near Dubai Mall." }
    ]
  },
  {
    id: 2,
    name: "RTA Station Desk",
    preview: "Please confirm the item color.",
    status: "Verification required",
    messages: [
      { type: "incoming", text: "Hello, we found a wallet." },
      { type: "incoming", text: "Can you confirm the color and any unique detail?" },
      { type: "outgoing", text: "It is black leather with two card slots inside." }
    ]
  },
  {
    id: 3,
    name: "Dubai Mall Security",
    preview: "We have a similar report in the system.",
    status: "Under review",
    messages: [
      { type: "incoming", text: "A similar item was submitted today." },
      { type: "incoming", text: "Please review the possible match in your dashboard." },
      { type: "outgoing", text: "Thank you, I will check it now." }
    ]
  },
  {
    id: 4,
    name: "Metro Lost & Found",
    preview: "Your claim is under review.",
    status: "Response in progress",
    messages: [
      { type: "incoming", text: "Your report has been received." },
      { type: "incoming", text: "Our team is reviewing the claim." },
      { type: "outgoing", text: "Thanks for the update." }
    ]
  }
];

function getStoredUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function getToken() {
  return localStorage.getItem("token");
}

function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  updateNavAuthUI();
  
  connectSocket();   
  showHome();
}

function updateNavAuthUI() {
  const navActions = document.querySelector(".nav-actions");
  if (!navActions) return;

  const user = getStoredUser();

  if (user) {
    const avatarSrc = user.profileImage || "";
    const avatarHTML = avatarSrc
      ? `<img src="${avatarSrc}" alt="Profile" class="nav-profile-pic" id="navProfilePic">`
      : `<div class="nav-profile-placeholder" id="navProfilePic">${(user.name || "U").charAt(0).toUpperCase()}</div>`;

    navActions.innerHTML = `
      <div class="nav-profile-wrap">
        ${avatarHTML}
        <a href="#" class="btn btn-outline-dark" id="logoutBtn">Logout</a>
        <a href="#" class="btn btn-accent" id="profileBtn">Profile</a>
      </div>
    `;

    document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      logoutUser();
    });

    document.getElementById("profileBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      showProfile();
    });
  } else {
    navActions.innerHTML = `
      <a href="#" class="btn btn-outline-dark" id="loginNavBtn">Login</a>
      <a href="#" class="btn btn-accent" id="signupNavBtn">Sign Up</a>
    `;

    document.getElementById("signupNavBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      showSignup();
    });

    document.getElementById("loginNavBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      showLogin();
    });
  }
}

function showNotification(notification) {

  const box = document.createElement("div");

  box.className = "notification-popup";

  box.innerText = notification.text;

  document.body.appendChild(box);

  setTimeout(() => {
    box.remove();
  }, 5000);

}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeVenueType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.includes("mall")) return "Mall";
  if (normalized.includes("metro")) return "Metro station";
  if (normalized.includes("airport")) return "Airport";
  return value || "";
}

function populateSelectOptions(selectId, options, defaultLabel) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = [`<option value="">${defaultLabel}</option>`]
    .concat(options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`))
    .join("");
}

function initializeLocationFilters() {
  populateSelectOptions("filter-mall", LOCATION_FILTER_OPTIONS.malls, "All Malls");
  populateSelectOptions("filter-metro", LOCATION_FILTER_OPTIONS.metroStations, "All Metro Stations");
  populateSelectOptions("filter-airport", LOCATION_FILTER_OPTIONS.airports, "All Airports");
  populateSelectOptions("filter-city-area", LOCATION_FILTER_OPTIONS.cityAreas, "All City Areas");
}

function getSelectedLocationFilters() {
  const mall = document.getElementById("filter-mall")?.value || "";
  const metro = document.getElementById("filter-metro")?.value || "";
  const airport = document.getElementById("filter-airport")?.value || "";
  const cityArea = document.getElementById("filter-city-area")?.value || "";

  if (mall) return { venueType: "Mall", location: mall, cityArea };
  if (metro) return { venueType: "Metro station", location: metro, cityArea };
  if (airport) return { venueType: "Airport", location: airport, cityArea };
  if (cityArea) return { cityArea };

  return {};
}

function connectSocket() {

  const token = getToken();

  if (!token) {
    console.log("No token — socket not started");
    return;
  }

  // disconnect previous socket
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_BASE_URL, {
  auth: { token }
});

  if (!socket) {
    console.log("Socket failed to initialize");
    return;
  }

  console.log("Initializing socket listeners...");

  socket.on("connect", () => {
    console.log("Socket connected");
  });

  if (socket) {
  socket.on("newNotification", showNotification);
}

  socket.on("reportCreated", () => {
    console.log("New report detected — refreshing items");

    if (typeof loadItems === "function") {
      loadItems();
    }
  });

  socket.on("new-message", async (payload) => {

    if (!payload || !payload.chatId) return;

    if (payload.chatId === activeChatId) {
      await loadChat(payload.chatId);
    }

    loadThreads();
  });

  socket.on("thread-updated", () => {
    loadThreads();
  });
}

async function showMessages() {

  const user = getStoredUser();

  if (!user || !getToken()) {
    alert("Please login first to use secure messages.");
    showLogin();
    return;
  }

  hideAllViews();

  const messages = document.getElementById("view-messages");

  if (!messages) return;

  messages.style.display = "block";

  setActiveNav("messages");

  updateNavAuthUI();

  connectSocket();

  await loadThreads();

  renderMessagesView();

  if (liveThreads.length && !activeChatId) {
    await loadChat(liveThreads[0].id);
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

async function apiFetch(url, options = {}) {
  const token = getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

async function loadThreads() {
  try {
    const res = await fetch(`${API_BASE_URL}/messages/threads`, {
      headers: {
        Authorization: "Bearer " + getToken()
      }
    });

    const threads = await res.json();

    if (!res.ok) {
      throw new Error(threads.message || "Failed to load threads");
    }

    liveThreads = Array.isArray(threads) ? threads : [];

    if (document.getElementById("view-messages")) {
      renderMessagesView();
    }
  } catch (error) {
    console.error("Load threads error:", error);
    liveThreads = [];
    renderMessagesView();
  }
}

async function loadChat(chatId) {
  try {
    const data = await apiFetch(`${API_BASE_URL}/messages/${chatId}`);
    activeChatId = chatId;
    activeChatData = data.chat;
    activeChatMessages = data.messages;

    renderMessagesView();

    if (socket) {
      socket.emit("join-chat", chatId);
    }
  } catch (error) {
    console.error("Load chat error:", error);
    alert(error.message);
  }
}

async function sendChatMessage(text) {
  if (!activeChatId) return;

  try {
    await apiFetch(`${API_BASE_URL}/messages/${activeChatId}/send`, {
      method: "POST",
      body: JSON.stringify({ text })
    });
  } catch (error) {
    console.error("Send message error:", error);
    alert(error.message);
  }
}

function updateMapView(report) {
  const mapFrame = document.getElementById("items-map-frame");
  const mapLabel = document.getElementById("items-map-label");
  if (!mapFrame || !mapLabel) return;

  const locationParts = [report?.location, report?.cityArea, "Dubai"].filter(Boolean);
  const query = locationParts.join(", ") || "Dubai";
  mapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  if (report) {
    const meta = [report.venueType, report.location, report.cityArea].filter(Boolean).join(" • ");
    mapLabel.textContent = meta || `Showing ${report.itemName || "selected item"}`;
  } else {
    mapLabel.textContent = "Showing latest item location";
  }
}

function getVerificationPrompts(report) {
  const prompts = [
    "Describe a unique mark, color detail, or identifying feature.",
    "Mention the contents, serial number, or anything specific that proves ownership."
  ];

  if (report?.verificationQuestion1?.trim() && !report?.verificationQuestion2?.trim()) {
    return [prompts[0]];
  }

  return prompts;
}

function getCurrentUserId() {
  return getStoredUser()?.id || getStoredUser()?._id || "";
}

function closeClaimModal() {
  const modal = document.getElementById("claim-modal");
  if (modal) modal.hidden = true;
  document.body.style.overflow = "";
}

function createMatchListHTML(matches = []) {
  if (!matches.length) {
    return `
      <div class="match-item">
        <strong>No possible matches yet</strong>
        <p>New reports will be compared automatically using image-style similarity, category and description.</p>
      </div>
    `;
  }

  return matches.map((match) => `
    <div class="match-item">
      <strong>${escapeHtml(match.itemName || "Item")}</strong>
      <p>${escapeHtml([match.category, match.venueType, match.location, match.cityArea].filter(Boolean).join(" • ") || "Dubai")}</p>
      <span class="item-chip match-chip">Match score ${Number(match.confidence || 0)}%</span>
    </div>
  `).join("");
}

async function loadFeedback() {
  const grid = document.getElementById("feedbackGrid");

  if (!grid) return;

  try {
    const response = await fetch(`${API_BASE_URL}/feedback`);

    const feedbacks = await response.json();

    if (!feedbacks.length) {
      grid.innerHTML = "<p>No feedback yet.</p>";
      return;
    }

    grid.innerHTML = feedbacks.map(fb => `
      <article class="feedback-card">
        <h3>"${fb.message}"</h3>

        <div class="feedback-user">
          <span class="feedback-avatar blue"></span>

          <div>
            <strong>${fb.name}</strong>
            <p>${new Date(fb.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </article>
    `).join("");

  } catch (error) {
    grid.innerHTML = "<p>Unable to load feedback.</p>";
  }
}

async function addFeedback() {

  const token = getToken();

  if (!token) {
    alert("Please login first.");
    showLogin();
    return;
  }

  const messageInput = document.getElementById("feedbackMessage");
  const message = messageInput?.value.trim();

  if (!message) {
    alert("Please write your feedback.");
    return;
  }

  try {

    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        message: message
      })
    });

    const data = await response.json();

    alert(data.message || "Feedback submitted");

    messageInput.value = "";

    document.getElementById("feedbackFormBox").style.display = "none";

    loadFeedback();

  } catch (error) {
    alert("Unable to submit feedback.");
  }

}

async function loadProfile() {
  try {
    const res = await fetch(
      `${API_BASE_URL}/auth/profile`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      }
    );

    const user = await res.json();

    if (!user) return;

    const nameField = document.getElementById("profileName");
    if (nameField) {
      nameField.value = user.displayName || "";
    }

    const bioField = document.getElementById("profileBio");
    if (bioField) {
      bioField.value = user.bio || "";
    }

    const preview = document.getElementById("profilePreview");
    if (preview && user.profileImage) {
      preview.src = user.profileImage;
    }

  } catch (err) {
    console.error("Error loading profile", err);
  }
}

function updateNavbarProfile(image) {
  const avatar = document.getElementById("navProfileImage");

  if (!avatar) return;

  if (image) {
    avatar.src = image;
  }
}

async function saveProfile() {

  const displayName =
    document.getElementById("displayName").value;

  const bio =
    document.getElementById("bio").value;

  const profileImage =
    document.getElementById("profilePreview").src;

  try {

    const res = await fetch(
      `${API_BASE_URL}/auth/profile`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          displayName,
          bio,
          profileImage
        })
      }
    );

    const data = await res.json();

    alert("Profile updated successfully");

    // 🔥 THIS FIXES YOUR NAVBAR IMAGE
    updateNavbarProfile(profileImage);

  } catch (err) {
    console.error(err);
  }
}

function openClaimModal(report) {
  const modal = document.getElementById("claim-modal");
  const content = document.getElementById("claim-modal-content");
  if (!modal || !content || !report) return;

  const prompts = getVerificationPrompts(report);
  const verificationCount = [report?.verificationQuestion1, report?.verificationQuestion2]
    .filter((value) => String(value || "").trim()).length;

  const hasVerificationDetails =
    Boolean(String(report?.verificationQuestion1 || "").trim()) ||
    Boolean(String(report?.verificationQuestion2 || "").trim());

  const currentUserId = getCurrentUserId();
  const isOwnItem = currentUserId && report.ownerUserId === currentUserId;

  const canClaim =
    Boolean(getToken()) &&
    !isOwnItem &&
    report.status !== "Resolved" &&
    hasVerificationDetails;

  const locationMeta = [report.venueType, report.location, report.cityArea]
    .filter(Boolean)
    .join(" • ") || "Dubai";

  content.innerHTML = `
    <div class="claim-modal-head">
      <h3>${escapeHtml(report.itemName || "Item")}</h3>
      <p>${escapeHtml(locationMeta)}</p>
    </div>

    <div class="claim-info-grid">
      <div class="claim-info-card">
        <strong>Item type</strong>
        <p>${report.type === "lost" ? "Lost item" : "Found item"}</p>
      </div>
      <div class="claim-info-card">
        <strong>Category</strong>
        <p>${escapeHtml(report.category || "General")}</p>
      </div>
      <div class="claim-info-card">
        <strong>Status</strong>
        <p>${escapeHtml(report.status || "Open")}</p>
      </div>
      <div class="claim-info-card">
        <strong>AI duplicate check</strong>
        <p>${report.duplicateFlag ? "Possible duplicate detected" : "No duplicate detected"}</p>
      </div>
    </div>

    <div class="claim-note">
      Tap claim only if this looks like your item. Your answers are checked against hidden verification details. Only a verified claim closes the item and removes it from the public feed.
    </div>

    <h4 class="claim-section-title">Possible Matches</h4>
    <div class="match-list">${createMatchListHTML(report.possibleMatches || [])}</div>

    <h4 class="claim-section-title">Verification Questions</h4>
    <div class="claim-question-list">
      ${
        hasVerificationDetails
          ? `
      <div class="claim-question-card">
        <label for="claim-answer-1">${escapeHtml(prompts[0])}</label>
        <input id="claim-answer-1" type="text" placeholder="Type your answer" />
      </div>
      ${verificationCount > 1 ? `
      <div class="claim-question-card">
        <label for="claim-answer-2">${escapeHtml(prompts[1])}</label>
        <input id="claim-answer-2" type="text" placeholder="Type your answer" />
      </div>` : ``}
          `
          : `
      <div class="claim-question-card">
        <label>No verification details were saved for this report.</label>
        <input type="text" placeholder="Claim unavailable for this item" disabled />
      </div>
          `
      }
    </div>

    <div class="claim-actions">
      ${canClaim ? `<button type="button" class="btn btn-accent" id="submit-claim-btn">Claim This Item</button>` : ``}
      <button type="button" class="btn btn-outline-dark" id="claim-cancel-btn">Close</button>
    </div>
    ${!getToken() ? `<p class="claim-note">Please login to submit a claim.</p>` : ``}
    ${isOwnItem ? `<p class="claim-note">This is your own report, so it cannot be claimed from this account.</p>` : ``}
    ${!hasVerificationDetails ? `<p class="claim-note">This item cannot be claimed because no verification details were saved when it was reported.</p>` : ``}
  `;

  modal.hidden = false;
  document.body.style.overflow = "hidden";

  document.getElementById("claim-cancel-btn")?.addEventListener("click", closeClaimModal);
  document.getElementById("submit-claim-btn")?.addEventListener("click", async () => {
    await submitClaim(report);
  });
}

async function submitClaim(report) {
  const token = getToken();
  if (!token) {
    alert("Please login first.");
    closeClaimModal();
    showLogin();
    return;
  }

  const answer1 = document.getElementById("claim-answer-1")?.value.trim() || "";
  const answer2 = document.getElementById("claim-answer-2")?.value.trim() || "";

  const requiresTwoAnswers = Boolean(report?.verificationQuestion2?.trim());

  if (!answer1 || (requiresTwoAnswers && !answer2)) {
    alert(requiresTwoAnswers
      ? "Please answer both verification questions before claiming."
      : "Please answer the verification question before claiming.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/claims`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        reportId: report._id,
        answer1,
        answer2
      })
    });

    let data = {};
    const responseText = await response.text();

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      data = { message: responseText || "Unexpected server response" };
    }

    alert(data.message || "Claim submitted");

    if (response.ok) {
  closeClaimModal();
  await loadItems();

  if (document.getElementById("dashboardReportsBody")) {
    await loadDashboardReports();
  }

  await startSecureChat(report._id);
}
  } catch (error) {
    console.error("Claim submit error:", error);
    alert("Unable to submit claim right now. Check that the backend server is running and restart it after the new claim changes.");
  }
}

function attachClaimModalEvents() {
  document.getElementById("claim-close-btn")?.addEventListener("click", closeClaimModal);
  document.getElementById("claim-modal-backdrop")?.addEventListener("click", closeClaimModal);
}

function attachItemCardMapEvents(reports = []) {
  document.querySelectorAll(".item-card[data-report-index]").forEach((card) => {
    card.addEventListener("click", () => {
      const index = Number(card.dataset.reportIndex);
      const report = reports[index];
      updateMapView(report);
      openClaimModal(report);
    });
  });
}

function attachLocationFilterEvents() {
  ["filter-mall", "filter-metro", "filter-airport", "filter-city-area"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", async (event) => {
      const currentId = event.target.id;
      ["filter-mall", "filter-metro", "filter-airport"].forEach((otherId) => {
        if (otherId !== currentId && currentId !== "filter-city-area") {
          const select = document.getElementById(otherId);
          if (select) select.value = "";
        }
      });

      await loadItems();
    });
  });

  document.getElementById("clear-location-filters")?.addEventListener("click", async () => {
    ["filter-mall", "filter-metro", "filter-airport", "filter-city-area"].forEach((id) => {
      const select = document.getElementById(id);
      if (select) select.value = "";
    });

    await loadItems();
  });
}

function createThreadListHTML() {
  if (!liveThreads.length) {
    return `<div class="emptyThreads">No secure conversations yet.</div>`;
  }

  return liveThreads.map((thread) => `
    <button
      class="threadItem ${thread.id === activeChatId ? "is-selected" : ""}"
      type="button"
      data-chat-id="${thread.id}"
    >
      <span class="threadAvatar">${(thread.otherUser.displayName || "U").charAt(0)}</span>
      <span class="threadNameWrap">
        <strong class="threadName">${escapeHtml(thread.otherUser.displayName || "User")}</strong>
        <span class="threadPreview">${escapeHtml(thread.lastMessage || "Start secure conversation")}</span>
      </span>
    </button>
  `).join("");
}

function createMessagesHTML() {
  const chatTitle = activeChatData?.otherUser?.displayName || "Secure Messages";
  const chatMeta = activeChatData
    ? activeChatData.contactUnlocked
      ? "Claim approved • Contact details unlocked"
      : "Anonymous secure chat • Contact hidden"
    : "Select a conversation";

  const messagesHTML = activeChatMessages.map((msg) => `
    <div class="messageRow ${msg.isMine ? "outgoing" : "incoming"}">
      ${!msg.isMine ? `<span class="messageAvatar">${chatTitle.charAt(0)}</span>` : ""}
      <div class="messageBubble">${escapeHtml(msg.text)}</div>
    </div>
  `).join("");

  const contactBox = activeChatData
    ? activeChatData.contactUnlocked
      ? `
        <div class="contactUnlockBox">
          <strong>Contact Details</strong>
          <p>Email: ${escapeHtml(activeChatData.otherUser.email || "-")}</p>
        </div>
      `
      : `
        <div class="contactUnlockBox locked">
          <strong>Anonymous Mode Active</strong>
          <p>Contact details will only be shown after claim approval.</p>
        </div>
      `
    : "";

  return `
    <section class="messagesSection">
      <div class="container messagesWrap">
        <aside class="messagesSidebar">
          <div class="messagesSearchWrap">
            <input class="messagesSearch" type="text" placeholder="Search conversations" />
          </div>

          <h2 class="messagesHeading">Messages</h2>

          <div class="threadList">
            ${createThreadListHTML()}
          </div>
        </aside>

        <section class="chatPanel">
          <header class="chatHeader">
            <div class="chatUser">
              <span class="chatUserAvatar">${chatTitle.charAt(0)}</span>
              <div>
                <strong class="chatUserName">${escapeHtml(chatTitle)}</strong>
                <p class="chatUserMeta">${escapeHtml(chatMeta)}</p>
              </div>
            </div>
          </header>

          ${contactBox}

          <div class="chatBody" id="chatBody">
            ${messagesHTML || `<div class="emptyChat">No messages yet.</div>`}
          </div>

          <form class="chatComposer" id="chatComposer">
            <input id="chatInput" type="text" placeholder="Message..." aria-label="Message" ${activeChatId ? "" : "disabled"} />
            <button type="submit" ${activeChatId ? "" : "disabled"}>SEND</button>
          </form>
        </section>
      </div>
    </section>
  `;
}

function renderMessagesView() {
  const messages = document.getElementById("view-messages");
  if (!messages) return;

  messages.innerHTML = createMessagesHTML();
  attachMessagesEvents();
  scrollChatToBottom();
}

function attachMessagesEvents() {
  const messagesRoot = document.getElementById("view-messages");
  if (!messagesRoot) return;

  const threadButtons = messagesRoot.querySelectorAll(".threadItem");
  const chatComposer = messagesRoot.querySelector("#chatComposer");
  const chatInput = messagesRoot.querySelector("#chatInput");

  threadButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const chatId = button.dataset.chatId;
      await loadChat(chatId);
    });
  });

  if (chatComposer && chatInput) {
    chatComposer.addEventListener("submit", async (e) => {
      e.preventDefault();

      const value = chatInput.value.trim();
      if (!value) return;

      await sendChatMessage(value);
      chatInput.value = "";
    });
  }
}

function renderActiveChatOnly() {
  const chatBody = document.getElementById("chatBody");
  if (!chatBody) {
    renderMessagesView();
    return;
  }

  chatBody.innerHTML = activeChatMessages.map((msg) => `
    <div class="messageRow ${msg.isMine ? "outgoing" : "incoming"}">
      ${!msg.isMine ? `<span class="messageAvatar">${(activeChatData?.otherUser?.displayName || "U").charAt(0)}</span>` : ""}
      <div class="messageBubble">${escapeHtml(msg.text)}</div>
    </div>
  `).join("");

  scrollChatToBottom();
}

function scrollChatToBottom() {
  const chatBody = document.getElementById("chatBody");
  if (!chatBody) return;
  chatBody.scrollTop = chatBody.scrollHeight;
}

function showAbout() {
  hideAllViews();
  const about = document.getElementById("view-about");
  if (!about) return;

  about.innerHTML = ABOUT_HTML;
  about.style.display = "block";
  setActiveNav("about");
  updateNavAuthUI();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const SIGNUP_HTML = `
  <section class="signupSection">
    <div class="signupContainer">
      <div class="signupCard">
        <h1 class="signupTitle">Sign Up</h1>

        <div class="signupSocials">
          <button
  class="socialBtn"
  type="button"
  onclick="triggerGoogleLogin()"
>
  <span class="socialIcon google">G</span>
  <span>Continue with Google</span>
</button>

          <button class="socialBtn" type="button">
            <span class="socialIcon facebook">f</span>
            <span>Continue with Facebook</span>
          </button>

          <button class="socialBtn" type="button">
            <span class="socialIcon apple">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.46 2.23-1.21 3.04-.79.86-2.08 1.53-3.24 1.43-.15-1.11.49-2.3 1.22-3.05.81-.83 2.22-1.45 3.23-1.42zM20.92 17.03c-.58 1.34-.86 1.94-1.61 3.09-1.04 1.57-2.5 3.52-4.32 3.53-1.63.02-2.05-1.05-4.26-1.04-2.21.01-2.67 1.06-4.26 1.04-1.83-.02-3.29-1.96-4.33-3.53C.72 15.07 0 12.76 0 10.59c0-3.38 2.21-5.18 4.37-5.21 1.72-.03 3.35 1.16 4.26 1.16.91 0 2.89-1.44 4.88-1.23.83.03 3.16.33 4.66 2.54-.12.07-2.78 1.62-2.75 4.83.03 3.84 3.37 5.12 3.41 5.14z"/>
  </svg>
</span>
            <span>Continue with Apple</span>
          </button>
        </div>

        <form class="signupForm" id="signupForm">
          <div class="signupField">
            <input type="email" id="signupEmail" placeholder="Email" required />
          </div>

          <div class="signupField">
            <input type="password" id="signupPassword" placeholder="Password" required />
          </div>

          <div class="signupField">
            <input type="text" id="signupName" placeholder="Name" required />
          </div>

          <div class="signupField">
          <input type="text" id="signupPhone" placeholder="Phone Number" required />
          </div>

          <label class="signupCheckbox">
            <input type="checkbox" />
            <span>Please don't send me marketing emails</span>
          </label>

          <button class="signupSubmit" type="submit">Sign Up</button>

          <button class="signupLinkBtn" id="goToLoginBtn" type="button">
            Already have an Account?
          </button>
        </form>
      </div>

      <p class="signupTerms">
        By continuing, you agree to Terms of Service and have read our Privacy Policy.
      </p>
    </div>
  </section>
`;

function showSignup() {
  hideAllViews();

  const signupView = document.getElementById("view-signup");
  if (!signupView) return;

  signupView.innerHTML = SIGNUP_HTML;
  signupView.style.display = "block";
  setActiveNav("");
  attachSignupEvents();
  updateNavAuthUI();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function attachSignupEvents() {
  const signupForm = document.getElementById("signupForm");
  const goToLoginBtn = document.getElementById("goToLoginBtn");
  const socialBtns = document.querySelectorAll(".signupSocials .socialBtn");

  function triggerGoogleLogin() {
  google.accounts.id.prompt();
}

 if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      email: document.getElementById("signupEmail").value.trim(),
      password: document.getElementById("signupPassword").value.trim(),
      name: document.getElementById("signupName").value.trim(),
      phone: document.getElementById("signupPhone").value.trim()
    };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Signup failed");
      }

      // ✅ ONLY ONE POPUP
      alert("Signup successful!");

      // ✅ Redirect to login page
      showLogin();

    } catch (err) {
      alert(err.message);
    }
  });
}

  if (goToLoginBtn) {
    goToLoginBtn.addEventListener("click", () => {
      showLogin();
    });
  }
}

function getProfileHTML(userData = {}) {
  const displayName = userData.name || getStoredUser()?.name || "";
  const displayEmail = userData.email || getStoredUser()?.email || "";
  const displayBio = userData.bio || "";
  const displayProfileImage = userData.profileImage || getStoredUser()?.profileImage || "";

  return `
    <section class="dashboardSection">
      <div class="container dashboardContainer">
        <div class="panelCard profileCardSmall" style="padding: 24px;">
          <div class="panelHead">
            <h3>My Profile</h3>
            <p>Update your personal details</p>
          </div>

          <div style="margin-top: 20px;">
            <div style="margin-bottom: 20px; text-align:center;">
              <div class="profile-preview-wrap">
                <img
                  id="profileImagePreview"
                  src="${displayProfileImage || ""}"
                  alt="Profile preview"
                  class="profile-preview-img ${displayProfileImage ? "has-image" : ""}"
                />
                <span class="profile-preview-text" id="profilePreviewText">
                  ${displayProfileImage ? "" : "Profile preview"}
                </span>
              </div>

              <div class="profile-upload-wrap">
                <label for="profileImage" class="profile-upload-btn">Choose file</label>
                <span class="profile-file-name" id="profileFileName">No file chosen</span>
                <input
                  type="file"
                  id="profileImage"
                  accept="image/png,image/jpeg,image/jpg"
                  style="display:none;"
                />
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display:block; margin-bottom:6px; font-weight:600;">Name</label>
              <input
                type="text"
                id="profileName"
                value="${displayName}"
                style="width:100%; padding:12px; border:1px solid #ddd; border-radius:10px;"
              />
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display:block; margin-bottom:6px; font-weight:600;">Email</label>
              <input
                type="text"
                value="${displayEmail}"
                disabled
                style="width:100%; padding:12px; border:1px solid #ddd; border-radius:10px; background:#f5f5f5;"
              />
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display:block; margin-bottom:6px; font-weight:600;">Bio</label>
              <textarea
                id="profileBio"
                rows="5"
                style="width:100%; padding:12px; border:1px solid #ddd; border-radius:10px;"
                placeholder="Write something about yourself..."
              >${displayBio}</textarea>
            </div>

            <button class="btn btn-accent" id="saveProfileBtn">Save Profile</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

async function startSecureChat(reportId) {
  try {
    const chat = await apiFetch(`${API_BASE_URL}/messages/start`, {
      method: "POST",
      body: JSON.stringify({ reportId })
    });

    // Save chat ID
    activeChatId = chat.id;

    // Open Messages page
    await showMessages();

    // Load that specific chat
    await loadChat(chat.id);

  } catch (error) {
    console.error("Start secure chat error:", error);
    alert(error.message || "Failed to start secure chat");
  }
}

async function showProfile() {
  hideAllViews();

  const profileView = document.getElementById("view-profile");
  if (!profileView) return;

  const token = getToken();

  if (!token) {
    alert("Please login first.");
    showLogin();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const userData = await response.json();

    profileView.innerHTML = getProfileHTML(userData);
    profileView.style.display = "block";
    setActiveNav("");
    updateNavAuthUI();
    attachProfileEvents();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    alert("Unable to load profile.");
  }
}

function attachProfileEvents() {
  const saveBtn = document.getElementById("saveProfileBtn");
  const profileImageInput = document.getElementById("profileImage");
  const profileImagePreview = document.getElementById("profileImagePreview");
  const profilePreviewText = document.getElementById("profilePreviewText");
  const profileFileName = document.getElementById("profileFileName");

  let profileImageData = getStoredUser()?.profileImage || "";

  if (profileImageInput && profileImagePreview) {
    profileImageInput.addEventListener("change", async () => {
      const file = profileImageInput.files?.[0];

      if (!file) {
        if (profileFileName) profileFileName.textContent = "No file chosen";
        return;
      }

      if (!file.type.startsWith("image/")) {
        alert("Please choose a valid image file.");
        profileImageInput.value = "";
        if (profileFileName) profileFileName.textContent = "No file chosen";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("Please choose an image smaller than 5MB.");
        profileImageInput.value = "";
        if (profileFileName) profileFileName.textContent = "No file chosen";
        return;
      }

      try {
        profileImageData = await readImageFileAsDataUrl(file);
        profileImagePreview.src = profileImageData;
        profileImagePreview.classList.add("has-image");

        if (profilePreviewText) {
          profilePreviewText.textContent = "";
        }

        if (profileFileName) {
          profileFileName.textContent = file.name;
        }
      } catch (error) {
        alert("Unable to preview image.");
      }
    });
  }

  if (!saveBtn) return;

  saveBtn.addEventListener("click", async () => {
  const token = getToken();

  const profileNameInput = document.getElementById("profileName");
  const name = profileNameInput?.value.trim() || "";

  const bio = document.getElementById("profileBio")?.value.trim() || "";

  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        bio,
        profileImage: profileImageData
      })
    });

    const data = await response.json();

    alert(data.message || "Profile updated");

    if (response.ok && data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      updateNavAuthUI();
      showProfile();
    }

  } catch (error) {
    alert("Unable to save profile.");
  }
});
}

const LOGIN_HTML = `
  <section class="loginSection">
    <div class="loginContainer">
      <div class="loginCard">
        <h1 class="loginTitle">Login</h1>

        <div class="loginSocials">
          <button
  class="socialBtn"
  type="button"
  onclick="triggerGoogleLogin()"
>
  <span class="socialIcon google">G</span>
  <span>Continue with Google</span>
</button>

          <button class="socialBtn" type="button">
            <span class="socialIcon facebook">f</span>
            <span>Continue with Facebook</span>
          </button>

          <button class="socialBtn" type="button">
            <span class="socialIcon apple">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.46 2.23-1.21 3.04-.79.86-2.08 1.53-3.24 1.43-.15-1.11.49-2.3 1.22-3.05.81-.83 2.22-1.45 3.23-1.42zM20.92 17.03c-.58 1.34-.86 1.94-1.61 3.09-1.04 1.57-2.5 3.52-4.32 3.53-1.63.02-2.05-1.05-4.26-1.04-2.21.01-2.67 1.06-4.26 1.04-1.83-.02-3.29-1.96-4.33-3.53C.72 15.07 0 12.76 0 10.59c0-3.38 2.21-5.18 4.37-5.21 1.72-.03 3.35 1.16 4.26 1.16.91 0 2.89-1.44 4.88-1.23.83.03 3.16.33 4.66 2.54-.12.07-2.78 1.62-2.75 4.83.03 3.84 3.37 5.12 3.41 5.14z"/>
  </svg>
</span>
            <span>Continue with Apple</span>
          </button>
        </div>

        <form class="loginForm" id="loginForm">
          <div class="loginField">
            <input type="email" id="loginEmail" placeholder="Email" required />
          </div>

          <div class="loginField">
            <input type="password" id="loginPassword" placeholder="Password" required />
          </div>

          <div class="loginMeta">
            <button class="forgotPasswordBtn" type="button">Forgot Password?</button>
          </div>

          <button class="loginSubmit" type="submit">Login</button>

          <button class="loginLinkBtn" id="goToSignupBtn" type="button">
            Don't have an Account?
          </button>
        </form>
      </div>

      <p class="loginTerms">
        By continuing, you agree to Terms of Service and have read our Privacy Policy.
      </p>
    </div>
  </section>
`;

function showLogin() {
  hideAllViews();

  const loginView = document.getElementById("view-login");
  if (!loginView) return;

  loginView.innerHTML = LOGIN_HTML;
  loginView.style.display = "block";
  setActiveNav("");
  attachLoginEvents();
  updateNavAuthUI();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function attachLoginEvents() {
  const loginForm = document.getElementById("loginForm");
  const goToSignupBtn = document.getElementById("goToSignupBtn");
  const forgotPasswordBtn = document.querySelector(".forgotPasswordBtn");
  const socialBtns = document.querySelectorAll(".loginSocials .socialBtn");

  function triggerGoogleLogin() {
  google.accounts.id.prompt();
}

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        email: document.getElementById("loginEmail")?.value.trim(),
        password: document.getElementById("loginPassword")?.value.trim()
      };

      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        alert(data.message || "Login completed");

        if (response.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          updateNavAuthUI();
          showHome();
        }
      } catch (error) {
        alert("Unable to connect to server");
      }
    });
  }

  if (goToSignupBtn) {
    goToSignupBtn.addEventListener("click", () => {
      showSignup();
    });
  }

  forgotPasswordBtn.addEventListener(
  "click",
  async () => {

    const email =
      document
        .getElementById("loginEmail")
        ?.value.trim();

    if (!email) {

      showNotification({
        text: "Please enter your email first"
      });

      return;

    }

    try {

      const response =
        await fetch(
          `${API_BASE_URL}/auth/forgot-password`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              email: email
            })
          }
        );

      const data =
        await response.json();

      if (response.ok) {

        showForgotPassword(email);

      } else {

        showNotification({
          text:
            data.message ||
            "Email not found"
        });

      }

    } catch (error) {

      showNotification({
        text:
          "Server error"
      });

    }

  }
);
}

function getDashboardHTML() {
  const user = getStoredUser();
  const displayName = user?.name || "Joe";

  return `
    <section class="dashboardSection">
      <div class="container dashboardContainer">
        <div class="dashboardHeader">
        </div>

        <div class="statsGrid">
          <article class="statCard">
            <p class="statLabel">Today's Reports</p>
            <h3>53</h3>
            <span class="statChange positive">+12%</span>
          </article>

          <article class="statCard">
            <p class="statLabel">Today's Users</p>
            <h3>230</h3>
            <span class="statChange positive">+5%</span>
          </article>

          <article class="statCard">
            <p class="statLabel">New Claims</p>
            <h3>17</h3>
            <span class="statChange negative">-4%</span>
          </article>

          <article class="statCard">
            <p class="statLabel">Recovered Items</p>
            <h3>173</h3>
            <span class="statChange positive">+3%</span>
          </article>
        </div>

        <div class="dashboardMainGrid">
          <article class="panelCard welcomeCard">
            <p class="panelMini">Welcome back,</p>
            <h2>${displayName}</h2>
            <p class="panelText">
              Track reports, review matches and monitor recovered items across the UAE.
            </p>
          </article>

          <article class="panelCard satisfactionCard">
            <div class="panelHead">
              <h3>Satisfaction Rate</h3>
              <p>Across all resolved reports</p>
            </div>
            <div class="ringWrap">
              <div class="ring">
                <span>95%</span>
              </div>
            </div>
            <p class="ringNote">Satisfaction of users</p>
          </article>

          <article class="panelCard referralCard">
            <div class="panelHead">
              <h3>Referral Tracking</h3>
            </div>
            <div class="referralRow">
              <div>
                <strong>145</strong>
                <p>people</p>
              </div>
              <div class="scoreCircle">
                <span>9.3</span>
              </div>
            </div>
            <div class="referralBars">
              <div class="refBarLabel">Average</div>
              <div class="refBar">
                <span style="width: 72%;"></span>
              </div>
              <strong>1,465</strong>
            </div>
          </article>
        </div>

        <div class="dashboardBottomGrid">
          <article class="panelCard chartCard">
            <div class="panelHead">
              <h3>Reports Overview</h3>
              <p>Monthly Activity</p>
            </div>
            <div class="fakeLineChart">
              <div class="wave wave1"></div>
              <div class="wave wave2"></div>
              <div class="chartMonths">
                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
              </div>
            </div>
          </article>

          <article class="panelCard activityCard">
            <div class="panelHead">
              <h3>Weekly Activity</h3>
            </div>
            <div class="barChart">
              <span style="height:26px"></span>
              <span style="height:34px"></span>
              <span style="height:18px"></span>
              <span style="height:22px"></span>
              <span style="height:38px"></span>
              <span style="height:46px"></span>
              <span style="height:40px"></span>
              <span style="height:44px"></span>
              <span style="height:28px"></span>
              <span style="height:16px"></span>
            </div>

            <div class="activityStats">
              <div>
                <h4>Active Users</h4>
                <p><strong>32,984</strong></p>
                <span>Reports <strong>2,400</strong></span>
              </div>
              <div>
                <h4>&nbsp;</h4>
                <p>Claims <strong>2,420</strong></p>
                <span>Items <strong>320</strong></span>
              </div>
            </div>
          </article>

          <article class="panelCard tableCard">
            <div class="panelHead">
              <h3>Recent Reports</h3>
            </div>
            <table class="reportTable">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody id="dashboardReportsBody">
                <tr>
                  <td colspan="4">Loading...</td>
                </tr>
              </tbody>
            </table>
          </article>

          <article class="panelCard overviewCard">
            <div class="panelHead">
              <h3>Overview</h3>
            </div>
            <ul class="overviewList">
              <li>+30% this month in report submissions</li>
              <li>+2400 pending changes resolved</li>
              <li>12 duplicate matches flagged by AI</li>
              <li>8 new partner locations added</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  `;
}

async function loadDashboardReports() {
  const tbody = document.getElementById("dashboardReportsBody");
  if (!tbody) return;

  const token = getToken();
  if (!token) {
    tbody.innerHTML = `<tr><td colspan="4">Please login first.</td></tr>`;
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/reports/mine`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const reports = await response.json();

    if (!response.ok || !Array.isArray(reports) || reports.length === 0) {
      currentFeedReports = [];
      tbody.innerHTML = `<tr><td colspan="4">No reports yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = reports.slice(0, 6).map((report) => `
      <tr>
        <td>${report.itemName || "-"}</td>
        <td>${report.location || "-"}</td>
        <td class="${report.status === "Matched" || report.status === "Resolved" ? "statusMatched" : "statusPending"}">${report.status || "Open"}</td>
        <td>${report.date || "-"}</td>
      </tr>
    `).join("");
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="4">Unable to load reports.</td></tr>`;
  }
}

function showDashboard() {
  hideAllViews();

  const dashboardView = document.getElementById("view-dashboard");
  if (!dashboardView) return;

  dashboardView.innerHTML = getDashboardHTML();
  dashboardView.style.display = "block";
  setActiveNav("dashboard");
  updateNavAuthUI();
  loadDashboardReports();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getImagePreviewSource(report) {

  if (!report || !report.image) {
    return "https://via.placeholder.com/300x200?text=No+Image";
  }

  // if already full URL
  if (report.image.startsWith("http")) {
    return report.image;
  }

  // build full backend path
  return SOCKET_BASE_URL + report.image;
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}

function handleImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  input.addEventListener("change", async () => {
    const file = input.files?.[0];

    if (!file) {
      preview.style.display = "none";
      preview.removeAttribute("src");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please choose a valid image file.");
      input.value = "";
      preview.style.display = "none";
      preview.removeAttribute("src");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Please choose an image smaller than 5MB.");
      input.value = "";
      preview.style.display = "none";
      preview.removeAttribute("src");
      return;
    }

    try {
      const imageData = await readImageFileAsDataUrl(file);
      preview.src = imageData;
      preview.style.display = "block";
    } catch (error) {
      console.error(error);
      alert("Unable to preview image.");
    }
  });
}

function getValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

async function loadItems() {
  const itemsGrid = document.getElementById("items-grid");
  if (!itemsGrid) return;

  try {
    const filters = getSelectedLocationFilters();
    const query = new URLSearchParams();

    if (filters.venueType) query.set("venueType", filters.venueType);
    if (filters.location) query.set("location", filters.location);
    if (filters.cityArea) query.set("cityArea", filters.cityArea);

    const queryString = query.toString();
    const response = await fetch(`${API_BASE_URL}/reports${queryString ? `?${queryString}` : ""}`);
    const reports = await response.json();

    if (!response.ok || !Array.isArray(reports) || reports.length === 0) {
      currentFeedReports = [];
      itemsGrid.innerHTML = `
        <article class="item-card">
          <div class="item-card-image">
            <img src="https://via.placeholder.com/400x400?text=No+Items" alt="No items">
          </div>
          <div class="item-card-body">
            <h3>No items found</h3>
            <p>Try a different location filter</p>
            <span>Dubai</span>
          </div>
        </article>
      `;
      updateMapView();
      return;
    }

    currentFeedReports = reports;

    itemsGrid.innerHTML = reports.map((item, index) => {
      const locationMeta = [item.venueType, item.location, item.cityArea].filter(Boolean).join(" • ") || "Dubai";
      const matchCount = Array.isArray(item.possibleMatches) ? item.possibleMatches.length : 0;
      const hasVerificationDetails =
        Boolean(String(item.verificationQuestion1 || "").trim()) ||
        Boolean(String(item.verificationQuestion2 || "").trim());

      return `
  <article class="item-card item-card-modern" data-report-index="${index}" style="cursor:pointer;">
    <div class="item-card-image-wrap">
      <div class="item-type-badge ${item.type === "lost" ? "lost" : "found"}">
        ${item.type === "lost" ? "Lost" : "Found"}
      </div>
      <div class="item-card-image">
        <img src="${getImagePreviewSource(item)}" alt="${escapeHtml(item.itemName || "Item")}">
      </div>
    </div>

    <div class="item-card-body modern-body">
      <h3 class="item-title">${escapeHtml(item.itemName || "Item")}</h3>

      <p class="item-description">
        ${escapeHtml(item.description || "No description provided for this item yet.")}
      </p>

      <div class="item-meta-line">
        <span>${escapeHtml(item.location || "Dubai")}</span>
        <span>•</span>
        <span>${escapeHtml(item.date || "No date")}</span>
      </div>

      <div class="item-meta-category">
        ${escapeHtml(item.category || "General")}
      </div>

      <div class="item-chip-row">
        <span class="item-chip">${hasVerificationDetails ? "Tap to claim" : "View details"}</span>
        <span class="item-chip match-chip">Possible matches ${matchCount}</span>
        ${item.duplicateFlag ? `<span class="item-chip duplicate-chip">Possible duplicate</span>` : ``}
      </div>
    </div>
  </article>
`;
    }).join("");

    updateMapView(reports[0]);
    attachItemCardMapEvents(reports);
  } catch (error) {

  console.error("LOAD ITEMS ERROR:", error);

  itemsGrid.innerHTML = `
    <article class="item-card">
      <div class="item-card-image">
      <img src="${getImagePreviewSource(item)}" alt="${escapeHtml(item.itemName || 'Item')}">
      </div>
      <div class="item-card-body">
        <h3>Unable to load items</h3>
        <p>Please check backend connection</p>
        <span>Server error</span>
      </div>
    </article>
  `;

  updateMapView();
}
}

async function submitLostReport() {

  const token = getToken();

  if (!token) {
    alert("Please login first.");
    showLogin();
    return;
  }

  const requiredFields = [
    "lost-name",
    "lost-email",
    "lost-phone",
    "lost-item-name",
    "lost-category",
    "lost-location",
    "lost-venue-type",
    "lost-city-area",
    "lost-date",
    "lost-time",
    "lost-description",
    "lost-verification-1"
  ];

  for (let fieldId of requiredFields) {
    const value = document.getElementById(fieldId)?.value.trim();

    if (!value) {
      alert("Please fill all required fields.");
      return;
    }
  }

  const formData = new FormData();

  formData.append("type", "lost");
  formData.append("userName", getValue("lost-name"));
  formData.append("email", getValue("lost-email"));
  formData.append("phone", getValue("lost-phone"));
  formData.append("itemName", getValue("lost-item-name"));
  formData.append("category", getValue("lost-category"));
  formData.append("location", getValue("lost-location"));
  formData.append("venueType", getValue("lost-venue-type"));
  formData.append("cityArea", getValue("lost-city-area"));
  formData.append("date", getValue("lost-date"));
  formData.append("time", getValue("lost-time"));
  formData.append("description", getValue("lost-description"));
  formData.append("verificationQuestion1", getValue("lost-verification-1"));
  formData.append("verificationQuestion2", getValue("lost-verification-2"));

  const imageInput = document.getElementById("lost-image");

  if (imageInput.files.length > 0) {
    formData.append("image", imageInput.files[0]);
  }

  try {

  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();

  console.log("SERVER RESPONSE:", data);

  if (response.ok) {

    showNotification({
      text: "Report submitted successfully"
    });

    document.getElementById("lostForm")?.reset();

    const preview =
      document.getElementById("lost-image-preview");

    if (preview) {
      preview.style.display = "none";
      preview.removeAttribute("src");
    }

    setTimeout(() => {
      loadItems();
    }, 2000);

  } else {

    showNotification({
      text: data.message || "Failed to submit report"
    });

  }

} catch (error) {

  console.error("Submit lost report error:", error);

  showNotification({
    text: "Unable to submit report. Check server connection."
  });

}

}

async function submitFoundReport() {

  const token = getToken();

  if (!token) {
    alert("Please login first.");
    showLogin();
    return;
  }

  const requiredFields = [
    "found-name",
    "found-email",
    "found-phone",
    "found-item-name",
    "found-category",
    "found-location",
    "found-venue-type",
    "found-city-area",
    "found-date",
    "found-time",
    "found-description",
    "found-verification-1"
  ];

  for (let fieldId of requiredFields) {
    const value =
      document.getElementById(fieldId)?.value.trim();

    if (!value) {
      alert(
        "Please fill all required fields before submitting the report."
      );
      return;
    }
  }

  const formData = new FormData();

  formData.append("type", "found");
  formData.append("userName", getValue("found-name"));
  formData.append("email", getValue("found-email"));
  formData.append("phone", getValue("found-phone"));
  formData.append("itemName", getValue("found-item-name"));
  formData.append("category", getValue("found-category"));
  formData.append("location", getValue("found-location"));
  formData.append("venueType", getValue("found-venue-type"));
  formData.append("cityArea", getValue("found-city-area"));
  formData.append("date", getValue("found-date"));
  formData.append("time", getValue("found-time"));
  formData.append("description", getValue("found-description"));
  formData.append(
    "verificationQuestion1",
    getValue("found-verification-1")
  );
  formData.append(
    "verificationQuestion2",
    getValue("found-verification-2")
  );

  const imageInput =
    document.getElementById("found-image");

  if (imageInput && imageInput.files.length > 0) {
    formData.append(
      "image",
      imageInput.files[0]
    );
  }

  try {

    const response = await fetch(
      `${API_BASE_URL}/reports`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      }
    );

    const data = await response.json();

    console.log("SERVER RESPONSE:", data);

    if (response.ok) {

      showNotification({
        text: "Report submitted successfully"
      });

      document
        .getElementById("foundForm")
        ?.reset();

      const preview =
        document.getElementById(
          "found-image-preview"
        );

      if (preview) {
        preview.style.display = "none";
        preview.removeAttribute("src");
      }

      setTimeout(() => {
        loadItems();
      }, 2000);

    } else {

      showNotification({
        text:
          data.message ||
          "Failed to submit report"
      });

    }

  } catch (error) {

    console.error(
      "Submit found report error:",
      error
    );

    showNotification({
      text:
        "Unable to submit report. Check server connection."
    });

  }

}

function showForgotPassword(email) {

  hideAllViews();

  const loginView =
    document.getElementById(
      "view-login"
    );

  if (!loginView) return;

  loginView.innerHTML = `
    <section class="loginSection">
      <div class="loginContainer">
        <div class="loginCard">

          <h1 class="loginTitle">
            Change Password
          </h1>

          <div class="loginField">
            <input
              type="email"
              value="${email}"
              disabled
            />
          </div>

          <div class="loginField">
            <input
              type="password"
              id="currentPassword"
              placeholder="Current Password"
              required
            />
          </div>

          <div class="loginField">
            <input
              type="password"
              id="newPassword"
              placeholder="New Password"
              required
            />
          </div>

          <button
            class="loginSubmit"
            id="changePasswordBtn"
          >
            Save Password
          </button>

          <button
            class="loginLinkBtn"
            id="backToLoginBtn"
          >
            Back to Login
          </button>

        </div>
      </div>
    </section>
  `;

  loginView.style.display =
    "block";

  document
    .getElementById(
      "changePasswordBtn"
    )
    ?.addEventListener(
      "click",
      () =>
        changePassword(email)
    );

  document
    .getElementById(
      "backToLoginBtn"
    )
    ?.addEventListener(
      "click",
      showLogin
    );

}

async function changePassword(email) {

  const currentPassword =
    document
      .getElementById(
        "currentPassword"
      )
      .value.trim();

  const newPassword =
    document
      .getElementById(
        "newPassword"
      )
      .value.trim();

  if (
    !currentPassword ||
    !newPassword
  ) {

    showNotification({
      text:
        "Please fill both fields"
    });

    return;

  }

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            email,
            currentPassword,
            newPassword
          })
        }
      );

    const data =
      await response.json();

    showNotification({
      text:
        data.message ||
        "Password updated"
    });

    if (response.ok) {

      setTimeout(() => {

        showLogin();

      }, 2000);

    }

  } catch (error) {

    showNotification({
      text:
        "Server error"
    });

  }

}

async function requestPasswordReset() {

  const email =
    document.getElementById("resetEmail")
    ?.value.trim();

  if (!email) {

    showNotification({
      text: "Please enter your email"
    });

    return;
  }

  try {

    const response = await fetch(
      `${API_BASE_URL}/auth/forgot-password`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          email: email
        })
      }
    );

    const data =
      await response.json();

    showNotification({
      text:
        data.message ||
        "Reset link sent"
    });

  } catch (error) {

    console.error(error);

    showNotification({
      text:
        "Server error"
    });

  }

}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav-links a[data-view]").forEach((link) => {
    document
  .getElementById("submitFeedbackBtn")
  ?.addEventListener("click", addFeedback);
    document
  .getElementById("openFeedbackForm")
  ?.addEventListener("click", () => {

    const box = document.getElementById("feedbackFormBox");

    if (box) {
      box.style.display = "block";
    }

  });

document
  .getElementById("cancelFeedbackBtn")
  ?.addEventListener("click", () => {

    document.getElementById("feedbackFormBox").style.display = "none";

  });
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.dataset.view;

      if (view === "home") showHome();
      if (view === "dashboard") showDashboard();
      if (view === "about") showAbout();
      if (view === "messages") showMessages();
    });
  });

  initializeLocationFilters();
  attachLocationFilterEvents();
  attachClaimModalEvents();
  handleImagePreview("lost-image", "lost-image-preview");
  handleImagePreview("found-image", "found-image-preview");
  updateNavAuthUI();
  loadFeedback();
  const token = getToken();

if (token && token !== "null" && token !== "undefined") {
  loadProfile();
}

  function getLocalToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const today = getLocalToday();

const lostDateInput = document.getElementById("lost-date");
const foundDateInput = document.getElementById("found-date");

if (lostDateInput) {
  lostDateInput.max = today;
  lostDateInput.value = today;
}

if (foundDateInput) {
  foundDateInput.max = today;
  foundDateInput.value = today;
}

  const actionButtons = document.querySelectorAll(".action-btn");

  function scrollToSectionWithOffset(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const header = document.querySelector(".site-header");
    const headerHeight = header ? header.offsetHeight : 0;
    const extraGap = 20;

    const targetY =
      section.getBoundingClientRect().top +
      window.pageYOffset -
      headerHeight -
      extraGap;

    window.scrollTo({
      top: targetY,
      behavior: "smooth"
    });

    section.classList.add("section-highlight");
    setTimeout(() => {
      section.classList.remove("section-highlight");
    }, 1200);
  }

  if (actionButtons.length >= 2) {
    actionButtons[0].addEventListener("click", () => {
      scrollToSectionWithOffset("report-lost");
    });

    actionButtons[1].addEventListener("click", () => {
      scrollToSectionWithOffset("report-found");
    });
  }

  const heroReportBtn = document.getElementById("hero-report-btn");
  if (heroReportBtn) {
    heroReportBtn.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToSectionWithOffset("report-lost");
    });
  }

  const heroMatchesBtn = document.getElementById("hero-matches-btn");
  if (heroMatchesBtn) {
    heroMatchesBtn.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelector(".home-items")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  document.getElementById("lostForm").addEventListener("submit", async function (e) {
  e.preventDefault(); // VERY IMPORTANT

  await submitLostReport();
});

  document.getElementById("foundForm").addEventListener("submit", async function (e) {
  e.preventDefault(); // VERY IMPORTANT

  await submitFoundReport();
});

  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  showHome();
});

function getToken() {

  const token =
    localStorage.getItem("token");

  if (
    !token ||
    token === "null" ||
    token === "undefined"
  ) {
    return null;
  }

  return token;

}

socket.on("reportCreated", () => {
  console.log("Realtime: report received");

  loadItems();
});

socket.on("feedbackCreated", () => {
  console.log("Realtime: feedback received");

  loadFeedback();
});

function triggerGoogleLogin() {
  if (!window.google) {
    alert("Google not loaded yet");
    return;
  }

  google.accounts.id.prompt();
}

function initializeGoogleAuth() {
  if (!window.google) {
    console.error("Google script not loaded");
    return;
  }

  google.accounts.id.initialize({
    client_id: "906197317156-0kbk5tk843elons9rhdkespken8i7plc.apps.googleusercontent.com",
    callback: handleGoogleCredentialResponse
  });

  console.log("Google initialized");
}

async function handleGoogleCredentialResponse(response) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        credential: response.credential
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Google login failed");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    updateNavAuthUI();
    showHome();

  } catch (error) {
    alert(error.message || "Google login failed");
  }
}

window.addEventListener("load", initializeGoogleAuth);

document.addEventListener("DOMContentLoaded", () => {

  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");

  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showLogin();
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showSignup();
    });
  }

});