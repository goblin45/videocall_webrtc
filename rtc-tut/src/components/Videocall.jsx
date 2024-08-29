import React, { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client';

const VideoCall = () => {
    const [isCallStarted, setIsCallStarted] = useState(false);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const socketRef = useRef(null);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const roomId = queryParams.get('room');

    useEffect(() => {
        socketRef.current = io.connect('http://localhost:5000');

        socketRef.current.on('new peer', async () => {
            if (!peerConnectionRef.current) return;  // No peer connection yet
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            socketRef.current.emit('signal', { sdp: peerConnectionRef.current.localDescription }, roomId);
        });

        socketRef.current.on('signal', async (data) => {
            console.log('Received signal:', data);
            if (data.sdp) {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
                if (data.sdp.type === 'offer') {
                    const answer = await peerConnectionRef.current.createAnswer();
                    await peerConnectionRef.current.setLocalDescription(answer);
                    socketRef.current.emit('signal', { sdp: peerConnectionRef.current.localDescription }, roomId);
                }
            } else if (data.candidate) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });
        

        return () => {
            socketRef.current.disconnect();
            // peerConnectionRef.current?.close();
        };
    }, [roomId]);

    const startCall = () => {
        getVideoStream();
    };

    const getVideoStream = () => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localVideoRef.current.srcObject = stream;
                joinRoom(stream);  // Pass the stream to joinRoom
                setIsCallStarted(true);
            })
            .catch(error => console.error('Error accessing media devices.', error));
    };

    const joinRoom = (stream = null) => {
        console.log('Joining room', roomId);
        if (!peerConnectionRef.current) {
            const peerConnection = new RTCPeerConnection();
            console.log('peerConnection', peerConnection);
            peerConnectionRef.current = peerConnection;

            if (stream) {
                stream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, stream);
                });
            }

            peerConnection.ontrack = (event) => {
                console.log('ontrack', event.streams[0]);
                remoteVideoRef.current.srcObject = event.streams[0];
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socketRef.current.emit('signal', { candidate: event.candidate }, roomId);
                }
            };
        }

        socketRef.current.emit('join room', roomId);
    };

    useEffect(() => {
        console.log("remoteVideoRef: ")
        console.log(remoteVideoRef.current.srcObject)
    }, [remoteVideoRef.current?.srcObject]);

    const endCall = () => {
        socketRef.current.disconnect();
        peerConnectionRef.current?.close();
        localVideoRef.current.srcObject = null;
        remoteVideoRef.current.srcObject = null;
        setIsCallStarted(false);
    };

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
            <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'white'
            }}>
                WebRTC Video Call
            </h2>
            <div style={{ display: 'flex', gap: '20px' }}>
                <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ width: '300px', height: '250px', border: '1px solid blue' }} 
                />
                <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    style={{ width: '300px', height: '250px', border: '1px solid red' }} 
                />
            </div>
            <button onClick={isCallStarted ? endCall : startCall}>
                {isCallStarted ? 'End Call' : 'Start Call'}
            </button>
            <button onClick={() => joinRoom()}>
                Join Call
            </button>
        </div>
    );
};

export default VideoCall;
