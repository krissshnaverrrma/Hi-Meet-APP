let socket;
let username;
let room = null;
let typingTimeout;
let recognition;
let isCaptionsOn = false;

document.addEventListener("DOMContentLoaded", () => {
	username = document.getElementById("username").value;

	if ("Notification" in window && Notification.permission !== "granted") {
		Notification.requestPermission();
	}

	socket = io.connect();

	const msgInput = document.getElementById("msgInput");
	const imageInput = document.getElementById("imageInput");
	const fileInput = document.getElementById("fileInput");
	const msgSound = document.getElementById("msgSound");

	msgInput.addEventListener("keypress", function (event) {
		if (event.key === "Enter") {
			event.preventDefault();
			sendMessage();
		}
	});

	msgInput.addEventListener("input", () => {
		if (!room) return;
		socket.emit("typing", { room: room, username: username });
		clearTimeout(typingTimeout);
		typingTimeout = setTimeout(() => {
			socket.emit("stop_typing", { room: room });
		}, 1000);
	});

	const searchInput = document.getElementById("contactSearch");
	if (searchInput) {
		searchInput.addEventListener("input", (e) => {
			const term = e.target.value.toLowerCase();
			document.querySelectorAll(".contact").forEach((contact) => {
				const name = contact
					.querySelector(".contact-name")
					.innerText.toLowerCase();
				contact.style.display = name.includes(term) ? "flex" : "none";
			});
		});
	}

	if (imageInput) {
		imageInput.addEventListener("change", function () {
			const file = this.files[0];
			if (file) handleUpload(file, "image", "cameraBtn");
			this.value = "";
		});
	}

	if (fileInput) {
		fileInput.addEventListener("change", function () {
			const file = this.files[0];
			if (file) handleUpload(file, "file", "fileBtn");
			this.value = "";
		});
	}

	const dropOverlay = document.getElementById("drop-overlay");
	window.addEventListener("dragover", (e) => {
		e.preventDefault();
		if (room) dropOverlay.classList.remove("hidden");
	});
	dropOverlay.addEventListener("dragleave", (e) => {
		e.preventDefault();
		dropOverlay.classList.add("hidden");
	});
	window.addEventListener("drop", (e) => {
		e.preventDefault();
		dropOverlay.classList.add("hidden");
		if (!room) return showToast("Select a chat first!", "error");

		const files = e.dataTransfer.files;
		if (files.length > 0) {
			const file = files[0];
			const type = file.type.startsWith("image/") ? "image" : "file";
			handleUpload(file, type, null); // null means no button spinner
		}
	});

	socket.on("chat_message", (data) => {
		if (data.username !== username) {
			try {
				msgSound.play();
			} catch (e) {
				console.log("Audio blocked");
			}
			if (document.hidden && Notification.permission === "granted") {
				let bodyText =
					data.type === "text" ? data.message : `Sent a ${data.type}`;
				new Notification(`Message from ${data.username}`, {
					body: bodyText,
					icon: "/static/uploads/default.png",
				});
			}
		}
		appendMessage(data);
		document.getElementById("typing-indicator").classList.add("hidden");
	});

	socket.on("load_history", (history) => {
		document.getElementById("messages").innerHTML = "";
		history.forEach((msg) => appendMessage(msg));
		scrollToBottom();
	});

	socket.on("message_deleted", (data) => {
		const msgElement = document.getElementById(`msg-${data.id}`);
		if (msgElement) {
			msgElement.style.transition = "opacity 0.3s";
			msgElement.style.opacity = "0";
			setTimeout(() => msgElement.remove(), 300);
		}
	});

	const typingIndicator = document.getElementById("typing-indicator");
	socket.on("display_typing", (data) => {
		typingIndicator.querySelector(
			"span"
		).innerText = `${data.username} is typing...`;
		typingIndicator.classList.remove("hidden");
	});
	socket.on("hide_typing", () => {
		typingIndicator.classList.add("hidden");
	});

	socket.on("update_user_list", (onlineUsers) => {
		document.querySelectorAll(".contact").forEach((el) => {
			el.querySelector(".status-dot").classList.add("hidden");
			el.querySelector(".contact-status").innerText = "Offline";
			el.classList.remove("online");
		});
		onlineUsers.forEach((user) => {
			const el = document.getElementById(`contact-${user}`);
			if (el) {
				el.classList.add("online");
				el.querySelector(".status-dot").classList.remove("hidden");
				el.querySelector(".contact-status").innerText = "Online";
			}
		});
	});

	socket.on("receive_transcript", (data) => {
		const overlay = document.getElementById("subtitle-overlay");
		if (overlay) {
			overlay.innerText = data.text;
			overlay.classList.remove("hidden");
			clearTimeout(window.subtitleTimeout);
			if (data.final)
				window.subtitleTimeout = setTimeout(
					() => overlay.classList.add("hidden"),
					3000
				);
		}
	});

	socket.on("play_tts", (data) => {
		const utterance = new SpeechSynthesisUtterance(data.text);
		utterance.lang = "en-US";
		window.speechSynthesis.speak(utterance);

		appendMessage({
			id: "tts-" + Date.now(),
			username: data.username,
			message: "[🔊 Spoken] " + data.text,
			type: "text",
			timestamp: new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			}),
		});
	});

	initEmojiPicker();
	initSpeechRecognition();
});

