import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './constants/roles'
import AdminSettingsPage from './pages/AdminSettingsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AppealsManagementPage from './pages/AppealsManagementPage'
import ExamRoomPage from './pages/ExamRoomPage'
import ExamSessionsPage from './pages/ExamSessionsPage'
import HomePage from './pages/HomePage'
import JoinExamPage from './pages/JoinExamPage'
import LecturerReviewPage from './pages/LecturerReviewPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import QuestionBankPage from './pages/QuestionBankPage'
import RegisterPage from './pages/RegisterPage'
import RubricManagementPage from './pages/RubricManagementPage'
import StudentResultsPage from './pages/StudentResultsPage'

function App() {
  return (
    <Routes>
      {/* Công khai */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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

      {/* Dành cho GIẢNG VIÊN (LECTURER) và QUẢN TRỊ VIÊN (ADMIN) */}
      <Route
        path="/exam-sessions"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <ExamSessionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/questions"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <QuestionBankPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lecturer/rubrics"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <RubricManagementPage />
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

      {/* Đường dẫn không tồn tại thì quay về trang chủ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
