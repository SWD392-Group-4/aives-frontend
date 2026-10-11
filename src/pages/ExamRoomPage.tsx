import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import Icon from '../components/Icon'
import LanguageSwitch from '../components/LanguageSwitch'
import Logo from '../components/Logo'
import { useLanguage } from '../hooks/useLanguage'
import { ApiError } from '../services/apiClient'
import { finishExamAttempt, getExamAttempt } from '../services/examSessionService'
import {
  InterviewState,
  skipInterviewQuestion,
  startInterview,
  submitInterviewAnswer,
} from '../services/vivaService'
import { VivaAttempt } from '../types'
import { formatDateTime } from '../utils/dateTime'

// Trạng thái FSM của phòng thi (theo tài liệu br-ai-interview.md)
type RoomPhase =
  | 'MIC_CHECK' // Kiểm tra mic/âm thanh trước khi bắt đầu
  | 'TTS_PLAY' // AI đọc câu hỏi
  | 'STUDENT_PREPARE' // Thời gian suy nghĩ chuẩn bị
  | 'STUDENT_SPEAKING' // Đang thu âm câu trả lời
  | 'EVAL_AND_DECIDE' // AI đánh giá & quyết định (Follow-up hay chuyển câu)
  | 'ERROR' // Gọi backend lỗi, chờ sinh viên bấm thử lại
  | 'COMPLETED' // Hoàn thành toàn bộ câu hỏi

// Im lặng bao lâu thì nhắc / tự nộp câu trả lời (BR-VIVA-003)
const SILENCE_HINT_SECONDS = 5
const SILENCE_SUBMIT_SECONDS = 10
// Mức âm lượng (0-100) từ đó trở lên được coi là đang nói
const SOUND_LEVEL_THRESHOLD = 5
// Câu hỏi xoáy chỉ cho suy nghĩ ngắn
const FOLLOW_UP_PREPARE_SECONDS = 10
// Khớp với giới hạn của backend (SubmitAnswerRequest.transcript)
const MAX_TRANSCRIPT_LENGTH = 8000
// Trình duyệt tự ngắt nhận giọng nói sau một lúc im lặng: bật lại tối đa bấy nhiêu lần cho mỗi câu trả lời
const MAX_RECOGNITION_RESTARTS = 30
// AI đang xử lý thì hỏi lại backend sau bấy nhiêu ms
const PROCESSING_POLL_MS = 2500

function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

