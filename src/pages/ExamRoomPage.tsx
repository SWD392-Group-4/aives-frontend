import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import Icon from '../components/Icon'
import LanguageSwitch from '../components/LanguageSwitch'
import Logo from '../components/Logo'
import { useLanguage } from '../hooks/useLanguage'
import { getErrorMessage } from '../i18n/errorMessage'
import { finishExamAttempt, getExamAttempt } from '../services/examSessionService'
import { InterviewExchange, VivaAttempt } from '../types'
import { formatDateTime } from '../utils/dateTime'

// Trạng thái FSM của phòng thi (theo tài liệu br-ai-interview.md)
type RoomPhase =
  | 'MIC_CHECK' // Kiểm tra mic/âm thanh trước khi bắt đầu
  | 'TTS_PLAY' // AI đọc câu hỏi
  | 'STUDENT_PREPARE' // Thời gian suy nghĩ chuẩn bị
  | 'STUDENT_SPEAKING' // Đang thu âm câu trả lời
  | 'EVAL_AND_DECIDE' // AI đánh giá & quyết định (Follow-up hay chuyển câu)
  | 'COMPLETED' // Hoàn thành toàn bộ câu hỏi

interface ExamQuestionItem {
  id: string
  content: string
  bloomLevel: string
  rubricName: string
  prepareSeconds: number
  answerSeconds: number
  maxFollowUps: number
}

// Bộ câu hỏi mẫu của phòng thi
const SAMPLE_EXAM_QUESTIONS: ExamQuestionItem[] = [
  {
    id: 'QS001',
    content: 'Khi chuyển đổi từ kiến trúc Monolith sang Microservices, bạn sẽ giải quyết bài toán giao dịch phân tán (Distributed Transaction) như thế nào? So sánh 2PC và Saga Pattern.',
    bloomLevel: 'ANALYZE',
    rubricName: 'Rubric Kiến trúc & Thiết kế hệ thống',
    prepareSeconds: 20,
    answerSeconds: 60,
    maxFollowUps: 2,
  },
  {
    id: 'QS002',
    content: 'Tại sao trong hệ thống phỏng vấn trực tiếp AIVES, chúng ta cần cơ chế Finite State Machine (FSM) và bộ đếm thời gian phía Server thay vì tin tưởng Client?',
    bloomLevel: 'APPLY',
    rubricName: 'Rubric Kiểm soát Trạng thái & Bảo mật',
    prepareSeconds: 15,
    answerSeconds: 60,
    maxFollowUps: 1,
  },
]