function handleUpload(file, type, btnId) {
	const reader = new FileReader();

	let btn, originalIcon;
	if (btnId) {
		btn = document.getElementById(btnId);
		originalIcon = btn.innerHTML;
		btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
		btn.disabled = true;
	} else {
		showToast(`Uploading ${type}...`, "info");
	}

	reader.onload = function (e) {
		if (type === "image") {
			socket.emit("send_image", {
				username,
				room,
				image: e.target.result,
			});
		} else {
			socket.emit("send_file", {
				username,
				room,
				file: e.target.result,
				fileName: file.name,
			});
		}

		if (btn) {
			btn.innerHTML = originalIcon;
			btn.disabled = false;
		}
	};
	reader.readAsDataURL(file);
}

function startPrivateChat(targetUsername, targetName, element) {
	document
		.querySelectorAll(".contact")
		.forEach((c) => c.classList.remove("active"));
	element.classList.add("active");

	document.getElementById("header-room-name").innerText = targetName;
	document.getElementById("chat-actions").classList.remove("hidden");
	document.getElementById("input-area").classList.remove("hidden");

	const headerImg = document.getElementById("header-avatar");
	const clickedImg = element.querySelector(".avatar-img");
	if (clickedImg) {
		headerImg.src = clickedImg.src;
	} else {
		headerImg.src = "/static/uploads/default.png";
	}
	headerImg.classList.remove("hidden");

	const users = [username, targetUsername].sort();
	room = users.join("_");

	socket.emit("join", { username: username, room: room });

	if (window.innerWidth <= 768) {
		document.querySelector(".sidebar").classList.add("mobile-hidden");
		document.querySelector(".chat-area").classList.add("mobile-visible");
	}
}

function showSidebar() {
	document.querySelector(".sidebar").classList.remove("mobile-hidden");
	document.querySelector(".chat-area").classList.remove("mobile-visible");
}

function sendMessage() {
	const input = document.getElementById("msgInput");
	const msg = input.value.trim();
	if (!room) return showToast("Select a contact first!", "error");
	if (msg) {
		socket.emit("send_message", {
			username: username,
			room: room,
			message: msg,
		});
		socket.emit("stop_typing", { room: room });
		input.value = "";
		input.focus();
	}
}

function deleteMessage(msgId) {
	if (confirm("Delete this message for everyone?")) {
		socket.emit("delete_message", {
			id: msgId,
			username: username,
			room: room,
		});
	}
}

function linkify(text) {
	var urlRegex = /(https?:\/\/[^\s]+)/g;
	return text.replace(urlRegex, function (url) {
		return (
			'<a href="' +
			url +
			'" target="_blank" style="color: #00d2ff; text-decoration: underline;">' +
			url +
			"</a>"
		);
	});
}

function appendMessage(data) {
	const msgDiv = document.getElementById("messages");
	const div = document.createElement("div");
	const isMe = data.username === username;

	div.classList.add("message");
	div.classList.add(isMe ? "sent" : "received");
	div.id = `msg-${data.id}`;

	let contentHtml = "";

	if (data.type === "image") {
		contentHtml = `<img src="/static/uploads/${data.message}" class="chat-image" onclick="openLightbox(this.src)" alt="Image">`;
	} else if (data.type === "file") {
		let dispName = data.originalName || data.message;
		contentHtml = `
            <a href="/static/uploads/${data.message}" class="file-attachment" download target="_blank">
                <div class="file-icon"><i class="fas fa-file-alt"></i></div>
                <div class="file-info"><span class="file-name">${dispName}</span><span class="file-download">Click to Download</span></div>
            </a>`;
	} else {
		contentHtml = `<span>${linkify(data.message)}</span>`;
	}

	let deleteBtnHtml = "";
	let ticksHtml = "";
	if (isMe) {
		deleteBtnHtml = `<span class="delete-btn" onclick="deleteMessage(${data.id})"><i class="fas fa-trash"></i></span>`;
		ticksHtml = `<span class="msg-ticks"><i class="fas fa-check-double"></i></span>`;
	}

	div.innerHTML = `${contentHtml}<span class="msg-info"><span class="msg-time">${data.timestamp}</span>${ticksHtml}${deleteBtnHtml}</span>`;
	msgDiv.appendChild(div);
	scrollToBottom();
}

