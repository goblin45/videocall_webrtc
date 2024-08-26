import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const VideoCall = () => {
    const [isCallStarted, setIsCallStarted] = useState(false);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const socketRef = useRef(null);
    const roomId = 'testRoom'; // You can make this dynamic

    useEffect(() => {
        // Connect to the signaling server
        socketRef.current = io.connect('http://localhost:5000');

        // Get local media stream
        getVideoStream()

        // Start the call
        startCall()

        // return () => {
        //     socketRef.current.disconnect();
        //     peerConnectionRef.current.close();
        // };
    }, []);

    const endCall = () => {
        socketRef.current.disconnect();
        peerConnectionRef.current.close();
        setIsCallStarted(false);
    }

    const startCall = () => {
        const peerConnection = new RTCPeerConnection();
        peerConnectionRef.current = peerConnection;
        setIsCallStarted(true);
    }

    const getVideoStream = () => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localVideoRef.current.srcObject = stream;

                // Initialize PeerConnection
                const peerConnection = new RTCPeerConnection();
                peerConnectionRef.current = peerConnection;

                // Add local stream to PeerConnection
                stream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, stream);
                });

                // Handle remote stream
                peerConnection.ontrack = (event) => {
                    remoteVideoRef.current.srcObject = event.streams[0];
                };

                // Handle ICE candidates
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        socketRef.current.emit('signal', { candidate: event.candidate }, roomId);
                    }
                };

                // Join room
                socketRef.current.emit('join room', roomId);

                socketRef.current.on('new peer', async () => {
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    socketRef.current.emit('signal', { sdp: peerConnection.localDescription }, roomId);
                });

                socketRef.current.on('signal', async (data) => {
                    if (data.sdp) {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                        if (data.sdp.type === 'offer') {
                            const answer = await peerConnection.createAnswer();
                            await peerConnection.setLocalDescription(answer);
                            socketRef.current.emit('signal', { sdp: peerConnection.localDescription }, roomId);
                        }
                    } else if (data.candidate) {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                });

                setIsCallStarted(true);
            })
            .catch(error => console.error('Error accessing media devices.', error));
    }

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
        }}>
            <h2
                style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'white'
                }}
            >
                WebRTC Video Call
            </h2>
            <div style={{ display: 'flex', gap: '20px' }}>
                <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ width: '300px' }} 
                />
                <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    style={{ width: '300px', border: '1px solid red' }} 
                />
            </div>
            <button
                onClick={isCallStarted ? endCall : startCall}
            >
                {isCallStarted ? 'End Call' : 'Start Call'}
            </button>
        </div>
    );
};

export default VideoCall;
