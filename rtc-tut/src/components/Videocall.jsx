import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client';

import peer from '../service/peer';

import videoOnIcon from '../assets/icons/video-on.webp';
import videoOffIcon from '../assets/icons/video-off.webp';


const VideoCall = () => {
    // const serverUrl = 'http://localhost:5000'
    const serverUrl = 'https://videocall-dummy-backend.onrender.com'
    const socket = io(serverUrl);
    const roomId = new URLSearchParams(useLocation().search).get('room');
    const [remoteSocketId, setRemoteSocketId] = useState(null);

    const [myStream, setMyStream] = useState()
    const [remoteStream, setRemoteStream] = useState()

    const [cameraState, setCameraState] = useState('off')

    const handleUserJoined = useCallback(({ id, message }) => {
        console.log(message);
        setRemoteSocketId(id);
    }, []);

    useEffect(() => {
        console.log("roomId: ", roomId)
        socket.emit("room:join", {room: roomId});
    }, [roomId]);

    const handleCallUser = useCallback(async () => {
        // const stream = await navigator.mediaDevices.getUserMedia({
        //   audio: true,
        //   video: true,
        // });
        const offer = await peer.getOffer();
        socket.emit("user:call", { to: remoteSocketId, offer });
        // setMyStream(stream);
    }, [remoteSocketId, socket]);

    const turnOnCamera = useCallback(async() => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });
        setMyStream(stream);
    }, []);

    const turnOffCamera = () => {
        setMyStream(null)
    }

    const toggleCameraState = () => {
        if (cameraState === 'on') {
            turnOffCamera()
            setCameraState('off')
        } else {
            turnOnCamera()
            setCameraState('on')
        }
    }

    const handleIncomingCall = useCallback(async ({ from, offer }) => {
        setRemoteSocketId(from);
        await turnOnCamera()
        console.log(`Incoming Call`, from, offer);
        const ans = await peer.getAnswer(offer);
        socket.emit("call:accepted", { to: from, ans });
    }, [socket]);

    useEffect(() => {
        if (myStream) {
            console.log(myStream)
        }
    }, [myStream])

    const sendStreams = useCallback(() => {
        for (const track of myStream?.getTracks()) {
            peer.peer.addTrack(track, myStream);
        }
    }, [myStream]);

    const handleCallAccepted = useCallback(({ from, ans }) => {
        peer.setLocalDescription(ans);
        console.log("Call Accepted!");
        sendStreams();
    }, [sendStreams]);

    const handleNegoNeeded = useCallback(async () => {
        const offer = await peer.getOffer();
        // socket.emit("peer:nego:needed", { to: remoteSocketId, offer });
        socket.emit("peer:nego:needed", { room: roomId, offer });
    }, [remoteSocketId, socket]);

    useEffect(() => {
        peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
        return () => {
            peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
        };
    }, [handleNegoNeeded]);

    const handleNegoNeedIncoming = useCallback(async ({ from, offer }) => {
        console.log('got peer nego needed from ', from)
        const ans = await peer.getAnswer(offer);
        console.log('peer nego done')
        socket.emit("peer:nego:done", { to: from, ans });
    }, [socket]);

    const handleNegoNeedFinal = useCallback(async ({ ans }) => {
        await peer.setLocalDescription(ans);
    }, []);

    useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
        const remoteStream = ev.streams;
        console.log("GOT TRACKS!!");
        setRemoteStream(remoteStream[0]);
    });
    }, []);

    useEffect(() => {
        socket.on("user:joined", handleUserJoined);
        socket.on("incoming:call", handleIncomingCall);
        socket.on("call:accepted", handleCallAccepted);
        socket.on("peer:nego:needed", handleNegoNeedIncoming);
        socket.on("peer:nego:final", handleNegoNeedFinal);

        return () => {
            socket.off("user:joined", handleUserJoined);
            socket.off("incoming:call", handleIncomingCall);
            socket.off("call:accepted", handleCallAccepted);
            socket.off("peer:nego:needed", handleNegoNeedIncoming);
            socket.off("peer:nego:final", handleNegoNeedFinal);
        };
    }, [
        socket,
        handleUserJoined,
        handleIncomingCall,
        handleCallAccepted,
        handleNegoNeedIncoming,
        handleNegoNeedFinal,
    ]);

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
                    ref={(videoElement) => {
                        if (videoElement) {
                          videoElement.srcObject = myStream;
                        }
                      }}
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ width: '300px', height: '250px', border: '1px solid blue' }} 
                />
                <video 
                    ref={(videoElement) => {
                        if (videoElement) {
                          videoElement.srcObject = remoteStream;
                        }
                      }}
                    autoPlay 
                    playsInline 
                    style={{ width: '300px', height: '250px', border: '1px solid red' }} 
                />
            </div>
            <div
                style={{
                    display: 'flex',
                    gap: '20px',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <button
                    style={{
                        backgroundColor: 'blue',
                        color: 'white',
                        fontSize: '18px',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                    onClick={handleCallUser}
                >
                    Call
                </button>
                <button
                    style={{
                        backgroundColor: 'green',
                        color: 'white',
                        fontSize: '18px',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                    onClick={() => sendStreams()}
                >
                    Send Stream
                </button>
                <button
                    style={{
                        backgroundColor: 'red',
                        color: 'white',
                        fontSize: '18px',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                    onClick={() => toggleCameraState()} 
                >
                    {
                        cameraState === 'on' ? 
                            <img 
                                src={videoOnIcon}
                            />
                        :
                            <img
                                src={videoOffIcon}
                            />
                    }
                </button>
            </div>
        </div>
    );
};

export default VideoCall;


// const [isCallStarted, setIsCallStarted] = useState(false);
    // const localVideoRef = useRef(null);
    // const remoteVideoRef = useRef(null);
    // const peerConnectionRef = useRef(null);
    // const socketRef = useRef(null);

    // const location = useLocation();
    // const queryParams = new URLSearchParams(location.search);
    // const roomId = queryParams.get('room');

    // // const serverUrl = 'https://videocall-webrtc-nsi7.onrender.com';
    // const serverUrl = 'http://localhost:5000'

    // useEffect(() => {
    //     socketRef.current = io.connect(serverUrl);

    //     socketRef.current.on('new peer', async (data) => {
    //         console.log('New user ' + data + ' joined')
    //         if (!peerConnectionRef.current) return;  // No peer connection yet
    //         const offer = await peerConnectionRef.current.createOffer();
    //         await peerConnectionRef.current.setLocalDescription(offer);
    //         socketRef.current.emit('signal', { sdp: peerConnectionRef.current.localDescription }, roomId);
    //     });

    //     socketRef.current.on('signal', async (data) => {
    //         console.log('Received signal:', data);
    //         if (data.sdp) {
    //             await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
    //             if (data.sdp.type === 'offer') {
    //                 const answer = await peerConnectionRef.current.createAnswer();
    //                 await peerConnectionRef.current.setLocalDescription(answer);
    //                 socketRef.current.emit('signal', { sdp: peerConnectionRef.current.localDescription }, roomId);
    //             }
    //         } else if (data.candidate) {
    //             await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    //         }
    //     });
        

    //     return () => {
    //         socketRef.current.disconnect();
    //         // peerConnectionRef.current?.close();
    //     };
    // }, [roomId]);

    // const startCall = () => {
    //     getVideoStream();
    // };

    // const getVideoStream = () => {
    //     navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    //         .then(stream => {
    //             localVideoRef.current.srcObject = stream;
    //             joinRoom(stream);  // Pass the stream to joinRoom
    //             setIsCallStarted(true);
    //         })
    //         .catch(error => console.error('Error accessing media devices.', error));
    // };

    // const joinRoom = (stream = null) => {
    //     console.log('Joining room', roomId);
    //     if (!peerConnectionRef.current) {
    //         const peerConnection = new RTCPeerConnection();
    //         console.log('peerConnection', peerConnection);
    //         peerConnectionRef.current = peerConnection;

    //         if (stream) {
    //             stream.getTracks().forEach(track => {
    //                 peerConnection.addTrack(track, stream);
    //             });
    //         }

    //         peerConnection.ontrack = (event) => {
    //             console.log('ontrack', event.streams[0]);
    //             remoteVideoRef.current.srcObject = event.streams[0];
    //         };

    //         peerConnection.onicecandidate = (event) => {
    //             if (event.candidate) {
    //                 socketRef.current.emit('signal', { candidate: event.candidate }, roomId);
    //             }
    //         };
    //     }

    //     socketRef.current.emit('join room', roomId);
    // };

    // useEffect(() => {
    //     console.log("remoteVideoRef: ")
    //     console.log(remoteVideoRef.current.srcObject)
    // }, [remoteVideoRef.current?.srcObject]);

    // const endCall = () => {
    //     socketRef.current.disconnect();
    //     peerConnectionRef.current?.close();
    //     localVideoRef.current.srcObject = null;
    //     remoteVideoRef.current.srcObject = null;
    //     setIsCallStarted(false);
    // };