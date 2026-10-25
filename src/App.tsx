import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './constants/roles'
import ChapterMaterialsPage from './features/materials/ChapterMaterialsPage'
import ChapterQuestionBankPage from './features/questions/ChapterQuestionBankPage'
import CourseRubricPage from './features/rubric/CourseRubricPage'
import AdminAuditLogsPage from './pages/AdminAuditLogsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AppealsManagementPage from './pages/AppealsManagementPage'
import CurriculumManagementPage from './pages/CurriculumManagementPage'
import ExamRoomPage from './pages/ExamRoomPage'
import ExamSessionsPage from './pages/ExamSessionsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/HomePage'
import JoinExamPage from './pages/JoinExamPage'
import LecturerDashboardPage from './pages/LecturerDashboardPage'
import LecturerReviewPage from './pages/LecturerReviewPage'
import LiveExamMonitorPage from './pages/LiveExamMonitorPage'
import LoginPage from './pages/LoginPage'
import MaterialsManagementPage from './pages/MaterialsManagementPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import PolicyPage from './pages/PolicyPage'
import QuestionBankPage from './pages/QuestionBankPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import StudentAppealsPage from './pages/StudentAppealsPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import StudentResultsPage from './pages/StudentResultsPage'

function App() {
  return (
    <Routes>
      {/* Công khai */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/privacy-policy" element={<PolicyPage type="privacy" />} />
      <Route path="/terms-of-service" element={<PolicyPage type="terms" />} />

      {/* Cần đăng nhập (mọi role) */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Dành cho SINH VIÊN (STUDENT) */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute roles={[ROLES.STUDENT]}>
            <StudentDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/join"
        element={
          <ProtectedRoute roles={[ROLES.STUDENT]}>
            <JoinExamPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/attempts/:attemptId"
        element={
          <ProtectedRoute roles={[ROLES.STUDENT]}>
            <ExamRoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/results"
        element={
          <ProtectedRoute roles={[ROLES.STUDENT]}>
            <StudentResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/results/:attemptId"
        element={
          <ProtectedRoute roles={[ROLES.STUDENT]}>
            <StudentResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/appeals"
        element={
          <ProtectedRoute roles={[ROLES.STUDENT]}>
            <StudentAppealsPage />
          </ProtectedRoute>
        }
      />

      {/* Dành cho GIẢNG VIÊN (LECTURER) và QUẢN TRỊ VIÊN (ADMIN) */}
      <Route
        path="/lecturer"
        element={<Navigate to="/lecturer/dashboard" replace />}
      />
      <Route
        path="/lecturer/dashboard"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <LecturerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/curriculum"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <CurriculumManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/exam-sessions/:id/monitor"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <LiveExamMonitorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam-sessions"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <ExamSessionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/materials"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <ChapterMaterialsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/questions"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <ChapterQuestionBankPage />
          </ProtectedRoute>
        }
      />
      {/* FLOW-02-QUESTION-BANK: Rubric Môn Học, Học Liệu Chương & Ngân Hàng Câu Hỏi */}
      <Route
        path="/lecturer/courses/:courseId/rubric"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <CourseRubricPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/rubric"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <CourseRubricPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/chapters/:chapterId"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <ChapterMaterialsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/chapters/:chapterId/materials"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <ChapterMaterialsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/chapters/:chapterId/questions"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <ChapterQuestionBankPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/reviews"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <LecturerReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/reviews/:attemptId"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <LecturerReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/appeals"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <AppealsManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Chỉ dành riêng cho QUẢN TRỊ VIÊN (ADMIN) */}
      <Route
        path="/admin"
        element={<Navigate to="/admin/dashboard" replace />}
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminAuditLogsPage />
          </ProtectedRoute>
        }
      />

      {/* Trang 404 Không Tìm Thấy cho mọi đường dẫn không tồn tại */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
