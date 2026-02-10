import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, disabled }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await processAudio(audioBlob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            toast.success('Nagrywanie rozpoczęte');
        } catch (error) {
            console.error('Error starting recording:', error);
            toast.error('Nie można rozpocząć nagrywania. Sprawdź uprawnienia mikrofonu.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);
        try {
            // For now, we'll use browser's built-in speech recognition
            // In production, you'd send this to a speech-to-text API

            // Fallback: Show user they can type instead
            toast('Transkrypcja głosu wymaga dodatkowej konfiguracji. Użyj klawiatury.', {
                icon: '🎤',
                duration: 3000
            });

            // TODO: Integrate with Whisper API or similar
            // const formData = new FormData();
            // formData.append('audio', audioBlob);
            // const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
            // const { text } = await response.json();
            // onTranscript(text);

        } catch (error) {
            console.error('Error processing audio:', error);
            toast.error('Błąd przetwarzania nagrania');
        } finally {
            setIsProcessing(false);
        }
    };

    // Alternative: Use Web Speech API (works in Chrome/Edge)
    const useWebSpeechAPI = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            toast.error('Przeglądarka nie obsługuje rozpoznawania mowy');
            return;
        }

        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'pl-PL';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsRecording(true);
            toast.success('Mów teraz...');
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            onTranscript(transcript);
            toast.success('Tekst rozpoznany!');
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            toast.error('Błąd rozpoznawania mowy');
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.start();
    };

    return (
        <button
            onClick={useWebSpeechAPI}
            disabled={disabled || isProcessing}
            className={`p-2 rounded-lg transition-all ${isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isRecording ? 'Nagrywanie...' : 'Dyktuj prompt (Ctrl+Shift+V)'}
        >
            {isProcessing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            )}
        </button>
    );
};
