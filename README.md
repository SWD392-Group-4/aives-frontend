# aives-frontend

Frontend của **AIVES – AI-powered Viva Exam System** (Vite + React).

## Chạy local
```bash
npm install
npm run dev
```
Mặc định chạy ở http://localhost:5173. Backend: http://localhost:8080 (repo `aives-backend`).

## Cấu trúc
```
src/
├── styles/colors.css       # Bảng màu dùng chung - chỉ sửa màu ở đây
├── styles/typography.css   # Font và cỡ chữ dùng chung
├── components/             # Icon, Logo, Mascot, TextField, Navbar, Footer
├── pages/                  # HomePage (/), LoginPage (/login), RegisterPage (/register)
├── App.jsx                 # Khai báo route
└── main.jsx
```

## Quy ước màu
Không viết mã hex trong component. Dùng class Tailwind sinh từ `src/styles/colors.css`,
ví dụ `bg-primary`, `text-on-surface-variant`, `bg-primary/10`.