export default function ExamRoomPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const { locale } = useLanguage()

  // Thông tin attempt
  const [attempt, setAttempt] = useState<VivaAttempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [confirmingFinish, setConfirmingFinish] = useState(false)

  // FSM phòng thi. Câu hỏi hiện tại luôn lấy từ backend (server là nguồn sự thật).
  const [phase, setPhase] = useState<RoomPhase>('MIC_CHECK')
  const [question, setQuestion] = useState<InterviewState | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [roomError, setRoomError] = useState('')

  // Bộ đếm thời gian
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0)
  const [phaseDeadline, setPhaseDeadline] = useState<number | null>(null) // mốc Date.now() kết thúc giai đoạn
  const [examSecondsLeft, setExamSecondsLeft] = useState<number | null>(null)
  const [silenceSeconds, setSilenceSeconds] = useState(0)

  // Câu trả lời: tự ghi từ giọng nói, sinh viên sửa được bằng bàn phím
  const [answerDraft, setAnswerDraft] = useState('')
  const [listening, setListening] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  // Tham chiếu Web Speech & Media
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const microphoneRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Giá trị mới nhất cho các callback của timer / Web Speech (tránh đọc phải state cũ)
  const phaseRef = useRef<RoomPhase>('MIC_CHECK')
  const questionRef = useRef<InterviewState | null>(null)
  const draftRef = useRef('')
  const listeningWantedRef = useRef(false)
  const ignoreResultsRef = useRef(false) // true sau khi sinh viên gõ phím: bỏ qua lời nói đến trễ
  const restartCountRef = useRef(0)
  const lastSoundAtRef = useRef(Date.now())
  const lastLevelRef = useRef(0)
  const speakTimerRef = useRef<number | undefined>(undefined)
  const pollTimerRef = useRef<number | undefined>(undefined)
  const submitTimerRef = useRef<number | undefined>(undefined)
  const examEndsAtRef = useRef<number | null>(null) // theo performance.now(), không phụ thuộc đồng hồ máy
  const retryRef = useRef<(() => void) | null>(null)
  const unmountedRef = useRef(false)

  const speechSupported = getSpeechRecognition() !== null

  const changePhase = (next: RoomPhase) => {
    phaseRef.current = next
    setPhase(next)
  }

  const updateDraft = (text: string) => {
    const limited = text.slice(0, MAX_TRANSCRIPT_LENGTH)
    draftRef.current = limited
    setAnswerDraft(limited)
  }

  const beginTimedPhase = (next: RoomPhase, seconds: number) => {
    changePhase(next)
    setPhaseSecondsLeft(seconds)
    setPhaseDeadline(Date.now() + seconds * 1000)
  }

  const cancelSpeech = () => {
    window.clearTimeout(speakTimerRef.current)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  /* ---------- Nhận giọng nói (Web Speech API của trình duyệt) ---------- */

  const stopRecognition = () => {
    listeningWantedRef.current = false
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setListening(false)
  }

  // baseText: phần đã có sẵn trong ô trả lời, lời nói mới được nối vào sau
  const startRecognition = (baseText: string) => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return
    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'vi-VN'
      const base = baseText.trim() ? `${baseText.trim()} ` : ''

      recognition.onresult = (event: any) => {
        if (recognitionRef.current !== recognition || ignoreResultsRef.current) return
        let full = ''
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i][0].transcript + ' '
        }
        updateDraft((base + full).trim())
      }
      recognition.onerror = (event: any) => {
        // Bị chặn quyền micro, không có thiết bị hoặc không kết nối được dịch vụ nhận giọng nói:
        // không bật lại nữa, sinh viên nhập bằng bàn phím
        if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(event?.error)) {
          listeningWantedRef.current = false
        }
      }
      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return
        // Trình duyệt tự ngắt sau một lúc im lặng: bật lại và nối tiếp vào phần đã ghi
        if (
          listeningWantedRef.current &&
          phaseRef.current === 'STUDENT_SPEAKING' &&
          restartCountRef.current < MAX_RECOGNITION_RESTARTS
        ) {
          restartCountRef.current += 1
          window.setTimeout(() => {
            if (listeningWantedRef.current && phaseRef.current === 'STUDENT_SPEAKING') {
              startRecognition(draftRef.current)
            } else {
              setListening(false)
            }
          }, 300)
        } else {
          setListening(false)
        }
      }

      recognitionRef.current = recognition
      listeningWantedRef.current = true
      ignoreResultsRef.current = false
      recognition.start()
      setListening(true)
    } catch (err) {
      console.warn('SpeechRecognition start error', err)
      listeningWantedRef.current = false
      setListening(false)
    }
  }

  /* ---------- Đồng bộ với backend ---------- */

  const refreshAttempt = () => {
    if (!attemptId) return
    getExamAttempt(attemptId)
      .then((data) => {
        if (!unmountedRef.current) setAttempt(data)
      })
      .catch(() => {})
  }

  // AI đọc câu hỏi rồi chuyển sang thời gian chuẩn bị
  const speakQuestion = (state: InterviewState) => {
    changePhase('TTS_PLAY')
    setPhaseDeadline(null)
    const basePrepare = state.prepareSeconds ?? 30
    const prepareSeconds = state.type === 'FOLLOW_UP' ? Math.min(basePrepare, FOLLOW_UP_PREPARE_SECONDS) : basePrepare
    const text = state.questionText ?? ''

    let done = false
    const goPrepare = () => {
      if (done) return
      done = true
      window.clearTimeout(speakTimerRef.current)
      // Trong lúc đọc đề sinh viên có thể đã bỏ qua câu này hoặc nộp bài
      if (phaseRef.current !== 'TTS_PLAY' || questionRef.current?.exchangeId !== state.exchangeId) return
      beginTimedPhase('STUDENT_PREPARE', prepareSeconds)
    }

    window.clearTimeout(speakTimerRef.current)
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = 'vi-VN'
      utter.rate = 1.0
      utter.onend = goPrepare
      utter.onerror = goPrepare
      window.speechSynthesis.speak(utter)
      // Có trình duyệt không báo đọc xong: tự chuyển sau thời gian đọc ước lượng
      speakTimerRef.current = window.setTimeout(goPrepare, Math.max(6000, text.length * 110) + 4000)
    } else {
      speakTimerRef.current = window.setTimeout(goPrepare, 2500)
    }
  }

  const applyState = (state: InterviewState) => {
    if (unmountedRef.current) return
    window.clearTimeout(pollTimerRef.current)
    retryRef.current = null
    setRoomError('')

    if (state.status === 'COMPLETED') {
      cancelSpeech()
      stopRecognition()
      setPhaseDeadline(null)
      changePhase('COMPLETED')
      refreshAttempt()
      return
    }
    if (state.status === 'PROCESSING') {
      // AI chưa quyết định xong (vd vừa tải lại trang ngay sau khi nộp câu trả lời)
      setPhaseDeadline(null)
      changePhase('EVAL_AND_DECIDE')
      pollTimerRef.current = window.setTimeout(syncInterview, PROCESSING_POLL_MS)
      return
    }

    if (!state.aiEnabled) {
      console.warn('[AIVES] Backend chưa bật AI (thiếu GEMINI_API_KEY): sẽ không có câu hỏi xoáy')
    } else if (state.aiFallback) {
      console.warn('[AIVES] AI không trả được quyết định ở câu trước nên hệ thống tự chuyển câu tiếp theo')
    }
    questionRef.current = state
    setQuestion(state)
    updateDraft('')
    setSilenceSeconds(0)
    speakQuestion(state)
  }

  const handleRoomError = (err: unknown) => {
    if (unmountedRef.current) return
    if (err instanceof ApiError) {
      if (err.code === 'EXAM_ATTEMPT_NOT_RUNNING') {
        // Hết giờ hoặc lượt thi đã kết thúc
        applyState({ status: 'COMPLETED', aiEnabled: true, aiFallback: false })
        return
      }
      if (err.code === 'INTERVIEW_EXCHANGE_NOT_CURRENT') {
        // Câu này đã được xử lý ở nơi khác (bấm 2 lần, mở 2 tab): lấy lại câu hiện tại từ backend
        syncInterview()
        return
      }
    }
    setPhaseDeadline(null)
    setRoomError(err instanceof Error && err.message ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.')
    changePhase('ERROR')
  }

  // Lấy câu hỏi hiện tại từ backend
  function syncInterview() {
    if (!attemptId) return
    startInterview(attemptId).then(applyState).catch(handleRoomError)
  }

  /* ---------- Hành động của sinh viên ---------- */

  // Bắt đầu trả lời
  const startSpeakingPhase = () => {
    if (phaseRef.current !== 'STUDENT_PREPARE') return
    cancelSpeech()
    restartCountRef.current = 0
    lastSoundAtRef.current = Date.now()
    setSilenceSeconds(0)
    updateDraft('')
    beginTimedPhase('STUDENT_SPEAKING', questionRef.current?.answerSeconds ?? 120)
    if (micReady) {
      startRecognition('')
    }
  }

  const sendAnswer = (exchangeId: string, transcript: string) => {
    if (!attemptId) return
    changePhase('EVAL_AND_DECIDE')
    submitInterviewAnswer(attemptId, exchangeId, transcript)
      .then(applyState)
      .catch((err) => {
        // Lỗi mạng: bấm "Thử lại" sẽ gửi lại đúng câu trả lời này, không bắt sinh viên trả lời lại
        retryRef.current = () => sendAnswer(exchangeId, transcript)
        handleRoomError(err)
      })
  }

  // Nộp câu trả lời & AI đánh giá
  const submitAnswer = () => {
    if (phaseRef.current !== 'STUDENT_SPEAKING') return
    const exchangeId = questionRef.current?.exchangeId
    if (!exchangeId) return
    const wasListening = listeningWantedRef.current
    stopRecognition()
    setPhaseDeadline(null)
    changePhase('EVAL_AND_DECIDE')
    // Chờ một nhịp để trình duyệt trả nốt mấy từ cuối vừa nói
    window.clearTimeout(submitTimerRef.current)
    submitTimerRef.current = window.setTimeout(
      () => sendAnswer(exchangeId, draftRef.current.trim()),
      wasListening ? 500 : 0,
    )
  }

  const skipQuestion = () => {
    if (phaseRef.current !== 'STUDENT_PREPARE' && phaseRef.current !== 'STUDENT_SPEAKING') return
    const exchangeId = questionRef.current?.exchangeId
    if (!exchangeId || !attemptId) return
    cancelSpeech()
    stopRecognition()
    setPhaseDeadline(null)
    changePhase('EVAL_AND_DECIDE')
    skipInterviewQuestion(attemptId, exchangeId).then(applyState).catch(handleRoomError)
  }

  // Sinh viên sửa câu trả lời bằng bàn phím: dừng ghi giọng nói để không bị ghi đè
  const handleDraftChange = (value: string) => {
    ignoreResultsRef.current = true
    if (listeningWantedRef.current) {
      stopRecognition()
    }
    updateDraft(value)
  }

  const resumeListening = () => {
    if (phaseRef.current !== 'STUDENT_SPEAKING') return
    restartCountRef.current = 0
    lastSoundAtRef.current = Date.now()
    setSilenceSeconds(0)
    startRecognition(draftRef.current)
  }

  const handleRetry = () => {
    const retry = retryRef.current
    retryRef.current = null
    setRoomError('')
    if (retry) {
      retry()
    } else {
      changePhase('EVAL_AND_DECIDE')
      syncInterview()
    }
  }

  // Kết thúc bài thi sớm
  const completeExam = async () => {
    if (!attemptId) return
    cancelSpeech()
    stopRecognition()
    window.clearTimeout(pollTimerRef.current)
    window.clearTimeout(submitTimerRef.current)
    setPhaseDeadline(null)
    try {
      setAttempt(await finishExamAttempt(attemptId))
      retryRef.current = null
      setRoomError('')
      changePhase('COMPLETED')
    } catch (err) {
      retryRef.current = () => {
        completeExam()
      }
      handleRoomError(err)
    }
  }

  // Timer luôn gọi bản mới nhất của các hàm trên
  const handlersRef = useRef({ startSpeakingPhase, submitAnswer, syncInterview })
  handlersRef.current = { startSpeakingPhase, submitAnswer, syncInterview }

  /* ---------- Effect ---------- */

  // Tải dữ liệu lượt thi
  useEffect(() => {
    if (!attemptId) return
    getExamAttempt(attemptId)
      .then((data) => {
        setAttempt(data)
        if (data.status === 'COMPLETED') {
          changePhase('COMPLETED')
        } else {
          examEndsAtRef.current = performance.now() + data.remainingSeconds * 1000
          setExamSecondsLeft(data.remainingSeconds)
        }
      })
      .catch((err) => {
        setLoadError(err instanceof Error && err.message ? err.message : 'Không tải được lượt thi.')
      })
      .finally(() => setLoading(false))
  }, [attemptId])

  // Dọn dẹp media khi unmount
  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
      listeningWantedRef.current = false
      window.clearTimeout(speakTimerRef.current)
      window.clearTimeout(pollTimerRef.current)
      window.clearTimeout(submitTimerRef.current)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      if (microphoneRef.current) {
        microphoneRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [])

  // Đếm ngược trong từng Phase (chuẩn bị / trả lời), tính theo mốc thời gian nên không bị trôi
  useEffect(() => {
    if (phaseDeadline === null) return
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((phaseDeadline - Date.now()) / 1000))
      setPhaseSecondsLeft(left)
      if (left > 0) return
      window.clearInterval(timer)
      if (phaseRef.current === 'STUDENT_PREPARE') {
        handlersRef.current.startSpeakingPhase()
      } else if (phaseRef.current === 'STUDENT_SPEAKING') {
        handlersRef.current.submitAnswer()
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [phaseDeadline])

  // Đồng hồ cả bài thi. Hết giờ thì hỏi lại backend (backend mới là nơi quyết định đã hết giờ hay chưa).
  useEffect(() => {
    if (phase === 'COMPLETED' || examEndsAtRef.current === null) return
    const timer = window.setInterval(() => {
      const endsAt = examEndsAtRef.current
      if (endsAt === null) return
      const left = Math.max(0, Math.ceil((endsAt - performance.now()) / 1000))
      setExamSecondsLeft(left)
      if (left > 0) return
      window.clearInterval(timer)
      if (phaseRef.current === 'MIC_CHECK') {
        changePhase('COMPLETED')
        refreshAttempt()
      } else {
        handlersRef.current.syncInterview()
      }
    }, 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'COMPLETED', attempt?.attemptId])

  // Phát hiện khoảng lặng (>= 10s -> tự nộp theo BR-VIVA-003). Chỉ áp dụng khi đang ghi giọng nói.
  useEffect(() => {
    if (phase !== 'STUDENT_SPEAKING' || !listening) {
      setSilenceSeconds(0)
      return
    }
    const interval = window.setInterval(() => {
      const silent = Math.floor((Date.now() - lastSoundAtRef.current) / 1000)
      setSilenceSeconds(silent)
      if (silent >= SILENCE_SUBMIT_SECONDS) {
        handlersRef.current.submitAnswer()
      }
    }, 500)
    return () => window.clearInterval(interval)
  }, [phase, listening])

  // Xin quyền micro rồi bắt đầu phỏng vấn. Không có micro vẫn thi được bằng bàn phím.
  const handlePassMicCheck = async () => {
    if (!attemptId || starting) return
    setStarting(true)
    setStartError('')

    let hasMic = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      microphoneRef.current = stream

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      audioContextRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256

      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const level = Math.min(100, Math.round((sum / dataArray.length) * 1.5))
        if (level >= SOUND_LEVEL_THRESHOLD) {
          lastSoundAtRef.current = Date.now()
        }
        // Chỉ vẽ lại khi âm lượng đổi đáng kể
        if (Math.abs(level - lastLevelRef.current) >= 2) {
          lastLevelRef.current = level
          setAudioLevel(level)
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume)
      }
      updateVolume()
      hasMic = true
    } catch (err) {
      console.warn('Không dùng được micro, chuyển sang trả lời bằng bàn phím', err)
    }
    setMicReady(hasMic)

    try {
      applyState(await startInterview(attemptId))
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EXAM_ATTEMPT_NOT_RUNNING') {
        applyState({ status: 'COMPLETED', aiEnabled: true, aiFallback: false })
      } else {
        setStartError(err instanceof Error && err.message ? err.message : 'Không bắt đầu được phỏng vấn.')
      }
    } finally {
      setStarting(false)
    }
  }

  const handleFinishEarly = async () => {
    await completeExam()
    setConfirmingFinish(false)
  }

  const voiceMode = micReady && speechSupported
  const followUpNo = question?.followUpNo ?? 0

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface">
        <div className="flex items-center gap-3 text-body-lg">
          <Icon name="progress_activity" className="animate-spin text-primary text-3xl" />
          <span>Đang kết nối phòng thi bảo mật AIVES...</span>
        </div>
      </div>
    )
  }

  if (loadError || !attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-on-surface">
        <div className="w-full max-w-md rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center shadow-xl">
          <Icon name="error" className="text-5xl text-error" />
          <h1 className="mt-4 text-headline-sm font-bold">Không vào được phòng thi</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">{loadError || 'Không tìm thấy lượt thi.'}</p>
          <Link
            to="/exam/join"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary"
          >
            <Icon name="arrow_back" />
            <span>Quay lại trang nhập mã phiên thi</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      {/* Header phòng thi */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest/90 px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1.5 text-label-md text-on-surface-variant hover:text-primary">
            <Icon name="arrow_back" />
            <span className="hidden sm:inline">Rời phòng</span>
          </Link>
          <div className="h-5 w-px bg-outline-variant/50" />
          <Logo compact />
        </div>

        <div className="flex items-center gap-4">
          {attempt && (
            <div className="flex items-center gap-2 rounded-full bg-surface-container px-3.5 py-1.5 text-label-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-secondary animate-pulse" />
              <span className="text-on-surface">
                Phiên: {attempt.examId}
                {attempt.maxAttempts > 1 && ` · Lượt ${attempt.attemptNo}/${attempt.maxAttempts}`}
              </span>
            </div>
          )}

          {phase !== 'COMPLETED' && examSecondsLeft !== null && (
            <div
              className="flex items-center gap-1.5 rounded-full bg-surface-container px-3.5 py-1.5 text-label-sm font-semibold text-on-surface"
              title="Thời gian còn lại của cả bài thi"
            >
              <Icon name="schedule" className="text-base text-primary" />
              <span className="font-mono">{formatClock(examSecondsLeft)}</span>
            </div>
          )}

          {phase !== 'MIC_CHECK' && phase !== 'COMPLETED' && (
            <button
              type="button"
              onClick={() => setConfirmingFinish(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-error/10 px-3.5 py-1.5 text-label-sm font-medium text-error hover:bg-error/20 transition-colors"
            >
              <Icon name="check_circle" className="text-base" />
              <span>Nộp bài sớm</span>
            </button>
          )}

          <LanguageSwitch />
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 sm:p-6 lg:p-8">
        {/* BƯỚC 1: KIỂM TRA THIẾT BỊ (MIC CHECK) */}
        {phase === 'MIC_CHECK' && (
          <div className="mx-auto my-auto w-full max-w-xl rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-xl sm:p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
              <Icon name="mic" filled className="text-4xl" />
            </div>

            <h1 className="mt-6 text-headline-sm font-bold text-on-surface">Kiểm tra Micro & Loa</h1>
            <p className="mt-2 text-body-md text-on-surface-variant leading-relaxed">
              Kỳ thi vấn đáp AI yêu cầu tương tác giọng nói trực tiếp hai chiều. Vui lòng bấm nút bên dưới để cấp quyền
              và kiểm tra tín hiệu trước khi bắt đầu.
            </p>

            <div className="mt-8 rounded-2xl bg-surface-container p-4 text-left">
              <h2 className="flex items-center gap-2 text-label-md font-semibold text-primary">
                <Icon name="info" /> Quy định phòng thi (AIVES BR-VIVA):
              </h2>
              <ul className="mt-2 space-y-1.5 text-body-sm text-on-surface-variant list-disc pl-5">
                <li>AI đọc câu hỏi qua giọng nói, sau đó thí sinh có thời gian suy nghĩ chuẩn bị.</li>
                <li>Micro sẽ tự động bật khi bắt đầu thời gian trả lời.</li>
                <li>
                  <strong>Cơ chế tự nộp (BR-VIVA-003):</strong> Nếu phát hiện im lặng liên tục từ 10 giây, hệ thống
                  sẽ tự khóa micro và nộp câu trả lời.
                </li>
                <li>AI có thể hỏi xoáy đào sâu (Adaptive Follow-up) nếu câu trả lời chưa đầy đủ ý.</li>
                <li>
                  Lời nói được tự ghi thành chữ (cần Chrome hoặc Edge). Bạn sửa được bằng bàn phím trước khi nộp;
                  không có micro thì trả lời bằng bàn phím.
                </li>
              </ul>
            </div>

            {startError && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-error/10 p-3 text-left text-body-sm text-error">
                <Icon name="error" className="text-base" />
                <span>{startError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handlePassMicCheck}
              disabled={starting}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-container py-3.5 text-label-lg font-semibold text-on-primary shadow-lg shadow-primary-container/30 hover:bg-primary transition-all disabled:opacity-60"
            >
              <Icon name={starting ? 'progress_activity' : 'settings_voice'} className={starting ? 'animate-spin' : ''} />
              <span>{starting ? 'Đang chuẩn bị câu hỏi...' : 'Cho phép Micro & Bắt đầu thi'}</span>
            </button>
          </div>
        )}

        {/* BƯỚC 2: PHÒNG THI ĐANG DIỄN RA (INTERVIEW LOOP) */}
        {phase !== 'MIC_CHECK' && phase !== 'COMPLETED' && (
          <div className="flex flex-1 flex-col gap-6">
            {/* Thanh tiến độ câu hỏi */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-fixed text-primary font-bold">
                  {question?.questionNo ?? '-'}
                </span>
                <div>
                  <h3 className="text-label-lg font-bold text-on-surface">
                    Câu hỏi chính {question?.questionNo ?? '-'} / {question?.totalQuestions ?? '-'}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant">
                    Mức độ Bloom: <span className="font-semibold text-primary">{question?.bloomLevel ?? '-'}</span>
                  </p>
                </div>
              </div>

              {/* Trạng thái vòng hỏi xoáy */}
              {followUpNo > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-tertiary-fixed px-4 py-1.5 text-label-md text-tertiary font-semibold animate-pulse">
                  <Icon name="psychology_alt" />
                  <span>
                    Hỏi xoáy thích ứng (Follow-up #{followUpNo}/{question?.maxFollowUps ?? followUpNo})
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-3.5 py-1 text-label-sm text-secondary font-medium">
                  <Icon name="verified" />
                  <span>Câu hỏi ban đầu</span>
                </div>
              )}
            </div>

            {/* Khung câu hỏi Giám khảo AI */}
            <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8 shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-blue to-primary-container text-on-primary shadow-md">
                  <Icon name="smart_toy" filled className="text-3xl" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-label-sm font-semibold uppercase tracking-wider text-primary">
                      Giám khảo ảo AI (AIVES Viva Examiner)
                    </span>
                    {phase === 'TTS_PLAY' && (
                      <span className="inline-flex items-center gap-1.5 text-label-sm text-primary animate-pulse">
                        <Icon name="volume_up" /> Đang đọc câu hỏi...
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-headline-sm font-semibold text-on-surface leading-snug">
                    {question?.questionText ?? 'Đang tải câu hỏi...'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-label-xs text-on-surface-variant">
                    {question?.rubricName && (
                      <span className="rounded-md bg-surface-container px-2.5 py-1">Rubric: {question.rubricName}</span>
                    )}
                    <span className="rounded-md bg-surface-container px-2.5 py-1">
                      Thời gian suy nghĩ: {question?.prepareSeconds ?? '-'}s
                    </span>
                    <span className="rounded-md bg-surface-container px-2.5 py-1">
                      Thời gian trả lời tối đa: {question?.answerSeconds ?? '-'}s
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Khu vực tương tác trả lời của Thí sinh */}
            <div className="flex flex-1 flex-col justify-between rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8 shadow-lg">
              {/* Header trạng thái */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      phase === 'STUDENT_SPEAKING'
                        ? 'bg-error animate-ping'
                        : phase === 'STUDENT_PREPARE'
                          ? 'bg-tertiary-container'
                          : 'bg-outline'
                    }`}
                  />
                  <span className="text-label-md font-semibold text-on-surface">
                    {phase === 'STUDENT_PREPARE' && 'Thời gian chuẩn bị suy nghĩ'}
                    {phase === 'STUDENT_SPEAKING' &&
                      (listening ? 'Micro đang bật - Hãy trả lời' : 'Hãy nhập câu trả lời bằng bàn phím')}
                    {phase === 'EVAL_AND_DECIDE' && 'AI đang phân tích câu trả lời...'}
                    {phase === 'ERROR' && 'Chưa gửi được lên máy chủ'}
                    {phase === 'TTS_PLAY' && 'Lắng nghe giám khảo đọc đề'}
                  </span>
                </div>

                {/* Đồng hồ đếm ngược từng giai đoạn */}
                {(phase === 'STUDENT_PREPARE' || phase === 'STUDENT_SPEAKING') && (
                  <div className="flex items-center gap-2 rounded-2xl bg-surface-container-high px-4 py-2">
                    <Icon name="timer" className="text-primary text-xl" />
                    <span className="text-headline-xs font-mono font-bold text-primary">
                      {formatClock(phaseSecondsLeft)}
                    </span>
                  </div>
                )}
              </div>

              {/* Vùng trực quan hoá âm thanh & Transcript thời gian thực */}
              <div className="my-6 flex flex-1 flex-col items-center justify-center rounded-2xl bg-surface-container-low p-6 text-center">
                {phase === 'STUDENT_PREPARE' && (
                  <div className="max-w-md">
                    <p className="text-body-lg text-on-surface-variant">
                      Bạn có <span className="font-bold text-primary">{phaseSecondsLeft}s</span> để sắp xếp ý tưởng.
                    </p>
                    <button
                      type="button"
                      onClick={startSpeakingPhase}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary-container px-6 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary transition-colors"
                    >
                      <Icon name="mic" />
                      <span>Tôi đã sẵn sàng trả lời ngay</span>
                    </button>
                  </div>
                )}

                {phase === 'STUDENT_SPEAKING' && (
                  <div className="w-full">
                    {/* Visualizer bars */}
                    {listening && (
                      <div className="flex items-center justify-center gap-1.5 h-16 mb-4">
                        {[...Array(24)].map((_, i) => {
                          const height = Math.max(12, Math.min(60, (audioLevel * (i % 5 + 1)) / 4))
                          return (
                            <div
                              key={i}
                              className="w-1.5 rounded-full bg-gradient-to-t from-primary to-primary-container transition-all duration-75"
                              style={{ height: `${height}px` }}
                            />
                          )
                        })}
                      </div>
                    )}

                    {/* Cảnh báo im lặng BR-VIVA-003 */}
                    {listening && silenceSeconds >= SILENCE_HINT_SECONDS && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-tertiary-fixed px-4 py-1 text-label-sm text-tertiary font-semibold mb-3">
                        <Icon name="warning" />
                        <span>
                          Phát hiện im lặng {silenceSeconds}s (Tự nộp sau {SILENCE_SUBMIT_SECONDS}s)
                        </span>
                      </div>
                    )}

                    {/* Câu trả lời: tự ghi từ giọng nói, sửa được bằng bàn phím */}
                    <div className="mx-auto max-w-2xl rounded-xl bg-surface-container-lowest p-4 text-left border border-outline-variant/30 shadow-inner">
                      <label
                        htmlFor="answer-draft"
                        className="text-label-xs uppercase tracking-wider text-outline block mb-1"
                      >
                        {listening
                          ? 'Câu trả lời của bạn (đang ghi từ giọng nói, sửa được bằng bàn phím):'
                          : 'Câu trả lời của bạn (nhập bằng bàn phím):'}
                      </label>
                      <textarea
                        id="answer-draft"
                        value={answerDraft}
                        onChange={(event) => handleDraftChange(event.target.value)}
                        rows={4}
                        maxLength={MAX_TRANSCRIPT_LENGTH}
                        placeholder={listening ? 'Đang lắng nghe âm thanh từ micro...' : 'Nhập câu trả lời của bạn...'}
                        className="w-full resize-y bg-transparent text-body-md text-on-surface font-medium outline-none placeholder:italic placeholder:text-outline"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-label-xs text-outline">
                        <span>
                          {listening && 'Micro đang ghi. Gõ vào ô trên sẽ tạm dừng ghi giọng nói.'}
                          {!listening && voiceMode && 'Đã tạm dừng ghi giọng nói.'}
                          {!listening && !micReady && 'Không dùng được micro nên bạn trả lời bằng bàn phím.'}
                          {!listening &&
                            micReady &&
                            !speechSupported &&
                            'Trình duyệt này không hỗ trợ nhận giọng nói (hãy dùng Chrome hoặc Edge).'}
                        </span>
                        {!listening && voiceMode && (
                          <button
                            type="button"
                            onClick={resumeListening}
                            className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 font-semibold text-primary hover:bg-primary-fixed-dim"
                          >
                            <Icon name="mic" className="text-sm" />
                            <span>Nói tiếp</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {phase === 'EVAL_AND_DECIDE' && (
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="cognition" className="animate-spin text-primary text-5xl" />
                    <p className="text-headline-xs font-semibold text-on-surface">AI đang đối chiếu với Rubric...</p>
                    <p className="text-body-sm text-on-surface-variant max-w-sm">
                      Hệ thống đang phân tích các ý chính để quyết định câu hỏi tiếp theo hoặc hỏi xoáy thích ứng.
                    </p>
                  </div>
                )}

                {phase === 'ERROR' && (
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="cloud_off" className="text-error text-5xl" />
                    <p className="text-headline-xs font-semibold text-on-surface">Có lỗi khi kết nối máy chủ</p>
                    <p className="text-body-sm text-on-surface-variant max-w-sm">{roomError}</p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary-container px-6 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary transition-colors"
                    >
                      <Icon name="refresh" />
                      <span>Thử lại</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Nút hành động phía dưới */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-body-xs text-outline">
                  Phiên thi được mã hóa & giám sát tuân thủ tiêu chuẩn bảo mật.
                </span>

                <div className="flex items-center gap-2">
                  {(phase === 'STUDENT_PREPARE' || phase === 'STUDENT_SPEAKING') && (
                    <button
                      type="button"
                      onClick={skipQuestion}
                      className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-5 py-2.5 text-label-md font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      <Icon name="skip_next" />
                      <span>Bỏ qua câu này</span>
                    </button>
                  )}
                  {phase === 'STUDENT_SPEAKING' && (
                    <button
                      type="button"
                      onClick={submitAnswer}
                      className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-6 py-2.5 text-label-md font-semibold text-on-secondary-container shadow-md hover:bg-secondary-fixed transition-colors"
                    >
                      <Icon name="check" />
                      <span>Hoàn thành câu trả lời</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BƯỚC 3: HOÀN THÀNH BÀI THI (COMPLETED) */}
        {phase === 'COMPLETED' && (
          <div className="mx-auto my-auto w-full max-w-lg rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-8 shadow-2xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary-container text-secondary">
              <Icon name="task_alt" filled className="text-5xl" />
            </div>

            <h1 className="mt-6 text-headline-md font-bold text-on-surface">Đã hoàn thành bài thi Vấn đáp!</h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Toàn bộ nội dung hỏi - đáp với Giám khảo AI đã được lưu lại.
            </p>

            <div className="mt-6 rounded-2xl bg-surface-container p-4 text-left space-y-2 text-body-sm text-on-surface-variant">
              <div className="flex justify-between">
                <span>Mã phiên thi:</span>
                <span className="font-semibold text-on-surface">{attempt?.examId}</span>
              </div>
              <div className="flex justify-between">
                <span>Lượt thi:</span>
                <span className="font-semibold text-on-surface">
                  {attempt?.attemptNo ?? 1} / {attempt?.maxAttempts ?? 1}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Thời gian nộp:</span>
                <span className="font-semibold text-on-surface">
                  {formatDateTime(attempt?.completedAt, locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Trạng thái kết quả:</span>
                <span className="font-semibold text-tertiary">Đang chờ Giảng viên thẩm định (HITL)</span>
              </div>
            </div>

            {/* Còn lượt thi thì nhắc sinh viên có thể vào thi lại bằng mã phiên + mã truy cập */}
            {(attempt?.maxAttempts ?? 1) > (attempt?.attemptNo ?? 1) && (
              <p className="mt-4 text-body-sm text-on-surface-variant">
                Bạn còn {(attempt?.maxAttempts ?? 1) - (attempt?.attemptNo ?? 1)} lượt thi: nhập lại mã phiên và mã
                truy cập để thi lượt tiếp theo khi phiên còn mở.
              </p>
            )}

            <p className="mt-4 text-body-xs text-outline">
              * Theo quy định BR-GRADE-002, điểm số sẽ được công bố sau khi Giảng viên phụ trách xem xét và phê duyệt.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-container py-3 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary"
              >
                <Icon name="home" />
                <span>Về trang chủ</span>
              </Link>
              <Link
                to="/student/results"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-outline-variant py-3 text-label-md font-semibold text-primary hover:bg-surface-container"
              >
                <Icon name="assignment" />
                <span>Xem danh sách kết quả</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Modal xác nhận nộp bài sớm */}
      {confirmingFinish && (
        <ConfirmModal
          title="Xác nhận kết thúc bài thi sớm?"
          message="Bạn có chắc chắn muốn nộp bài thi ngay bây giờ? Sau khi nộp, bạn sẽ không thể quay lại phòng thi này nữa."
          confirmLabel="Xác nhận nộp bài"
          cancelLabel="Tiếp tục thi"
          pendingLabel="Đang nộp bài..."
          icon="check_circle"
          danger
          onConfirm={handleFinishEarly}
          onClose={() => setConfirmingFinish(false)}
        />
      )}
    </div>
  )
}
