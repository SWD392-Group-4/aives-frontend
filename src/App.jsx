import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { ROLES } from './constants/roles.js'
import AdminUsersPage from './pages/AdminUsersPage.jsx'
import ExamRoomPage from './pages/ExamRoomPage.jsx'
import ExamSessionsPage from './pages/ExamSessionsPage.jsx'
import HomePage from './pages/HomePage.jsx'
import JoinExamPage from './pages/JoinExamPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'

function App() {
  return (
    <Routes>
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

      {/* Chỉ ADMIN */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />

      {/* LECTURER và ADMIN: quản lý phiên thi */}
      <Route
        path="/exam-sessions"
        element={
          <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
            <ExamSessionsPage />
          </ProtectedRoute>
        }
      />

      {/* Chỉ STUDENT: nhập mã vào thi và phòng thi */}
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

      {/* Đường dẫn không tồn tại thì quay về trang chủ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
