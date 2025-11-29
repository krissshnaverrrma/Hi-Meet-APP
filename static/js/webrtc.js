let localStream;
let peerConnection;
const config = {
	iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

async function startLocalMedia(isVideo) {
	try {
		if (localStream) {
			localStream.getTracks().forEach((track) => track.stop());
		}

		const constraints = {
			audio: true,
			video: isVideo,
		};

		localStream = await navigator.mediaDevices.getUserMedia(constraints);

		const localVideo = document.getElementById("localVideo");
		localVideo.srcObject = localStream;
		localVideo.muted = true;

		socket.off("signal");
		socket.on("signal", async (data) => {
			if (data.type === "offer") await handleOffer(data);
			if (data.type === "answer") await handleAnswer(data);
			if (data.type === "candidate") await handleCandidate(data);
		});
	} catch (err) {
		console.error("Media Error:", err);
		showToast("Could not access mic/cam. Check permissions.", "error");
	}
}

async function startCall() {
	document.getElementById("startBtn").disabled = true;
	createPeerConnection();

	localStream
		.getTracks()
		.forEach((track) => peerConnection.addTrack(track, localStream));

	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);

	socket.emit("signal", { type: "offer", sdp: offer, room: room });
}

function createPeerConnection() {
	if (peerConnection) return;

	peerConnection = new RTCPeerConnection(config);

	peerConnection.onicecandidate = (event) => {
		if (event.candidate) {
			socket.emit("signal", {
				type: "candidate",
				candidate: event.candidate,
				room: room,
			});
		}
	};

	peerConnection.ontrack = (event) => {
		document.getElementById("remoteVideo").srcObject = event.streams[0];
	};
}

async function handleOffer(data) {
	createPeerConnection();
	localStream
		.getTracks()
		.forEach((track) => peerConnection.addTrack(track, localStream));

	await peerConnection.setRemoteDescription(
		new RTCSessionDescription(data.sdp)
	);
	const answer = await peerConnection.createAnswer();
	await peerConnection.setLocalDescription(answer);

	socket.emit("signal", { type: "answer", sdp: answer, room: room });
}

async function handleAnswer(data) {
	await peerConnection.setRemoteDescription(
		new RTCSessionDescription(data.sdp)
	);
}

async function handleCandidate(data) {
	if (peerConnection && data.candidate) {
		try {
			await peerConnection.addIceCandidate(
				new RTCIceCandidate(data.candidate)
			);
		} catch (e) {
			console.error("Error adding received ICE candidate:", e);
		}
	}
}

function toggleMute() {
	if (localStream) {
		const audioTrack = localStream.getAudioTracks()[0];
		audioTrack.enabled = !audioTrack.enabled;
	}
}
let localStream;
let peerConnection;
const config = {
	iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

async function startLocalMedia(isVideo) {
	try {
		if (localStream) {
			localStream.getTracks().forEach((track) => track.stop());
		}

		const constraints = {
			audio: true,
			video: isVideo,
		};

		localStream = await navigator.mediaDevices.getUserMedia(constraints);

		const localVideo = document.getElementById("localVideo");
		localVideo.srcObject = localStream;
		localVideo.muted = true;

		socket.off("signal");
		socket.on("signal", async (data) => {
			if (data.type === "offer") await handleOffer(data);
			if (data.type === "answer") await handleAnswer(data);
			if (data.type === "candidate") await handleCandidate(data);
		});
	} catch (err) {
		console.error("Media Error:", err);
		showToast("Could not access mic/cam. Check permissions.", "error");
	}
}

async function startCall() {
	document.getElementById("startBtn").disabled = true;
	createPeerConnection();

	localStream
		.getTracks()
		.forEach((track) => peerConnection.addTrack(track, localStream));

	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);

	socket.emit("signal", { type: "offer", sdp: offer, room: room });
}

function createPeerConnection() {
	if (peerConnection) return;

	peerConnection = new RTCPeerConnection(config);

	peerConnection.onicecandidate = (event) => {
		if (event.candidate) {
			socket.emit("signal", {
				type: "candidate",
				candidate: event.candidate,
				room: room,
			});
		}
	};

	peerConnection.ontrack = (event) => {
		document.getElementById("remoteVideo").srcObject = event.streams[0];
	};
}

async function handleOffer(data) {
	createPeerConnection();
	localStream
		.getTracks()
		.forEach((track) => peerConnection.addTrack(track, localStream));

	await peerConnection.setRemoteDescription(
		new RTCSessionDescription(data.sdp)
	);
	const answer = await peerConnection.createAnswer();
	await peerConnection.setLocalDescription(answer);

	socket.emit("signal", { type: "answer", sdp: answer, room: room });
}

async function handleAnswer(data) {
	await peerConnection.setRemoteDescription(
		new RTCSessionDescription(data.sdp)
	);
}

async function handleCandidate(data) {
	if (peerConnection && data.candidate) {
		try {
			await peerConnection.addIceCandidate(
				new RTCIceCandidate(data.candidate)
			);
		} catch (e) {
			console.error("Error adding received ICE candidate:", e);
		}
	}
}

function toggleMute() {
	if (localStream) {
		const audioTrack = localStream.getAudioTracks()[0];
		audioTrack.enabled = !audioTrack.enabled;
	}
}