export default function ExamRoomPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const { t, locale } = useLanguage()

  // Thông tin attempt
  const [attempt, setAttempt] = useState<VivaAttempt | null>(null)
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confirmingFinish, setConfirmingFinish] = useState(false)

  // FSM phòng thi
  const [phase, setPhase] = useState<RoomPhase>('MIC_CHECK')
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [followUpCount, setFollowUpCount] = useState(0)
  const [exchanges, setExchanges] = useState<InterviewExchange[]>([])

  // Bộ đếm thời gian
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0)
  const [silenceSeconds, setSilenceSeconds] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)

  // Tham chiếu Web Speech & Media
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const silenceTimerRef = useRef<any>(null)

  const currentQuestion = SAMPLE_EXAM_QUESTIONS[currentQuestionIdx] || SAMPLE_EXAM_QUESTIONS[0]

  // Tải dữ liệu phiên thi
  useEffect(() => {
    if (!attemptId) return
    getExamAttempt(attemptId)
      .then((data: any) => {
        setAttempt(data)
        if (data.status === 'COMPLETED') {
          setPhase('COMPLETED')
        }
      })
      .catch((err: any) => {
        // Fallback mock nếu chưa có backend
        setAttempt({
          attemptId: attemptId,
          examId: 'AIVES_EXAM_2026_049282',
          title: 'Kiểm tra vấn đáp Kiến trúc phần mềm & AI (Đợt 1)',
          durationMinutes: 45,
          status: 'IN_PROGRESS',
          resultStatus: 'NONE',
          startedAt: new Date().toISOString(),
          deadlineAt: new Date(Date.now() + 45 * 60000).toISOString(),
          serverTime: new Date().toISOString(),
          remainingSeconds: 45 * 60,
        })
      })
      .finally(() => setLoading(false))
  }, [attemptId])

  // Dọn dẹp media khi unmount
  useEffect(() => {
    return () => {
      if (microphoneRef.current) {
        microphoneRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current)
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [])

  // Đếm ngược trong từng Phase
  useEffect(() => {
    if (phase !== 'STUDENT_PREPARE' && phase !== 'STUDENT_SPEAKING') return

    const timer = setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          if (phase === 'STUDENT_PREPARE') {
            startSpeakingPhase()
          } else if (phase === 'STUDENT_SPEAKING') {
            submitAnswer()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [phase])

  // Phát hiện khoảng lặng (Silence Detection >= 10s -> Auto Submit theo BR-VIVA-003)
  useEffect(() => {
    if (phase !== 'STUDENT_SPEAKING') {
      setSilenceSeconds(0)
      return
    }

    const interval = setInterval(() => {
      // Nếu âm lượng mic thấp < 5 thì coi như khoảng lặng
      if (audioLevel < 5) {
        setSilenceSeconds((prev) => {
          const next = prev + 1
          if (next >= 10) {
            // Tự động nộp bài vì im lặng quá 10s
            submitAnswer()
            return 0
          }
          return next
        })
      } else {
        setSilenceSeconds(0)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, audioLevel])

  // Khởi động kiểm tra mic
  const handlePassMicCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      microphoneRef.current = stream

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      audioContextRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)

      // Bắt đầu visualizer
      const updateVolume = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const avg = sum / dataArray.length
        setAudioLevel(Math.min(100, Math.round(avg * 1.5)))
        animationFrameRef.current = requestAnimationFrame(updateVolume)
      }
      updateVolume()

      // Chuyển sang đọc câu hỏi 1
      startQuestion(0)
    } catch (err) {
      alert('Vui lòng cho phép quyền truy cập Micro để tham gia phòng thi vấn đáp!')
    }
  }

  // Bắt đầu câu hỏi
  const startQuestion = (qIdx: number) => {
    setCurrentQuestionIdx(qIdx)
    setFollowUpCount(0)
    setPhase('TTS_PLAY')

    const question = SAMPLE_EXAM_QUESTIONS[qIdx]

    // Phát âm câu hỏi qua Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(question.content)
      utter.lang = 'vi-VN'
      utter.rate = 1.0
      utter.onend = () => {
        // Kết thúc đọc câu hỏi -> Sang thời gian chuẩn bị
        setPhase('STUDENT_PREPARE')
        setPhaseSecondsLeft(question.prepareSeconds)
      }
      utter.onerror = () => {
        setPhase('STUDENT_PREPARE')
        setPhaseSecondsLeft(question.prepareSeconds)
      }
      window.speechSynthesis.speak(utter)
    } else {
      setTimeout(() => {
        setPhase('STUDENT_PREPARE')
        setPhaseSecondsLeft(question.prepareSeconds)
      }, 2500)
    }
  }

  // Bắt đầu trả lời (Mic active + Speech-to-Text)
  const startSpeakingPhase = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setPhase('STUDENT_SPEAKING')
    setPhaseSecondsLeft(currentQuestion.answerSeconds)
    setIsSpeaking(true)
    setLiveTranscript('')
    setSilenceSeconds(0)

    // Khởi tạo STT trình duyệt nếu có
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'vi-VN'

        recognition.onresult = (event: any) => {
          let full = ''
          for (let i = 0; i < event.results.length; i++) {
            full += event.results[i][0].transcript + ' '
          }
          setLiveTranscript(full.trim())
        }
        recognition.start()
        recognitionRef.current = recognition
      } catch (err) {
        console.warn('SpeechRecognition error', err)
      }
    }
  }

  // Nộp câu trả lời & AI đánh giá
  const submitAnswer = () => {
    setIsSpeaking(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }

    setPhase('EVAL_AND_DECIDE')

    const currentExchangeText = liveTranscript || 'Thí sinh đã trả lời bằng giọng nói và hệ thống đã ghi lại âm thanh.'

    const newExchange: InterviewExchange = {
      id: `EX_${Date.now()}`,
      attemptId: attemptId || '',
      questionId: currentQuestion.id,
      depth: followUpCount,
      questionText: followUpCount === 0 ? currentQuestion.content : `[Hỏi xoáy ${followUpCount}] Làm rõ thêm câu trả lời trước đó?`,
      transcript: currentExchangeText,
      createdAt: new Date().toISOString(),
    }

    const updatedExchanges = [...exchanges, newExchange]
    setExchanges(updatedExchanges)

    // Giả lập AI phân tích câu trả lời (BR-VIVA-001/002)
    setTimeout(() => {
      // Nếu chưa đạt trần follow up và là câu đầu tiên -> Giả lập 1 lượt hỏi xoáy
      if (followUpCount < currentQuestion.maxFollowUps && followUpCount === 0) {
        triggerFollowUpQuestion()
      } else {
        // Đạt yêu cầu hoặc hết quota -> Chuyển câu hỏi tiếp theo
        goToNextQuestion()
      }
    }, 2200)
  }

  // Kích hoạt hỏi xoáy (Adaptive Follow-up)
  const triggerFollowUpQuestion = () => {
    const nextFollowUp = followUpCount + 1
    setFollowUpCount(nextFollowUp)
    setPhase('TTS_PLAY')

    const followUpText =
      nextFollowUp === 1
        ? 'Bạn giải thích rất hay. Nhưng nếu một lệnh bù trừ trong Saga bị thất bại tiếp thì hệ thống sẽ xử lý thế nào để đảm bảo dữ liệu?'
        : 'Hãy cho biết thêm về giải pháp Dead Letter Queue trong tình huống này?'

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(followUpText)
      utter.lang = 'vi-VN'
      utter.rate = 1.0
      utter.onend = () => {
        setPhase('STUDENT_PREPARE')
        setPhaseSecondsLeft(10) // 10 giây chuẩn bị cho câu hỏi xoáy
      }
      utter.onerror = () => {
        setPhase('STUDENT_PREPARE')
        setPhaseSecondsLeft(10)
      }
      window.speechSynthesis.speak(utter)
    } else {
      setTimeout(() => {
        setPhase('STUDENT_PREPARE')
        setPhaseSecondsLeft(10)
      }, 2000)
    }
  }

  // Chuyển sang câu hỏi chính tiếp theo
  const goToNextQuestion = () => {
    if (currentQuestionIdx + 1 < SAMPLE_EXAM_QUESTIONS.length) {
      startQuestion(currentQuestionIdx + 1)
    } else {
      // Đã hoàn thành hết các câu hỏi
      completeExam()
    }
  }

  // Kết thúc bài thi
  const completeExam = async () => {
    setPhase('COMPLETED')
    try {
      if (attemptId) {
        await finishExamAttempt(attemptId)
      }
    } catch {}
  }

  const handleFinishEarly = async () => {
    await completeExam()
    setConfirmingFinish(false)
  }

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
              <span className="text-on-surface">Phiên: {attempt.examId}</span>
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
                <li>AI đọc câu hỏi qua giọng nói $\rightarrow$ Thí sinh có thời gian suy nghĩ chuẩn bị.</li>
                <li>Micro sẽ tự động bật khi bắt đầu thời gian trả lời.</li>
                <li>
                  <strong>Cơ chế tự nộp (BR-VIVA-003):</strong> Nếu phát hiện im lặng liên tục $\ge 10$ giây, hệ thống
                  sẽ tự khóa micro và nộp câu trả lời.
                </li>
                <li>AI có thể hỏi xoáy đào sâu (Adaptive Follow-up) nếu câu trả lời chưa đầy đủ ý.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handlePassMicCheck}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-container py-3.5 text-label-lg font-semibold text-on-primary shadow-lg shadow-primary-container/30 hover:bg-primary transition-all"
            >
              <Icon name="settings_voice" />
              <span>Cho phép Micro & Bắt đầu thi</span>
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
                  {currentQuestionIdx + 1}
                </span>
                <div>
                  <h3 className="text-label-lg font-bold text-on-surface">
                    Câu hỏi chính {currentQuestionIdx + 1} / {SAMPLE_EXAM_QUESTIONS.length}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant">
                    Mức độ Bloom: <span className="font-semibold text-primary">{currentQuestion.bloomLevel}</span>
                  </p>
                </div>
              </div>

              {/* Trạng thái vòng hỏi xoáy */}
              {followUpCount > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-tertiary-fixed px-4 py-1.5 text-label-md text-tertiary font-semibold animate-pulse">
                  <Icon name="psychology_alt" />
                  <span>Hỏi xoáy thích ứng (Follow-up #{followUpCount})</span>
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
                    {followUpCount === 0
                      ? currentQuestion.content
                      : `Bạn giải thích rất hay. Nhưng nếu một lệnh bù trừ trong Saga bị thất bại tiếp thì hệ thống sẽ xử lý thế nào để đảm bảo tính nhất quán?`}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-label-xs text-on-surface-variant">
                    <span className="rounded-md bg-surface-container px-2.5 py-1">
                      Rubric: {currentQuestion.rubricName}
                    </span>
                    <span className="rounded-md bg-surface-container px-2.5 py-1">
                      Thời gian suy nghĩ: {currentQuestion.prepareSeconds}s
                    </span>
                    <span className="rounded-md bg-surface-container px-2.5 py-1">
                      Thời gian nói tối đa: {currentQuestion.answerSeconds}s
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
                    {phase === 'STUDENT_SPEAKING' && 'Micro đang bật - Hãy trả lời'}
                    {phase === 'EVAL_AND_DECIDE' && 'AI đang phân tích câu trả lời...'}
                    {phase === 'TTS_PLAY' && 'Lắng nghe giám khảo đọc đề'}
                  </span>
                </div>

                {/* Đồng hồ đếm ngược từng giai đoạn */}
                {(phase === 'STUDENT_PREPARE' || phase === 'STUDENT_SPEAKING') && (
                  <div className="flex items-center gap-2 rounded-2xl bg-surface-container-high px-4 py-2">
                    <Icon name="timer" className="text-primary text-xl" />
                    <span className="text-headline-xs font-mono font-bold text-primary">
                      {String(Math.floor(phaseSecondsLeft / 60)).padStart(2, '0')}:
                      {String(phaseSecondsLeft % 60).padStart(2, '0')}
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

                    {/* Cảnh báo im lặng BR-VIVA-003 */}
                    {silenceSeconds >= 5 && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-tertiary-fixed px-4 py-1 text-label-sm text-tertiary font-semibold mb-3">
                        <Icon name="warning" />
                        <span>Phát hiện im lặng {silenceSeconds}s (Tự nộp sau 10s)</span>
                      </div>
                    )}

                    {/* Transcript bóc băng */}
                    <div className="mx-auto max-w-2xl min-h-16 rounded-xl bg-surface-container-lowest p-4 text-left border border-outline-variant/30 shadow-inner">
                      <span className="text-label-xs uppercase tracking-wider text-outline block mb-1">
                        Transcript bóc băng giọng nói trực tiếp:
                      </span>
                      <p className="text-body-md text-on-surface font-medium italic">
                        {liveTranscript || 'Đang lắng nghe âm thanh từ micro...'}
                      </p>
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
              </div>

              {/* Nút hành động phía dưới */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-body-xs text-outline">
                  Phiên thi được mã hóa & giám sát tuân thủ tiêu chuẩn bảo mật.
                </span>

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
        )}

        {/* BƯỚC 3: HOÀN THÀNH BÀI THI (COMPLETED) */}
        {phase === 'COMPLETED' && (
          <div className="mx-auto my-auto w-full max-w-lg rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-8 shadow-2xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary-container text-secondary">
              <Icon name="task_alt" filled className="text-5xl" />
            </div>

            <h1 className="mt-6 text-headline-md font-bold text-on-surface">Đã hoàn thành bài thi Vấn đáp!</h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Toàn bộ âm thanh và transcript đối thoại với Giám khảo AI đã được lưu trữ an toàn.
            </p>

            <div className="mt-6 rounded-2xl bg-surface-container p-4 text-left space-y-2 text-body-sm text-on-surface-variant">
              <div className="flex justify-between">
                <span>Mã phiên thi:</span>
                <span className="font-semibold text-on-surface">{attempt?.examId}</span>
              </div>
              <div className="flex justify-between">
                <span>Thời gian nộp:</span>
                <span className="font-semibold text-on-surface">
                  {formatDateTime(attempt?.completedAt || new Date().toISOString(), locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Trạng thái kết quả:</span>
                <span className="font-semibold text-tertiary">Đang chờ Giảng viên thẩm định (HITL)</span>
              </div>
            </div>

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
      <ConfirmModal
        open={confirmingFinish}
        title="Xác nhận kết thúc bài thi sớm?"
        message="Bạn có chắc chắn muốn nộp bài thi ngay bây giờ? Sau khi nộp, bạn sẽ không thể quay lại phòng thi này nữa."
        confirmText="Xác nhận nộp bài"
        cancelText="Tiếp tục thi"
        danger
        onConfirm={handleFinishEarly}
        onClose={() => setConfirmingFinish(false)}
      />
    </div>
  )
}
