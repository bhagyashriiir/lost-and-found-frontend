// Function to load all secure message conversations for the logged-in user
async function loadThreads() {
  try {
    const res = await fetch(
      "http://localhost:3000/api/messages/threads",
      {
        headers: {
          Authorization:
            "Bearer " + localStorage.getItem("token")
        }
      }
    );

    const threads = await res.json();

    console.log("THREAD DATA:", threads);

    // Select container element where message threads will be displayed
    const list =
      document.querySelector(".messages-list");

    if (!list) {
      console.error(
        "messages-list container not found"
      );
      return;
    }

    // Display message if no conversations exist
    if (!Array.isArray(threads) || threads.length === 0) {
      list.innerHTML =
        "<p>No secure conversations yet.</p>";
      return;
    }

    // Generate HTML content for each message thread dynamically
    list.innerHTML = threads
      .map(thread => {
        const name =
          thread.otherUser?.displayName ||
          "Conversation";

        const initial = name.charAt(0);

        const item =
          thread.itemName ||
          "Lost item";

        return `
          <div class="message-item"
               data-id="${thread.id || thread._id}"
            <div class="avatar">
              ${initial}
            </div>

            <div>
              <strong>${name}</strong>
              <p>${item}</p>
            </div>
          </div>
        `;
      })
      .join("");

    // Add click event listener to open selected chat conversation
    document
      .querySelectorAll(".message-item")
      .forEach(item => {
        item.addEventListener(
          "click",
          () => {
            openChat(
              item.dataset.id
            );
          }
        );
      });

  } catch (err) {
    console.error(
      "Load threads error:",
      err
    );
  }
}

// Function to load messages for a selected chat conversation
async function openChat(chatId) {
  try {
    const res = await fetch(
      `http://localhost:3000/api/messages/${chatId}`,
      {
        headers: {
          Authorization:
            "Bearer " +
            localStorage.getItem("token")
        }
      }
    );

    const data = await res.json();

    console.log("CHAT:", data);

  } catch (err) {
    console.error("Chat error:", err);  // Log error if chat loading fails
  }
}