function scrollToBottom() {
	const d = document.getElementById("messages");
	d.scrollTop = d.scrollHeight;
}

function showToast(message, type = "info") {
	const container = document.getElementById("toast-container");
	const toast = document.createElement("div");
	let icon =
		type === "success"
			? '<i class="fas fa-check-circle"></i>'
			: type === "error"
			? '<i class="fas fa-exclamation-circle"></i>'
			: '<i class="fas fa-info-circle"></i>';
	toast.className = `glass-toast ${type}`;
	toast.innerHTML = `${icon} <span>${message}</span>`;
	container.appendChild(toast);
	setTimeout(() => {
		toast.style.animation = "slideOut 0.3s forwards";
		setTimeout(() => toast.remove(), 300);
	}, 3000);
}

function openLightbox(src) {
	document.getElementById("lightbox-img").src = src;
	document.getElementById("lightbox").classList.add("active");
}

function startVideoCall() {
	if (room) openModal(true);
	else showToast("Select contact!", "error");
}
function startVoiceCall() {
	if (room) openModal(false);
	else showToast("Select contact!", "error");
}

function openModal(isVideo) {
	const modal = document.getElementById("video-modal");
	const headerTitle = document.querySelector(".video-header span");
	modal.classList.remove("hidden");

	if (isVideo) {
		headerTitle.innerText = "Video Call";
		modal.classList.remove("voice-mode");
	} else {
		headerTitle.innerText = "Voice Call";
		modal.classList.add("voice-mode");
	}

	if (typeof startLocalMedia === "function") {
		startLocalMedia(isVideo);
	}
}

function closeModal() {
	document.getElementById("video-modal").classList.add("hidden");
	if (typeof localStream !== "undefined")
		localStream.getTracks().forEach((t) => t.stop());
	if (recognition && isCaptionsOn) {
		recognition.stop();
		isCaptionsOn = false;
		const capBtn = document.getElementById("captionBtn");
		if (capBtn) capBtn.classList.remove("btn-active");
	}
}

function initSpeechRecognition() {
	if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
		const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
		recognition = new SR();
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = "en-US";
		recognition.onresult = (e) => {
			let t = "";
			for (let i = e.resultIndex; i < e.results.length; ++i)
				t += e.results[i][0].transcript;
			if (t && room)
				socket.emit("send_transcript", {
					room,
					username,
					text: t,
					final: false,
				});
		};
	} else {
		const btn = document.getElementById("captionBtn");
		if (btn) btn.style.display = "none";
	}
}

function toggleCaptions() {
	const btn = document.getElementById("captionBtn");
	if (!isCaptionsOn) {
		recognition.start();
		isCaptionsOn = true;
		btn.classList.add("btn-active");
		showToast("Captions On", "success");
	} else {
		recognition.stop();
		isCaptionsOn = false;
		btn.classList.remove("btn-active");
		showToast("Captions Off");
	}
}

function sendTTSMessage() {
	const input = document.getElementById("msgInput");
	const msg = input.value.trim();
	if (!room) return showToast("Select a contact!", "error");
	if (!msg) return showToast("Type text to speak!", "error");

	socket.emit("send_tts", { username: username, room: room, text: msg });
	input.value = "";
}

async function initEmojiPicker() {
	const btn = document.getElementById("emojiBtn");
	const box = document.getElementById("emoji-popover");
	const input = document.getElementById("msgInput");
	if (!window.EmojiMart) return;
	let ops = {
		theme: "dark",
		showPreview: false,
		onEmojiSelect: (e) => {
			input.value += e.native;
			input.focus();
		},
	};
	try {
		const r = await fetch(
			"https://unpkg.com/@emoji-mart/data@latest/sets/apple.json"
		);
		if (r.ok) {
			ops.data = await r.json();
			ops.set = "apple";
		}
	} catch (e) {
		ops.set = "native";
	}
	const p = new EmojiMart.Picker(ops);
	document.getElementById("emoji-picker-container").appendChild(p);
	btn.addEventListener("click", (e) => {
		e.stopPropagation();
		box.classList.toggle("hidden");
	});
	document.addEventListener("click", (e) => {
		if (!box.contains(e.target) && !btn.contains(e.target))
			box.classList.add("hidden");
	});
}
